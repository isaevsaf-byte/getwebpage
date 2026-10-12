import { type NextRequest, NextResponse, after } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { clientIp, consume, refund, todayStamp } from "@/lib/rate-limit";
import { record } from "@/lib/stats";
import {
  FALLBACK_COPY,
  OUTPUT_SCHEMA,
  SYSTEM_PROMPT,
  isAiSector,
  parseModelJson,
  userPrompt,
  validateCopy,
  validateName,
} from "./copy-rules";

/**
 * POST /api/ai-copy {name, sector}
 *
 * The visitor explicitly asked Claude to write their homepage words. Streams
 * NDJSON lines back so the tagline can type in live:
 *   {"type":"delta","text":"…"}        raw JSON text from Claude, in order
 *   {"type":"done","copy":{…},"fallback":false}
 *   {"type":"done","copy":{…},"fallback":true}   Claude's draft failed our checks
 *   {"type":"error","error":"ai_failed"}          the stream broke mid-way
 * Errors before streaming are plain JSON with a status code.
 *
 * Privacy: the business name lives only in this request. It is never logged,
 * cached or stored; only an anonymous daily count is recorded.
 */

export const maxDuration = 30;

const MODEL = "claude-haiku-5-5";
/** Per-IP daily cap. */
const PER_IP_DAILY = 8;
/** Ceiling across every caller, so rotating IPs can't run up the bill. */
const GLOBAL_DAILY = (() => {
  const n = Number(process.env.AI_COPY_GLOBAL_DAILY_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 400;
})();
const MAX_BODY = 2000;

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 20_000 });
  return client;
}

function fail(error: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Only our own pages may spend our Anthropic budget. */
function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches may omit it; rate limits still apply
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function errorStatus(err: unknown): string {
  return err instanceof Anthropic.APIError ? `${err.status ?? "?"} ${err.name}` : (err as Error)?.name ?? "unknown";
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail("forbidden", 403);

  const text = await req.text().catch(() => "");
  if (!text || text.length > MAX_BODY) return fail("bad_request", 400);
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return fail("bad_request", 400);
    body = parsed as Record<string, unknown>;
  } catch {
    return fail("bad_request", 400);
  }

  const checked = validateName(body.name);
  if (!checked.ok) return fail(checked.error, 400);
  if (!isAiSector(body.sector)) return fail("bad_sector", 400);
  const name = checked.name;
  const sector = body.sector;

  if (!process.env.ANTHROPIC_API_KEY) return fail("unavailable", 503);

  // Count before the expensive work, so a downstream failure is not a free retry.
  const ipKey = `rl:aicopy:${clientIp(req)}`;
  const globalKey = `rl:aicopy:global:${todayStamp()}`;

  const perIp = await consume(ipKey, PER_IP_DAILY);
  if (!perIp.ok) return fail("limited", 429, { scope: "ip", limit: PER_IP_DAILY });

  const global = await consume(globalKey, GLOBAL_DAILY);
  if (!global.ok) {
    await refund(ipKey);
    return fail("limited", 429, { scope: "global" });
  }
  const refundBoth = () => Promise.all([refund(ipKey), refund(globalKey)]);

  const stream = anthropic().messages.stream({
    model: MODEL,
    max_tokens: 400,
    // A six-string copy job: no thinking pause before the tagline starts typing.
    thinking: { type: "disabled" },
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: OUTPUT_SCHEMA },
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt(name, sector) }],
  });
  const events = stream[Symbol.asyncIterator]();

  // Wait for the first event so connection, auth and overload errors still
  // get a real status code instead of a 200 that breaks mid-way.
  let first: IteratorResult<Anthropic.MessageStreamEvent>;
  try {
    first = await events.next();
  } catch (err) {
    console.error("ai-copy: Claude request failed:", errorStatus(err));
    await refundBoth();
    return fail("ai_failed", 502);
  }

  let outcome: "ok" | "fallback" | "failed" = "failed";
  // Runs once the response has finished streaming. A count only — no name.
  after(async () => {
    if (outcome !== "failed") await record("ai_copy");
  });

  const encoder = new TextEncoder();
  let cancelled = false;

  const body$ = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (line: Record<string, unknown>) => {
        if (!cancelled) controller.enqueue(encoder.encode(JSON.stringify(line) + "\n"));
      };
      let raw = "";
      const handle = (ev: Anthropic.MessageStreamEvent) => {
        if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
          raw += ev.delta.text;
          send({ type: "delta", text: ev.delta.text });
        }
      };

      try {
        if (!first.done) handle(first.value);
        for (let r = await events.next(); !r.done; r = await events.next()) handle(r.value);
        const message = await stream.finalMessage();
        const copy = message.stop_reason === "end_turn" ? validateCopy(parseModelJson(raw)) : null;
        if (copy) {
          outcome = "ok";
          send({ type: "done", copy, fallback: false });
        } else {
          outcome = "fallback";
          send({ type: "done", copy: FALLBACK_COPY[sector], fallback: true });
        }
      } catch (err) {
        // Refund only our failures. A visitor who walks away mid-stream still
        // spent the call, or start-and-abort loops would never hit the limit.
        if (!cancelled) {
          console.error("ai-copy: stream failed:", errorStatus(err));
          send({ type: "error", error: "ai_failed" });
          await refundBoth();
        }
      } finally {
        try {
          controller.close();
        } catch {
          // already closed by cancel()
        }
      }
    },
    cancel() {
      cancelled = true;
      stream.abort();
    },
  });

  return new Response(body$, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
