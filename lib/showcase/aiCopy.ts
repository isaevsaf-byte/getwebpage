"use client";

/**
 * Shared store for the live AI copywriter: the visitor asks, Claude writes
 * the tagline, buttons and cards for their sketch. Every section that draws
 * the visitor's sketch (Hero, SevenDays, Pricing thumbnail, Ownership) reads
 * the same state, so the copy follows them down the page.
 *
 * Flow: requestAiCopy(name, sector) → POST /api/ai-copy, which streams NDJSON.
 * status 'writing' → `streamed` grows as Claude writes the tagline (parsed
 * out of the partial JSON and paced like typing) → 'done' with copy the server
 * has validated. 'limited' and 'error' carry a visitor-facing `message`.
 *
 * Privacy: this is the only place the business name leaves the browser, and
 * only on the visitor's explicit click. The server never stores it. Results
 * are remembered in memory for this page view only (no storage), so flipping
 * back to a sector already written doesn't spend another call.
 */
import { useSyncExternalStore } from "react";
import type { Sector } from "./visitor";
import type { SketchCopy } from "./sketch";

export type AiCopyStatus = "idle" | "writing" | "done" | "error" | "limited";

export interface AiCopyState {
  status: AiCopyStatus;
  /** Final, validated copy once status is 'done'. */
  copy: SketchCopy | null;
  /** Partial tagline while streaming — sections may type it live. */
  streamed: string;
  /** Who the copy was written for; stale if the visitor changes name/sector. */
  forName: string;
  forSector: Sector | null;
  /** Visitor-facing message for 'error' / 'limited'. */
  message?: string;
}

/**
 * One plain line for the UI next to the ✦ button, so the visitor knows what
 * the click sends before they make it. Matches the privacy policy.
 */
export const AI_COPY_DISCLOSURE =
  "Sends your business name and type to Anthropic’s Claude to write it. We don’t store them.";

const INITIAL: AiCopyState = {
  status: "idle",
  copy: null,
  streamed: "",
  forName: "",
  forSector: null,
};

const ENDPOINT = "/api/ai-copy";
/** Give up on a request that hasn't finished in this long. */
const TIMEOUT_MS = 25_000;
/** Typing pace for the streamed tagline, characters per second. */
const TYPE_CPS = 80;
/** `streamed` never exceeds the server's hard limit for the tagline. */
const STREAMED_MAX = 70;
const MEMO_MAX = 12;

const MESSAGES = {
  shortName: "Type your business name first — at least two letters.",
  urlName: "That looks like a web address. Type your business name instead.",
  limitedIp: "That’s today’s AI drafts used up. Your sketch keeps its standard words.",
  limitedGlobal: "Our AI copywriter has written all it can for today. Try again tomorrow.",
  offline: "The AI copywriter is offline right now. Your sketch still works.",
  failed: "Claude couldn’t finish that one. Try again in a moment.",
  fallback: "Claude’s draft didn’t pass our checks, so your sketch keeps its standard words. Try again?",
  timeout: "That took too long, so we stopped it. Try again?",
} as const;

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

let state: AiCopyState = INITIAL;
const listeners = new Set<() => void>();

function emit(next: AiCopyState) {
  state = next;
  listeners.forEach((l) => l());
}

export function getAiCopy(): AiCopyState {
  return state;
}

