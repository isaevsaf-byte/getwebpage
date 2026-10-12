import { NextRequest } from "next/server";
import { kv } from "@vercel/kv";

const DAY = 86400;

/** Best-effort client identity. Falls back to a shared bucket when absent. */
export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export interface LimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
}

/**
 * Counts this request against a rolling daily bucket and reports whether it is
 * allowed. Counting happens up front, so a failure downstream cannot hand the
 * caller a free retry.
 */
export async function consume(
  key: string,
  limit: number,
  windowSeconds = DAY
): Promise<LimitResult> {
  try {
    const used = await kv.incr(key);
    if (used === 1) await kv.expire(key, windowSeconds);
    return { ok: used <= limit, limit, remaining: Math.max(0, limit - used) };
  } catch {
    // KV unavailable — fail open rather than taking the whole route down.
    return { ok: true, limit, remaining: limit };
  }
}

/** Refunds one unit, for when the work never happened (e.g. a cache hit). */
export async function refund(key: string): Promise<void> {
  try {
    await kv.decr(key);
  } catch {
    // Nothing to do — the counter simply expires on its own.
  }
}

/** UTC day stamp, so global counters roll over predictably. */
export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
