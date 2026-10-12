import { NextRequest, NextResponse, after } from "next/server";
import * as cheerio from "cheerio";
import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";
import { validateUrl, getCacheKey, fetchPageSafely } from "@/lib/url";
import { clientIp, consume, refund, todayStamp } from "@/lib/rate-limit";
import { record } from "@/lib/stats";
import { telegram } from "@/lib/notify";
import {
  getSystemPrompt,
  getUserPrompt,
  AuditReport,
  AuditItem,
  PageData,
  Lang,
} from "@/lib/audit-prompts";

// Allow up to 30s — fetch + Claude can take 15–20s
export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** Per-IP daily cap. Returned to the client so the UI can never quote a stale number. */
export const RATE_LIMIT = 20;
/** Ceiling across every caller. Without this, rotating IPs means unmetered API spend. */
const GLOBAL_DAILY_LIMIT = Number(process.env.AUDIT_GLOBAL_DAILY_LIMIT ?? 500);
const CACHE_TTL = 86400; // 24h

const LANGS: Lang[] = ["en", "ru"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { url: rawUrl } = body as { url?: string };
  const lang: Lang = LANGS.includes(body?.lang) ? body.lang : "en";

  if (!rawUrl || typeof rawUrl !== "string" || rawUrl.length > 2048) {
    return NextResponse.json({ error: "bad_url" }, { status: 400 });
  }

  const safeUrl = validateUrl(rawUrl);
  if (!safeUrl) {
    return NextResponse.json({ error: "bad_url" }, { status: 400 });
  }

  const cacheKey = getCacheKey(safeUrl, lang);

  // Cached reports are free to serve and cost no API call.
  const cached = await kv.get<AuditReport>(cacheKey).catch(() => null);
  if (cached) {
    after(() => record("audit_run"));
    return NextResponse.json({
      good: cached.good,
      criticalCount: cached.critical.length,
      importantCount: cached.important.length,
      locked: true,
      cached: true,
      limit: RATE_LIMIT,
    });
  }

  // Count before the expensive work, so a downstream failure is not a free retry.
  const ipKey = `rl:${clientIp(req)}`;
  const globalKey = `rl:global:${todayStamp()}`;

  const perIp = await consume(ipKey, RATE_LIMIT);
  if (!perIp.ok) {
    return NextResponse.json(
      { error: "limit", limit: RATE_LIMIT },
      { status: 429 }
    );
  }

  const global = await consume(globalKey, GLOBAL_DAILY_LIMIT);
  if (!global.ok) {
    await refund(ipKey);
    return NextResponse.json(
      { error: "busy", limit: RATE_LIMIT },
      { status: 503 }
    );
  }

  // Fetch the target page — redirects re-validated per hop, body size capped.
  let html: string;
  try {
    html = await fetchPageSafely(safeUrl);
  } catch {
    await Promise.all([refund(ipKey), refund(globalKey)]);
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }

  // Parse HTML with cheerio
  const $ = cheerio.load(html);
  const pageData: PageData = {
    url: safeUrl,
    title: $("title").first().text().trim(),
    metaDescription:
      $('meta[name="description"]').attr("content")?.trim() ?? "",
    h1: $("h1").first().text().trim(),
    h2s: $("h2")
      .map((_, el) => $(el).text().trim())
      .get()
      .slice(0, 5),
    canonical: $('link[rel="canonical"]').attr("href")?.trim() ?? "",
    viewport: $('meta[name="viewport"]').attr("content")?.trim() ?? "",
    ogTitle: $('meta[property="og:title"]').attr("content")?.trim() ?? "",
    imagesWithoutAlt: $("img").filter((_, el) => !$(el).attr("alt")).length,
    formCount: $("form").length,
    bodyText: $("body").text().replace(/\s+/g, " ").trim().slice(0, 4000),
  };

  // Call Claude
  let report: AuditReport;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: getSystemPrompt(lang),
      messages: [{ role: "user", content: getUserPrompt(lang, pageData) }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const match = text.match(/\{[\s\S]*\}/);
    const raw = JSON.parse(match ? match[0] : text);
    // Normalise: Claude sometimes returns strings instead of {title,detail} objects
    const normalise = (arr: unknown[]): AuditItem[] =>
      arr.map((item) =>
        typeof item === "string"
          ? { title: item, detail: "" }
          : (item as AuditItem)
      );
    report = {
      critical: normalise(raw.critical ?? []),
      important: normalise(raw.important ?? []),
      good: normalise(raw.good ?? []),
    };
  } catch (err) {
    console.error("Claude error:", err);
    return NextResponse.json({ error: "ai_failed" }, { status: 500 });
  }

  await kv.set(cacheKey, report, { ex: CACHE_TTL }).catch(() => null);

  after(async () => {
    await record("audit_run");
    await telegram(
      `🔎 Someone audited a site\n${safeUrl}\n` +
        `${report.critical.length} critical · ${report.important.length} important · lang ${lang}\n` +
        `They haven't left an email yet.`
    );
  });

  return NextResponse.json({
    good: report.good,
    criticalCount: report.critical.length,
    importantCount: report.important.length,
    locked: true,
    lang,
    limit: RATE_LIMIT,
  });
}