export function subscribeAiCopy(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useAiCopy(): AiCopyState {
  return useSyncExternalStore(subscribeAiCopy, getAiCopy, () => INITIAL);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const memo = new Map<string, SketchCopy>();
const memoKey = (name: string, sector: Sector) => `${sector}\u0000${name.trim().toLowerCase()}`;

function remember(key: string, copy: SketchCopy) {
  memo.delete(key);
  memo.set(key, copy);
  if (memo.size > MEMO_MAX) memo.delete(memo.keys().next().value as string);
}

const SUB_KEY_RE = /"sub"\s*:\s*"/;
const ESCAPES: Record<string, string> = { n: " ", t: " ", r: " ", b: "", f: "", "/": "/", '"': '"', "\\": "\\" };

/**
 * Reads the value of "sub" out of JSON that may still be arriving. Returns
 * what has been written so far (complete or not), or null before the key.
 * A half-received escape at the end is held back until the rest arrives.
 */
export function partialSub(json: string): string | null {
  const m = SUB_KEY_RE.exec(json);
  if (!m) return null;
  let out = "";
  let i = m.index + m[0].length;
  while (i < json.length) {
    const c = json[i];
    if (c === '"') return out;
    if (c === "\\") {
      const n = json[i + 1];
      if (n === undefined) break;
      if (n === "u") {
        const hex = json.slice(i + 2, i + 6);
        if (hex.length < 4) break;
        const code = parseInt(hex, 16);
        if (!Number.isNaN(code)) out += String.fromCharCode(code);
        i += 6;
        continue;
      }
      out += ESCAPES[n] ?? n;
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

// Control/format characters and markup never reach a sketch, even mid-stream.
const SCRUB_RE = new RegExp("[\\p{Cc}\\p{Cf}<>{}\\[\\]`\\\\]", "gu");

function scrub(s: string): string {
  return Array.from(s.replace(SCRUB_RE, "").replace(/\s{2,}/g, " ").replace(/^\s+/, ""))
    .slice(0, STREAMED_MAX)
    .join("");
}

function reducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function isCopy(v: unknown): v is Required<SketchCopy> {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.sub === "string" &&
    typeof o.cta === "string" &&
    typeof o.cta2 === "string" &&
    Array.isArray(o.cards) &&
    o.cards.length === 3 &&
    o.cards.every(
      (c) => !!c && typeof (c as { title?: unknown }).title === "string" && typeof (c as { body?: unknown }).body === "string",
    )
  );
}

/* ------------------------------------------------------------------ */
/* One request                                                         */
/* ------------------------------------------------------------------ */

/**
 * A single visitor click. Owns its abort controller and its typing pacer, so
 * a superseded run can never write into the store again.
 */
class Run {
  readonly ac = new AbortController();
  private live = true;
  private target: string[] = [];
  private shown = 0;
  private last = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pendingDone: AiCopyState | null = null;
  private readonly instant = reducedMotion();
  timedOut = false;

  constructor(
    readonly name: string,
    readonly sector: Sector,
  ) {}

  get active() {
    return this.live && current === this;
  }

  stop() {
    this.live = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.ac.abort();
  }

  /** Writes into the store only while this run is still the current one. */
  put(next: Partial<AiCopyState>) {
    if (!this.active) return;
    emit({ ...state, forName: this.name, forSector: this.sector, ...next });
  }

  /** New tagline text from the stream; the pacer catches up to it. */
  setTarget(text: string) {
    const next = Array.from(scrub(text));
    // Keep what's already shown if the new text still starts with it.
    let same = 0;
    while (same < this.shown && same < next.length && next[same] === this.target[same]) same += 1;
    this.shown = Math.min(this.shown, same);
    this.target = next;
    this.kick();
  }

  /** Final state, emitted once the typed tagline has caught up. */
  finish(done: AiCopyState) {
    this.pendingDone = done;
    if (typeof done.copy?.sub === "string") this.setTarget(done.copy.sub);
    else this.kick();
  }

  /** One pacer loop per run: a tick already scheduled will pick up the new target. */
  private kick() {
    if (this.timer === null) this.tick();
  }

  /** Fractional characters owed by elapsed time; whole ones get typed. */
  private budget = 0;

  private tick = () => {
    this.timer = null;
    if (!this.active) return;
    const now = Date.now();
    const total = this.target.length;
    if (this.shown < total) {
      if (this.instant) this.shown = total;
      else {
        // Elapsed time, not tick count, sets the pace — so throttled timers
        // in a background tab catch up instead of falling behind.
        this.budget += ((this.last ? now - this.last : 1000 / 60) / 1000) * TYPE_CPS;
        const step = Math.floor(this.budget);
        if (step > 0) {
          this.shown = Math.min(total, this.shown + step);
          this.budget -= step;
        }
      }
      this.last = now;
      const streamed = this.target.slice(0, this.shown).join("");
      if (streamed !== state.streamed) this.put({ streamed });
    }
    if (this.shown < total) {
      this.timer = setTimeout(this.tick, 1000 / 60);
      return;
    }
    this.last = 0;
    this.budget = 0;
    if (this.pendingDone) {
      const done = this.pendingDone;
      this.pendingDone = null;
      this.put(done);
      if (current === this) current = null;
    }
  };

  fail(status: "error" | "limited", message: string) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pendingDone = null;
    this.put({ status, copy: null, streamed: "", message });
    if (current === this) current = null;
  }
}

let current: Run | null = null;

async function readStream(run: Run, body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  let raw = "";
  let settled = false;

  const onLine = (line: string) => {
    if (!line.trim()) return;
    let ev: { type?: string; text?: unknown; copy?: unknown; fallback?: unknown };
    try {
      ev = JSON.parse(line);
    } catch {
      return;
    }
    if (ev.type === "delta" && typeof ev.text === "string") {
      raw += ev.text;
      const sub = partialSub(raw);
      if (sub !== null) run.setTarget(sub);
    } else if (ev.type === "done") {
      settled = true;
      if (ev.fallback !== false || !isCopy(ev.copy)) {
        // Not Claude's words — never present the stand-in as AI-written.
        run.fail("error", MESSAGES.fallback);
        return;
      }
      const copy = ev.copy;
      remember(memoKey(run.name, run.sector), copy);
      run.finish({ status: "done", copy, streamed: copy.sub, forName: run.name, forSector: run.sector });
    } else if (ev.type === "error") {
      settled = true;
      run.fail("error", MESSAGES.failed);
    }
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (!run.active) {
      reader.cancel().catch(() => {});
      return;
    }
    if (value) {
      buffered += decoder.decode(value, { stream: true });
      let nl = buffered.indexOf("\n");
      while (nl >= 0) {
        onLine(buffered.slice(0, nl));
        buffered = buffered.slice(nl + 1);
        nl = buffered.indexOf("\n");
      }
    }
    if (done) break;
  }
  buffered += decoder.decode();
  onLine(buffered);
  if (!settled) run.fail("error", MESSAGES.failed);
}

/** Ask Claude to write copy for this business. Explicit visitor action only. */
export async function requestAiCopy(name: string, sector: Sector): Promise<void> {
  current?.stop();
  const run = new Run(name, sector);
  current = run;

  const remembered = memo.get(memoKey(name, sector));
  if (remembered) {
    run.put({ status: "done", copy: remembered, streamed: remembered.sub ?? "", message: undefined });
    current = null;
    return;
  }

  if (Array.from(name.trim()).length < 2) {
    run.fail("error", MESSAGES.shortName);
    return;
  }

  run.put({ status: "writing", copy: null, streamed: "", message: undefined });
  const timer = setTimeout(() => {
    run.timedOut = true;
    run.ac.abort();
  }, TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sector }),
      signal: run.ac.signal,
      cache: "no-store",
    });
    if (!run.active) return;

    if (!res.ok || !res.body) {
      const data = (await res.json().catch(() => null)) as { error?: string; scope?: string } | null;
      if (!run.active) return;
      if (res.status === 429 || data?.error === "limited") {
        run.fail("limited", data?.scope === "global" ? MESSAGES.limitedGlobal : MESSAGES.limitedIp);
      } else if (data?.error === "url_name") {
        run.fail("error", MESSAGES.urlName);
      } else if (data?.error === "bad_name") {
        run.fail("error", MESSAGES.shortName);
      } else if (res.status === 503 || data?.error === "unavailable") {
        run.fail("error", MESSAGES.offline);
      } else {
        run.fail("error", MESSAGES.failed);
      }
      return;
    }

    await readStream(run, res.body);
  } catch {
    if (run.timedOut) run.fail("error", MESSAGES.timeout);
    else if (run.active) run.fail("error", MESSAGES.failed);
    // Otherwise it was superseded or reset — stay silent.
  } finally {
    clearTimeout(timer);
  }
}

export function resetAiCopy(): void {
  current?.stop();
  current = null;
  emit(INITIAL);
}
