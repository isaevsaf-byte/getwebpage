import { NextRequest, NextResponse } from "next/server";
import { dailyCounts, EVENTS, type EventName } from "@/lib/stats";
import { telegram, telegramConfigured } from "@/lib/notify";

/**
 * Morning summary, called by Vercel Cron (see vercel.json). Sends even on a
 * quiet day — silence would be indistinguishable from the alerts being broken.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!telegramConfigured()) {
    return NextResponse.json({ sent: false, reason: "telegram not configured" });
  }

  const days = await dailyCounts(8); // 7 full days + today
  const yesterday = days[days.length - 2];
  const week = days.slice(0, -1);

  const names = Object.keys(EVENTS) as EventName[];
  const weekTotal = (n: EventName) => week.reduce((sum, d) => sum + d.counts[n], 0);

  const lines = names.map((n) => {
    const y = yesterday.counts[n];
    const w = weekTotal(n);
    return `${y > 0 ? "•" : "·"} ${EVENTS[n]}: ${y}  (7d: ${w})`;
  });

  const anything = names.some((n) => yesterday.counts[n] > 0);
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://getwebpage.co.uk";

  const text =
    `☀️ GetWebPage — ${yesterday.day}\n` +
    (anything ? "" : "Quiet day. Alerts are working — nothing slipped past.\n") +
    `\n${lines.join("\n")}\n\n` +
    `Visitors: vercel.com → getwebpage → Analytics\n` +
    `Dashboard: ${base}/admin`;

  const sent = await telegram(text);
  return NextResponse.json({ sent });
}
