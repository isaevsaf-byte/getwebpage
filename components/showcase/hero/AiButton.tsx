"use client";

/**
 * The new-era moment: after the visitor commits a name, one click asks
 * Claude (Anthropic) to write their homepage copy, streamed live into the
 * sketch. The sketch itself is procedural code — only the words come from
 * Claude, and only on this explicit click.
 *
 * AiButton is the trigger; AiNote is the one-line disclosure plus a status
 * line (polite live region). AiDraft (separate file) shows the words as
 * they arrive, next to the sketch.
 */

import { useLenis } from "lenis/react";
import { prefersReducedMotion } from "@/lib/motion/gsap";
import { requestAiCopy, useAiCopy, type AiCopyStatus } from "@/lib/showcase/aiCopy";
import { useVisitor } from "@/lib/showcase/visitor";
import styles from "./AiButton.module.css";

export const AI_NOTE = "Sends your business name and type to Claude by Anthropic.";
const NOTE_ID = "hero-ai-note";

/** The AI state for the visitor's current name + sector ('idle' when stale). */
export function useAiForVisitor() {
  const visitor = useVisitor();
  const ai = useAiCopy();
  const mine =
    visitor.committed && ai.forName === visitor.name && ai.forSector === visitor.sector;
  const status: AiCopyStatus = mine ? ai.status : "idle";
  return { visitor, ai, mine, status };
}

const LABEL: Record<AiCopyStatus, string> = {
  idle: "Let AI write your homepage",
  writing: "Claude is writing…",
  done: "Written by Claude",
  error: "Try again",
  limited: "Let AI write your homepage",
};

export default function AiButton() {
  const { visitor, status } = useAiForVisitor();
  const busy = status === "writing";
  // 'done' is a badge: the same name + sector would return the same words.
  const blocked = status === "limited" || status === "done";

  const lenis = useLenis();

  const onClick = () => {
    if (busy || blocked || !visitor.hasName) return;
    void requestAiCopy(visitor.name, visitor.sector);
    // Phones: the sketch is below this button — bring it up to watch.
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    const pane = document.querySelector<HTMLElement>("[data-hero-mobile-pane]");
    if (!pane) return;
    const top = pane.getBoundingClientRect().top;
    if (top < window.innerHeight * 0.35) return;
    const reduce = prefersReducedMotion();
    if (lenis) lenis.scrollTo(pane, { offset: -96, duration: 0.9, immediate: reduce });
    else window.scrollBy({ top: top - 96, behavior: reduce ? "instant" : "smooth" });
  };

  return (
    <button
      type="button"
      className={styles.btn}
      data-status={status}
      onClick={onClick}
      aria-disabled={busy || blocked || undefined}
      aria-describedby={NOTE_ID}
    >
      <span className={styles.ring} aria-hidden="true" />
      <span className={styles.face}>
        <span className={styles.glyph} aria-hidden="true">
          ✦
        </span>
        <span>{LABEL[status]}</span>
      </span>
    </button>
  );
}

export function AiNote() {
  const { ai, status } = useAiForVisitor();
  let said = "";
  if (status === "writing") said = "Claude is writing your homepage copy.";
  else if (status === "done" && ai.copy?.sub) said = `Done. Your sketch now reads: ${ai.copy.sub}`;
  const problem =
    status === "error" || status === "limited"
      ? ai.message || "Claude couldn't write this just now. Try again in a moment."
      : "";

  return (
    <>
      <p id={NOTE_ID} className={styles.note}>
        {AI_NOTE}
      </p>
      <p className={styles.status} role="status" aria-live="polite">
        {problem ? <span className={styles.problem}>{problem}</span> : null}
        {said ? <span className={styles.sr}>{said}</span> : null}
      </p>
    </>
  );
}
