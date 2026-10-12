"use client";

/**
 * Hero-local state shared by the H1 slot, the name card and both stages
 * (CSS fan + WebGL). Module-level, so the pieces talk without re-rendering
 * the whole section on every keystroke or scroll frame.
 *
 *   - sweep:  a counter + kind; every stage plays one light sweep per bump.
 *   - scroll: 0..1 scroll-out progress of #top (WebGL tier only reads it).
 *   - ink:    birth times of freshly typed graphemes in the H1 slot.
 *   - live:   true once the WebGL canvas covers the CSS poster.
 */

import { useMemo, useSyncExternalStore } from "react";
import {
  getVisitor,
  looksLikeUrl,
  sanitiseName,
  useVisitor,
  type VisitorState,
} from "@/lib/showcase/visitor";
import { useAiCopy } from "@/lib/showcase/aiCopy";
import type { SketchCopy, SketchStage } from "@/lib/showcase/sketch";
import type { HeroSweepKind } from "./contract";

type Listener = () => void;

function createStore<T>(initial: T) {
  let value = initial;
  const subs = new Set<Listener>();
  return {
    get: () => value,
    set(next: T) {
      if (Object.is(next, value)) return;
      value = next;
      for (const l of Array.from(subs)) l();
    },
    subscribe(l: Listener) {
      subs.add(l);
      return () => {
        subs.delete(l);
      };
    },
    initial,
  };
}

/* ------------------------------------------------------------------ */
/* Sweeps                                                              */
/* ------------------------------------------------------------------ */

export interface SweepState {
  n: number;
  kind: HeroSweepKind;
}

const SWEEP_INITIAL: SweepState = { n: 0, kind: "intro" };
const sweepStore = createStore<SweepState>(SWEEP_INITIAL);
let lastTypeSweep = -Infinity;

export function fireSweep(kind: HeroSweepKind): void {
  sweepStore.set({ n: sweepStore.get().n + 1, kind });
}

/** Typing sweeps play at most once per 1.2s. */
export function fireTypeSweep(): void {
  const now = performance.now();
  if (now - lastTypeSweep < 1200) return;
  lastTypeSweep = now;
  fireSweep("type");
}

export function useSweep(): SweepState {
  return useSyncExternalStore(sweepStore.subscribe, sweepStore.get, () => SWEEP_INITIAL);
}

/* ------------------------------------------------------------------ */
/* Scroll-out progress (quantised so React only hears real changes)     */
/* ------------------------------------------------------------------ */

const scrollStore = createStore<number>(0);

export function setHeroScroll(p: number): void {
  const q = Math.round(Math.min(1, Math.max(0, p)) * 400) / 400;
  scrollStore.set(q);
}

export function useHeroScroll(enabled: boolean): number {
  return useSyncExternalStore(
    enabled ? scrollStore.subscribe : noopSubscribe,
    enabled ? scrollStore.get : zero,
    zero,
  );
}

const noopSubscribe = () => () => {};
const zero = () => 0;

/* ------------------------------------------------------------------ */
/* WebGL live flag                                                     */
/* ------------------------------------------------------------------ */

const liveStore = createStore<boolean>(false);
export const setStageLive = (v: boolean) => liveStore.set(v);
export function useStageLive(): boolean {
  return useSyncExternalStore(liveStore.subscribe, liveStore.get, () => false);
}

/* ------------------------------------------------------------------ */
/* Ink: freshly typed graphemes in the H1 slot                          */
/* ------------------------------------------------------------------ */

export const INK_MS = 300;
let inkBirth: number[] = [];
const NO_INK: readonly boolean[] = [];
/** Which graphemes of the slot are "fresh ink" right now (a new array per change). */
const inkStore = createStore<readonly boolean[]>(NO_INK);
let inkTimer = 0;

function publishInk() {
  const now = performance.now();
  const fresh = inkBirth.map((b) => b !== undefined && now - b < INK_MS);
  inkStore.set(fresh.some(Boolean) ? fresh : NO_INK);
  const pending = inkBirth.filter((b) => b !== undefined && now - b < INK_MS);
  window.clearTimeout(inkTimer);
  if (pending.length) {
    const next = Math.min(...pending) + INK_MS - now + 10;
    inkTimer = window.setTimeout(publishInk, Math.max(10, next));
  }
}

type Seg = { segment(s: string): Iterable<{ segment: string }> };
let segmenter: Seg | null | undefined;
export function splitGraphemes(s: string): string[] {
  if (segmenter === undefined) {
    try {
      segmenter =
        typeof Intl !== "undefined" && "Segmenter" in Intl
          ? (new Intl.Segmenter(undefined, { granularity: "grapheme" }) as Seg)
          : null;
    } catch {
      segmenter = null;
    }
  }
  if (!segmenter) return Array.from(s);
  return Array.from(segmenter.segment(s), (x) => x.segment);
}

/**
 * Called from the input's change handler (an event, never a render, so React
 * strict mode cannot double-count). Everything after the common prefix of the
 * old and new name is "new ink" for INK_MS.
 */
export function markInk(beforeRaw: string, afterRaw: string): void {
  const before = splitGraphemes(sanitiseName(beforeRaw).name);
  const after = splitGraphemes(sanitiseName(afterRaw).name);
  let k = 0;
  while (k < before.length && k < after.length && before[k] === after[k]) k++;
  const now = performance.now();
  const next = inkBirth.slice(0, Math.min(k, after.length));
  for (let i = k; i < after.length; i++) next[i] = now;
  inkBirth = next;
  publishInk();
}

/** Fresh-ink flags per grapheme of the visitor's name. */
export function useInk(): readonly boolean[] {
  return useSyncExternalStore(inkStore.subscribe, inkStore.get, () => NO_INK);
}

/* ------------------------------------------------------------------ */
/* The sketch model: what both stages draw                              */
/* ------------------------------------------------------------------ */

export interface SketchModel {
  visitor: VisitorState;
  stage: SketchStage;
  /** Claude's copy, only when it was written for this exact name + sector. */
  copy: SketchCopy | null;
  aiWriting: boolean;
  aiStreamed: string;
}

export function useSketchModel(): SketchModel {
  const stored = useVisitor();
  // A web address typed as the name: the sketch's address bar shows that
  // address, not a slug of it ("bellahair.co.uk", not "bellahaircouk.co.uk").
  const host = looksLikeUrl(stored.raw);
  const visitor = useMemo(
    () => (host && stored.hasName ? { ...stored, domain: host } : stored),
    [stored, host],
  );
  const ai = useAiCopy();
  const mine =
    visitor.committed && ai.forName === visitor.name && ai.forSector === visitor.sector;
  const aiWriting = mine && ai.status === "writing";
  return {
    visitor,
    stage: visitor.committed ? 4 : 3,
    copy: mine && ai.status === "done" ? ai.copy : null,
    aiWriting,
    aiStreamed: aiWriting || (mine && ai.status === "done") ? ai.streamed : "",
  };
}

/** Focus the hero name field (H1 slot click, sketch pane click). */
export function focusNameInput(): void {
  const el = document.getElementById("hero-name") as HTMLInputElement | null;
  if (!el) return;
  el.focus({ preventScroll: window.matchMedia("(min-width: 1024px)").matches });
  const end = el.value.length;
  try {
    el.setSelectionRange(end, end);
  } catch {}
}

export { getVisitor };
