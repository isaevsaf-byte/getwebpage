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
  /** True when KV could not be reached and the caller asked to fail closed. */
  unavailable?: boolean;
}

/**
 * Counts this request against a rolling daily bucket and reports whether it is
 * allowed. Counting happens up front, so a failure downstream cannot hand the
 * caller a free retry.
 *
 * KV unavailable: fails open by default (contact, checkout must keep working).
 * Pass `failClosed` for routes that spend money and are not essential, so an
 * outage or a half-configured Preview cannot lift their ceiling.
 */
export async function consume(
  key: string,
  limit: number,
  windowSeconds = DAY,
  { failClosed = false }: { failClosed?: boolean } = {}
): Promise<LimitResult> {
  try {
    const used = await kv.incr(key);
    if (used === 1) await kv.expire(key, windowSeconds);
    return { ok: used <= limit, limit, remaining: Math.max(0, limit - used) };
  } catch (err) {
    // Never silent: a dead KV store also means leads and stats are not being saved.
    console.error("rate-limit: KV unavailable —", (err as Error)?.message ?? String(err));
    if (failClosed) return { ok: false, limit, remaining: 0, unavailable: true };
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
