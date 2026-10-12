import { kv } from "@vercel/kv";

/**
 * Business events the owner cares about. Visitor counts come from Vercel
 * Analytics; these are the moments where someone did something.
 */
export const EVENTS = {
  audit_run: "Audit run",
  audit_lead: "Audit lead (email given)",
  enquiry: "Enquiry",
  checkout_started: "Checkout started",
  order_paid: "Deposit paid",
  checkout_abandoned: "Checkout abandoned",
} as const;

export type EventName = keyof typeof EVENTS;

const LIST_CAP = 500;
const COUNTER_TTL = 60 * 60 * 24 * 400; // keep ~13 months of daily counters

/** UTC calendar day, e.g. 2026-10-12. */
export function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Counts one occurrence of an event against today. Never throws. */
export async function record(event: EventName): Promise<void> {
  const key = `stats:${dayKey()}:${event}`;
  try {
    const n = await kv.incr(key);
    if (n === 1) await kv.expire(key, COUNTER_TTL);
  } catch (err) {
    console.error("stats.record failed:", event, err);
  }
}

/** Appends a record to a capped list (newest first). Never throws. */
export async function remember(list: string, entry: Record<string, unknown>): Promise<void> {
  try {
    await kv.lpush(list, { ...entry, ts: Date.now() });
    await kv.ltrim(list, 0, LIST_CAP - 1);
  } catch (err) {
    console.error("stats.remember failed:", list, err);
  }
}

/** Per-day counts for every event over the last `days` days, oldest first. */
export async function dailyCounts(days: number): Promise<
  { day: string; counts: Record<EventName, number> }[]
> {
  const names = Object.keys(EVENTS) as EventName[];
  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (days - 1 - i));
    return dayKey(d);
  });

  const keys = dates.flatMap((d) => names.map((n) => `stats:${d}:${n}`));
  let values: (number | null)[] = [];
  try {
    values = keys.length ? await kv.mget<(number | null)[]>(...keys) : [];
  } catch (err) {
    console.error("stats.dailyCounts failed:", err);
    values = keys.map(() => 0);
  }

  return dates.map((day, di) => {
    const counts = {} as Record<EventName, number>;
    names.forEach((n, ni) => {
      counts[n] = Number(values[di * names.length + ni] ?? 0);
    });
    return { day, counts };
  });
}

export async function recent<T>(list: string, n = 20): Promise<T[]> {
  try {
    return (await kv.lrange<T>(list, 0, n - 1)) ?? [];
  } catch {
    return [];
  }
}
