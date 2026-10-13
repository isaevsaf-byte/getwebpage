"use client";

/**
 * "{name}'s site. Pick how far it goes." — the visitor's own sketch heading
 * the price cards, as a deck of pages.
 *
 * The front pane is their home page (the procedural sketch at stage 4 — code,
 * not AI; Claude's words appear in it only if the visitor asked for them).
 * Behind it, one sheet per extra page the previewed tier includes: Starter is
 * a single page, Standard up to 5, Identity up to 10. Pointing at or
 * focusing a tier card fans the deck to that tier. Standard (recommended)
 * is the resting state, so phones and keyboards start from the same picture.
 *
 * Client-only: Pricing renders this only once useVisitor() reports a name,
 * which is never true during hydration.
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { prefersReducedMotion } from "@/lib/motion/gsap";
import CssPane from "@/components/showcase/primitives/CssPane";
import { SECTORS as SKETCH_SECTORS } from "@/lib/showcase/sketch";
import { useVisitor } from "@/lib/showcase/visitor";
import { useAiCopy } from "@/lib/showcase/aiCopy";
import type { Tier } from "@/lib/showcase/content";
import SketchThumb from "./SketchThumb";
import styles from "./Pricing.module.css";

/** Sheets behind the front pane at most (Identity: up to 10 pages). */
export const MAX_SHEETS = 9;

/** "Single page" → 1, "Up to 5 pages" → 5, "Up to 10 pages" → 10. */
export function pagesOf(tier: Tier): number {
  const m = /(\d+)\s+pages?/i.exec(tier.features[0] ?? "");
  const n = m ? parseInt(m[1], 10) : 1;
  return Math.max(1, Math.min(MAX_SHEETS + 1, n));
}

type Props = {
  /** The tier the visitor is pointing at (Standard at rest). */
  tier: Tier;
};

export default function PersonalStrip({ tier }: Props) {
  const visitor = useVisitor();
  const ai = useAiCopy();
  // Claude's words only when they were written for this exact name and sector.
  const copy =
    ai.status === "done" && ai.copy && ai.forName === visitor.name && ai.forSector === visitor.sector
      ? ai.copy
      : undefined;
  const pages = pagesOf(tier);
  const sheetBg = (SKETCH_SECTORS[visitor.sector] ?? SKETCH_SECTORS.salon).palette.bg;

  // The deck arrives gathered behind the pane and fans out to the tier's
  // page count once it is well on screen (CSS transitions do the fan). Only
  // when it mounts below the fold with motion allowed; otherwise it is
  // simply fanned.
  const ref = useRef<HTMLDivElement>(null);
  const [folded, setFolded] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.8) return;
    let io: IntersectionObserver | null = null;
    const id = requestAnimationFrame(() => {
      setFolded(true);
      io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          setFolded(false);
          io?.disconnect();
        },
        { rootMargin: "0px 0px -30% 0px" },
      );
      io.observe(el);
    });
    return () => {
      cancelAnimationFrame(id);
      io?.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={styles.strip}
      data-pages={pages}
      data-long={visitor.graphemes > 18 ? "" : undefined}
      data-folded={folded ? "" : undefined}
    >
      <div className={styles.deck} aria-hidden="true">
        <div className={styles.deckInner} style={{ "--sheet-bg": sheetBg } as CSSProperties}>
          {Array.from({ length: MAX_SHEETS }, (_, i) => {
            const k = MAX_SHEETS - i; // back-to-front: the deepest sheet paints first
            return (
              <span
                key={k}
                className={styles.sheet}
                data-on={k <= pages - 1 ? "" : undefined}
                style={{ "--k": k } as CSSProperties}
              />
            );
          })}
          <CssPane
            domain={visitor.domain}
            secure
            tone="paper"
            aspect="16/10"
            tilt={{ x: 0, y: 0 }}
            className={styles.thumbPane}
          >
            <SketchThumb visitor={visitor} copy={copy} />
          </CssPane>
        </div>
      </div>

      <div className={styles.stripText}>
        <p className={styles.stripLine}>
          <span className={styles.stripName}>{visitor.name}&apos;s site.</span>{" "}
          <span>Pick how far it goes.</span>
        </p>
        <p className={styles.stripMeta}>
          <span className={styles.stripTier}>{tier.name}</span> — {tier.features[0]}
        </p>
      </div>
    </div>
  );
}
