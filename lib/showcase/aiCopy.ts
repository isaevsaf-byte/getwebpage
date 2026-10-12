"use client";

/**
 * Shared store for the live AI copywriter: the visitor asks, Claude writes
 * the tagline, buttons and cards for their sketch. Every section that draws
 * the visitor's sketch (Hero, SevenDays, Pricing thumbnail, Ownership) reads
 * the same state, so the copy follows them down the page.
 *
 * CONTRACT FILE — the ai-copy agent owns the implementation; the exported
 * types and function names below are fixed so other sections can code
 * against them in parallel. Until implemented, request() reports 'error'.
 */
import { useSyncExternalStore } from "react";
import type { Sector } from "./visitor";
import type { SketchCopy } from "./sketch";

export type AiCopyStatus = "idle" | "writing" | "done" | "error" | "limited";

export interface AiCopyState {
  status: AiCopyStatus;
  /** Final, validated copy once status is 'done'. */
  copy: SketchCopy | null;
  /** Partial tagline while streaming — sections may type it live. */
  streamed: string;
  /** Who the copy was written for; stale if the visitor changes name/sector. */
  forName: string;
  forSector: Sector | null;
  /** Visitor-facing message for 'error' / 'limited'. */
  message?: string;
}

const INITIAL: AiCopyState = {
  status: "idle",
  copy: null,
  streamed: "",
  forName: "",
  forSector: null,
};

let state: AiCopyState = INITIAL;
const listeners = new Set<() => void>();

function emit(next: AiCopyState) {
  state = next;
  listeners.forEach((l) => l());
}

export function getAiCopy(): AiCopyState {
  return state;
}

export function subscribeAiCopy(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Ask Claude to write copy for this business. Explicit visitor action only. */
export async function requestAiCopy(name: string, sector: Sector): Promise<void> {
  emit({ ...INITIAL, status: "error", forName: name, forSector: sector, message: "Not available yet." });
}

export function resetAiCopy(): void {
  emit(INITIAL);
}

export function useAiCopy(): AiCopyState {
  return useSyncExternalStore(subscribeAiCopy, getAiCopy, () => INITIAL);
}
