import { NextRequest, NextResponse, after } from "next/server";
import { kv } from "@vercel/kv";
import { Resend } from "resend";
import { validateUrl, getCacheKey } from "@/lib/url";
import { AuditReport, Lang } from "@/lib/audit-prompts";
import { clientIp, consume } from "@/lib/rate-limit";
import { record } from "@/lib/stats";
import { telegram } from "@/lib/notify";

const resend = new Resend(process.env.RESEND_API_KEY);

const UNLOCK_LIMIT = 30;
const LANGS: Lang[] = ["en", "ru"];

function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email, url: rawUrl, company } = body as {
    email?: string;
    url?: string;
    company?: string;
  };
  const lang: Lang = LANGS.includes(body?.lang) ? body.lang : "en";

  // Honeypot — a real person never fills a field they cannot see.
  if (company) {
    return NextResponse.json({ error: "bad_email" }, { status: 400 });
  }

  if (!email || typeof email !== "string" || !isValidEmail(email)) {
    return NextResponse.json({ error: "bad_email" }, { status: 400 });
  }

  if (!rawUrl || typeof rawUrl !== "string" || rawUrl.length > 2048) {
    return NextResponse.json({ error: "bad_url" }, { status: 400 });
  }

  const safeUrl = validateUrl(rawUrl);
  if (!safeUrl) {
    return NextResponse.json({ error: "bad_url" }, { status: 400 });
  }

  const limit = await consume(`rl:unlock:${clientIp(req)}`, UNLOCK_LIMIT);
  if (!limit.ok) {
    return NextResponse.json({ error: "limit" }, { status: 429 });
  }

  const cacheKey = getCacheKey(safeUrl, lang);
  const report = await kv.get<AuditReport>(cacheKey).catch(() => null);

  if (!report) {
    return NextResponse.json({ error: "cache_expired" }, { status: 404 });
  }

  // Save lead and notify — neither is allowed to block the unlock.
  const leadPromise = kv.lpush("leads:all", {
    email,
    url: safeUrl,
    ts: Date.now(),
  });

  const emailPromise = resend.emails.send({
    from: "GetWebPage Audit <hello@safarisaev.ai>",
    to: "saf@safarisaev.ai",
    replyTo: email,
    subject: `New audit lead — ${email}`,
    text: `Email: ${email}\nSite audited: ${safeUrl}\nTimestamp: ${new Date().toISOString()}`,
  });

  await Promise.allSettled([leadPromise, emailPromise]);

  after(async () => {
    await record("audit_lead");
    await telegram(
      `🧲 New audit lead\n${email}\nSite: ${safeUrl}\n` +
        `${report.critical.length} critical · ${report.important.length} important issues — ` +
        `a warm reason to get in touch today.`
    );
  });

  return NextResponse.json({
    critical: report.critical,
    important: report.important,
    good: report.good,
    locked: false,
  });
}
