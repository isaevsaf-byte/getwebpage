/**
 * Hands a URL typed on the home page over to /audit, which runs it once.
 *
 * 🚨 Credit-burn guard: this is the ONLY path that auto-starts an audit.
 * The URL is written to sessionStorage by an on-site submit, read once by
 * AuditTool, deleted on read and ignored after 120 seconds. It never goes
 * into a query string, so link previews, prefetchers and crawlers can't
 * trigger an audit (and the URL never reaches analytics page_view data).
 * The real /api/audit call — with its rate limits and SSRF guards — happens
 * in AuditTool exactly as before.
 *
 * Client-only: call from event handlers and effects.
 */

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { navForward } from "@/components/motion/PageTransition";

const KEY = "gwp:audit-url";
const MAX_AGE_MS = 120_000;
const MAX_URL_LENGTH = 2048;

/**
 * Fallback for blocked storage (private mode, strict settings). Client-side
 * navigation keeps this module alive, so the value survives the trip to /audit.
 */
let pending: { url: string; ts: number } | null = null;

/** Adds https:// when there is no scheme. Returns null for anything that isn't http(s). */
function normalise(rawUrl: string): string | null {
  const s = String(rawUrl ?? "").trim();
  if (!s || /\s/.test(s) || s.length > MAX_URL_LENGTH) return null;
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!u.hostname.includes(".")) return null;
    // Keep the address as typed (plus scheme) — /api/audit does its own
    // normalising and validation, and the field should show what they typed.
    return withScheme;
  } catch {
    return null;
  }
}

function fresh(entry: unknown): string | null {
  if (!entry || typeof entry !== "object") return null;
  const { url, ts } = entry as { url?: unknown; ts?: unknown };
  if (typeof url !== "string" || typeof ts !== "number") return null;
  const age = Date.now() - ts;
  if (age < 0 || age > MAX_AGE_MS) return null;
  return normalise(url);
}

export function startAuditHandoff(rawUrl: string, router: AppRouterInstance): void {
  const url = normalise(rawUrl);
  if (!url) return;
  const entry = { url, ts: Date.now() };
  pending = entry;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(entry));
  } catch {
    // Storage blocked — the in-memory copy still covers a client navigation.
  }
  navForward(router, "/audit");
}

/**
 * Returns the handed-over URL once, then forgets it. Null if there is none,
 * it is older than 120s, or it is malformed.
 */
export function consumeAuditHandoff(): string | null {
  if (typeof window === "undefined") return null;
  let stored: unknown = null;
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (raw) stored = JSON.parse(raw);
  } catch {
    stored = null;
  }
  const memory = pending;
  pending = null;
  return fresh(stored) ?? fresh(memory);
}
