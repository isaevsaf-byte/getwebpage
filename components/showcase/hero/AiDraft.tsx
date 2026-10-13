"use client";

/**
 * Claude's words, legible, next to the sketch: the tagline types in as it
 * streams, then the buttons and card titles Claude wrote land where their
 * shimmering placeholders were. Visual only (aria-hidden) — AiNote's live
 * region speaks the result once.
 *
 * It appears on the click itself (status turns 'writing' synchronously) at
 * its final height, so nothing below it moves when the words arrive.
 */

import { useAiForVisitor } from "./AiButton";
import styles from "./AiDraft.module.css";

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export default function AiDraft({ variant, className }: { variant: "stage" | "flow"; className?: string }) {
  const { visitor, ai, status } = useAiForVisitor();

  // Phones scroll the visitor down to this pane on click, away from AiNote —
  // so a failure must also be said here, where they are looking.
  if (variant === "flow" && (status === "error" || status === "limited")) {
    return (
      <div className={cx(styles.draft, styles[variant], "enter-up", className)} aria-hidden="true">
        <div className={styles.inner}>
          <p className={styles.head}>
            <span className={styles.glyph}>✦</span>
            No draft this time
          </p>
          <p className={styles.sub}>
            {ai.message || "Claude couldn't write this just now. Try again in a moment."}
          </p>
        </div>
      </div>
    );
  }
  if (status !== "writing" && status !== "done") return null;

  const copy = status === "done" ? ai.copy : null;
  const text = copy?.sub || ai.streamed;

  return (
    <div
      className={cx(styles.draft, styles[variant], "enter-up", className)}
      data-status={copy ? "done" : "writing"}
      aria-hidden="true"
    >
      <span className={styles.ring} />
      <div className={styles.inner}>
        <p className={styles.head}>
          <span className={styles.glyph}>✦</span>
          {copy ? "Claude's draft for " : "Claude is writing for "}
          <span className={styles.name}>{visitor.name}</span>
        </p>
        <p className={styles.sub}>
          <span className={styles.quote}>“</span>
          {text}
          {copy ? <span className={styles.quote}>”</span> : <span className={styles.caret} />}
        </p>
        <div className={styles.parts}>
          {copy ? (
            <>
              <span className={styles.cta}>{copy.cta}</span>
              <span className={styles.cta2}>{copy.cta2}</span>
            </>
          ) : (
            <>
              <span className={cx(styles.cta, styles.ghost)} style={{ width: "7.5em" }} />
              <span className={cx(styles.cta2, styles.ghost)} style={{ width: "8.5em" }} />
            </>
          )}
          <span className={styles.cards}>
            {copy?.cards ? (
              copy.cards.map((c) => c.title).join(" · ")
            ) : (
              <span className={styles.ghostLine} />
            )}
          </span>
        </div>
        <span className={styles.shine} />
      </div>
    </div>
  );
}
