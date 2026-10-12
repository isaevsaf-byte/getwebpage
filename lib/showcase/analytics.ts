/**
 * Consent-gated event tracking for the showcase.
 *
 * gtag only exists after the visitor presses Accept (ConsentBanner injects it),
 * so before consent every call here is a no-op — nothing is queued, nothing is
 * sent. Events never carry the typed business name or a URL: the only
 * parameter allowed is the slug of one of our own portfolio sites.
 */

import { SITE_SLUGS } from "./content";

export type TrackEvent =
  | "sketch_typed"
  | "sector_changed"
  | "sketch_committed"
  | "audit_handoff"
  | "pricing_from_hero"
  | "pricing_from_sketch"
  | "skip_week"
  | "site_opened";

type Gtag = (command: "event", name: string, params?: Record<string, string>) => void;

const ONCE_PER_SESSION: ReadonlySet<TrackEvent> = new Set<TrackEvent>(["sketch_typed"]);
const sentThisPage = new Set<TrackEvent>();
const onceKey = (event: TrackEvent) => `gwp:tracked:${event}`;

function alreadySent(event: TrackEvent): boolean {
  if (sentThisPage.has(event)) return true;
  try {
    return sessionStorage.getItem(onceKey(event)) === "1";
  } catch {
    return false;
  }
}

function markSent(event: TrackEvent) {
  sentThisPage.add(event);
  try {
    sessionStorage.setItem(onceKey(event), "1");
  } catch {
    // The in-memory set still prevents repeats on this page view.
  }
}

export function track(event: TrackEvent, params?: { slug?: string }): void {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag !== "function") return; // no consent → no-op

  const once = ONCE_PER_SESSION.has(event);
  if (once && alreadySent(event)) return;

  // Only our own portfolio slugs pass through — never anything the visitor typed.
  const slug = params?.slug;
  const safe = slug && (SITE_SLUGS as readonly string[]).includes(slug) ? { slug } : undefined;

  try {
    gtag("event", event, safe);
    if (once) markSent(event);
  } catch {
    // Analytics must never break the page.
  }
}
