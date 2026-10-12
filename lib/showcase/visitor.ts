/**
 * The visitor's business name and sector, shared by the hero, the sketch,
 * SevenDays, Pricing and FinalCall.
 *
 * Privacy: the name NEVER leaves the device. There is no fetch here, it is
 * never passed to analytics and never written into a URL. It lives in memory
 * and in sessionStorage (this tab only), and both are wrapped in try/catch so
 * private mode and blocked storage just mean "not remembered".
 *
 * Import from client components only (useVisitor uses useSyncExternalStore).
 */

import { useSyncExternalStore } from "react";

export type Sector = "salon" | "cafe" | "studio" | "trades";

export interface VisitorState {
  /** Exactly what was typed (capped in length). AuditBand reads it for a URL prefill. */
  raw: string;
  /** Sanitised: no emoji, control or format characters; single spaces; ≤40 graphemes. */
  name: string;
  /** At least 2 graphemes after sanitising. */
  hasName: boolean;
  /** `name` when hasName, otherwise "your business". */
  display: string;
  sector: Sector;
  /** ASCII a–z0–9, ≤24 chars, or "yourbusiness". */
  slug: string;
  /** `${slug}.co.uk` */
  domain: string;
  /** Set by commitVisitor(); cleared when the name is emptied. */
  committed: boolean;
  /** Grapheme count of `name`. */
  graphemes: number;
}

export const SECTORS: readonly Sector[] = ["salon", "cafe", "studio", "trades"];

const NAME_KEY = "gwp:name";
const SECTOR_KEY = "gwp:sector";
const DEFAULT_SECTOR: Sector = "salon";
const FALLBACK_DISPLAY = "your business";
const FALLBACK_SLUG = "yourbusiness";
const MAX_GRAPHEMES = 40;
const MAX_SLUG = 24;
/** The hero input caps at 60, but a paste can be anything. */
const MAX_RAW = 200;

/* ------------------------------------------------------------------ */
/* Sanitising                                                          */
/* ------------------------------------------------------------------ */

// Built with the RegExp constructor so the ES2017 tsconfig target does not
// reject the \p{…} property escapes at compile time. Every browser that can
// run the rest of the showcase supports them.
//
// Beyond the spec's three classes we also strip the emoji "glue" that is not
// itself pictographic, so an emoji-only name collapses to nothing instead of
// leaving an invisible character behind:
//   FE0E/FE0F variation selectors, 20E3 keycap, skin-tone modifiers,
//   regional-indicator flag letters. (ZWJ and tag characters are already Cf.)
const STRIP_RE = new RegExp(
  "[\\p{Extended_Pictographic}\\p{Cc}\\p{Cf}\\p{Emoji_Modifier}\\p{Regional_Indicator}\\uFE0E\\uFE0F\\u20E3]",
  "gu",
);
const SPACE_RE = /\s+/g;
const DIACRITIC_RE = new RegExp("\\p{M}", "gu");
const NON_SLUG_RE = /[^a-z0-9]/g;

type Segmenter = { segment(input: string): Iterable<{ segment: string }> };
let segmenter: Segmenter | null | undefined;

function getSegmenter(): Segmenter | null {
  if (segmenter === undefined) {
    try {
      segmenter =
        typeof Intl !== "undefined" && "Segmenter" in Intl
          ? (new Intl.Segmenter(undefined, { granularity: "grapheme" }) as Segmenter)
          : null;
    } catch {
      segmenter = null;
    }
  }
  return segmenter;
}

/** Splits into user-perceived characters; falls back to code points. */
function graphemesOf(s: string): string[] {
  const seg = getSegmenter();
  if (!seg) return Array.from(s);
  const out: string[] = [];
  for (const part of seg.segment(s)) out.push(part.segment);
  return out;
}

export function sanitiseName(raw: string): { name: string; graphemes: number } {
  const cleaned = raw.replace(STRIP_RE, "").replace(SPACE_RE, " ").trim();
  const parts = graphemesOf(cleaned);
  const capped = (parts.length > MAX_GRAPHEMES ? parts.slice(0, MAX_GRAPHEMES).join("") : cleaned).trim();
  return { name: capped, graphemes: capped === cleaned ? parts.length : graphemesOf(capped).length };
}

export function slugify(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(DIACRITIC_RE, "")
    .toLowerCase()
    .replace(NON_SLUG_RE, "")
    .slice(0, MAX_SLUG);
  return slug.length >= 2 ? slug : FALLBACK_SLUG;
}

function derive(raw: string, sector: Sector, committed: boolean): VisitorState {
  const { name, graphemes } = sanitiseName(raw);
  const hasName = graphemes >= 2;
  const slug = hasName ? slugify(name) : FALLBACK_SLUG;
  return {
    raw,
    name,
    hasName,
    display: hasName ? name : FALLBACK_DISPLAY,
    sector,
    slug,
    domain: `${slug}.co.uk`,
    committed: hasName && committed,
    graphemes,
  };
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

const SERVER_STATE: VisitorState = Object.freeze(derive("", DEFAULT_SECTOR, false));

let state: VisitorState | null = null;
const listeners = new Set<(s: VisitorState) => void>();

function isSector(v: unknown): v is Sector {
  return typeof v === "string" && (SECTORS as readonly string[]).includes(v);
}

function readStorage(): VisitorState {
  let raw = "";
  let sector: Sector = DEFAULT_SECTOR;
  try {
    raw = (sessionStorage.getItem(NAME_KEY) ?? "").slice(0, MAX_RAW);
    const s = sessionStorage.getItem(SECTOR_KEY);
    if (isSector(s)) sector = s;
  } catch {
    // Storage blocked — start fresh.
  }
  return derive(raw, sector, false);
}

function write(key: string, value: string) {
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch {
    // Not remembered; the in-memory state still works for this page view.
  }
}

function current(): VisitorState {
  if (typeof window === "undefined") return SERVER_STATE;
  if (state === null) state = readStorage();
  return state;
}

function set(next: VisitorState) {
  state = next;
  for (const cb of Array.from(listeners)) cb(next);
}

/** The current state. Stable reference until something changes. */
export function getVisitor(): VisitorState {
  return current();
}

export function setVisitorName(raw: string): void {
  const capped = String(raw ?? "").slice(0, MAX_RAW);
  const prev = current();
  if (capped === prev.raw) return;
  write(NAME_KEY, capped);
  set(derive(capped, prev.sector, prev.committed));
}

export function setVisitorSector(s: Sector): void {
  if (!isSector(s)) return;
  const prev = current();
  if (s === prev.sector) return;
  write(SECTOR_KEY, s);
  set({ ...prev, sector: s });
}

/** Marks the sketch as committed. A no-op without a name (fewer than 2 graphemes). */
export function commitVisitor(): void {
  const prev = current();
  if (!prev.hasName || prev.committed) return;
  set({ ...prev, committed: true });
}

/**
 * Non-React subscription (WebGL scenes, canvas redraws). The callback receives
 * the new state on every change; it is not called on subscribe — read
 * getVisitor() for the initial value. Returns an unsubscribe function.
 */
export function subscribeVisitor(cb: (s: VisitorState) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

const subscribeForReact = (onChange: () => void) => subscribeVisitor(() => onChange());
const getServerSnapshot = () => SERVER_STATE;

/**
 * React binding. Server render and hydration see the empty default
 * ("your business", salon); the stored name appears right after hydration,
 * so there is no mismatch.
 */
export function useVisitor(): VisitorState {
  return useSyncExternalStore(subscribeForReact, current, getServerSnapshot);
}

/* ------------------------------------------------------------------ */
/* URL detection                                                       */
/* ------------------------------------------------------------------ */

const URL_RE = /^(https?:\/\/)?(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i;
const PROTOCOL_RE = /^https?:\/\//i;

/**
 * If `raw` looks like a web address, returns its lower-cased hostname
 * (protocol, path and trailing dot dropped; "www." kept, it is part of the
 * real host). Otherwise null. Surrounding whitespace is ignored; any inner
 * whitespace means "not a URL".
 *
 * Extra guard beyond the spec regex: the last label (the TLD) must be at least
 * 2 characters and contain a letter, so "3.5" or "v1.0" are not URLs.
 */
export function looksLikeUrl(raw: string): string | null {
  const s = String(raw ?? "").trim();
  if (!s || /\s/.test(s) || s.length > 2048 || !URL_RE.test(s)) return null;
  const host = s.replace(PROTOCOL_RE, "").split(/[/?#]/, 1)[0].replace(/\.$/, "").toLowerCase();
  const labels = host.split(".");
  const tld = labels[labels.length - 1];
  if (labels.length < 2 || tld.length < 2 || !/[a-z]/.test(tld)) return null;
  return host;
}
