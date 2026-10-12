"use client";

/**
 * "Whose site shall we sketch?" — the name field, the sector chips and,
 * after commit, the way forward: "Make it real" (pricing) and the AI
 * copywriter. A web address typed here offers the free audit instead.
 *
 * The name stays in the browser (lib/showcase/visitor). Only the explicit
 * AI click sends it anywhere — to Claude, disclosed next to the button.
 */

import { useCallback, useRef, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useLenis } from "lenis/react";
import { useScrollTo } from "@/components/motion/SmoothScroll";
import { prefersReducedMotion } from "@/lib/motion/gsap";
import {
  commitVisitor,
  getVisitor,
  looksLikeUrl,
  setVisitorName,
  setVisitorSector,
  useVisitor,
  type Sector,
} from "@/lib/showcase/visitor";
import { startAuditHandoff } from "@/lib/showcase/auditHandoff";
import { track } from "@/lib/showcase/analytics";
import AiButton, { AiNote } from "./AiButton";
import { fireSweep, fireTypeSweep, markInk } from "./heroBus";
import styles from "./NameCard.module.css";

const CHIPS: { id: Sector; label: string }[] = [
  { id: "salon", label: "Salon" },
  { id: "cafe", label: "Café" },
  { id: "studio", label: "Studio" },
  { id: "trades", label: "Trades" },
];

const HELP_ID = "hero-name-help";

export default function NameCard() {
  const visitor = useVisitor();
  const router = useRouter();
  const lenis = useLenis();
  const scrollTo = useScrollTo();
  const cardRef = useRef<HTMLDivElement>(null);
  const afterRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const typed = useRef(false);

  const urlHost = looksLikeUrl(visitor.raw);

  /** Enter, the → button, or leaving the field with ≥2 graphemes. */
  const commit = useCallback((quiet = false) => {
    const v = getVisitor();
    if (!v.hasName) return false;
    if (!v.committed) {
      commitVisitor();
      track("sketch_committed");
      fireSweep("commit");
    } else if (!quiet) {
      // Enter again on a committed name: the light confirms it.
      fireSweep("commit");
    }
    return true;
  }, []);

  const onChange = (raw: string) => {
    const before = getVisitor().raw;
    markInk(before, raw);
    setVisitorName(raw);
    if (!typed.current && raw.trim()) {
      typed.current = true;
      track("sketch_typed");
    }
    if (raw.trim()) fireTypeSweep();
  };

  /** After an explicit commit, bring the new row on screen if it is below the fold. */
  const reveal = () => {
    window.setTimeout(() => {
      const after = afterRef.current;
      if (!after) return;
      const r = after.getBoundingClientRect();
      const over = r.bottom + 24 - window.innerHeight;
      if (over <= 0) return;
      const reduce = prefersReducedMotion();
      if (lenis) lenis.scrollTo(window.scrollY + over, { duration: 0.8, immediate: reduce });
      else window.scrollBy({ top: over, behavior: reduce ? "instant" : "smooth" });
    }, 60);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (commit()) reveal();
  };

  const onBlur = () => {
    if (getVisitor().graphemes >= 2) commit(true);
  };

  // Phones: lift the card above the keyboard, 72px under the top.
  const onFocus = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    const card = cardRef.current;
    if (!card) return;
    window.setTimeout(() => {
      const reduce = prefersReducedMotion();
      if (lenis) {
        lenis.scrollTo(card, { offset: -72, duration: 0.6, immediate: reduce, force: true });
      } else {
        const top = card.getBoundingClientRect().top + window.scrollY - 72;
        window.scrollTo({ top, behavior: reduce ? "instant" : "smooth" });
      }
    }, 280);
  };

  const onGo = () => {
    if (commit()) reveal();
    else document.getElementById("hero-name")?.focus();
  };

  const pickSector = (s: Sector, focus = false) => {
    const i = CHIPS.findIndex((c) => c.id === s);
    if (focus) chipRefs.current[i]?.focus();
    if (s === getVisitor().sector) return;
    setVisitorSector(s);
    fireSweep("sector");
    track("sector_changed");
  };

  const onChipKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % CHIPS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + CHIPS.length) % CHIPS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = CHIPS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    pickSector(CHIPS[next].id, true);
  };

  const onAudit = () => {
    track("audit_handoff");
    startAuditHandoff(getVisitor().raw, router);
  };

  const onReal = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    track("pricing_from_sketch");
    scrollTo("#pricing");
  };

  return (
    <div ref={cardRef} className={styles.card}>
      <label htmlFor="hero-name" className={styles.label}>
        Whose site shall we sketch?
      </label>
      <div className={styles.field}>
        <input
          id="hero-name"
          className={styles.input}
          type="text"
          value={visitor.raw}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          onFocus={onFocus}
          placeholder="Your business name"
          autoComplete="organization"
          autoCapitalize="words"
          spellCheck={false}
          maxLength={60}
          enterKeyHint="done"
          aria-describedby={HELP_ID}
        />
        <button type="button" className={styles.go} aria-label="Sketch it" onClick={onGo}>
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path d="M4 10h11M10.5 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>
      </div>

      {urlHost ? (
        <button type="button" className={`${styles.audit} enter-up`} onClick={onAudit}>
          Audit {urlHost} free — about 30 seconds →
        </button>
      ) : null}

      <div role="radiogroup" aria-label="Type of business" className={styles.chips}>
        {CHIPS.map((c, i) => {
          const on = visitor.sector === c.id;
          return (
            <button
              key={c.id}
              ref={(el) => {
                chipRefs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              className={styles.chip}
              onClick={() => pickSector(c.id)}
              onKeyDown={(e) => onChipKey(e, i)}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <p id={HELP_ID} className={styles.help} data-committed={visitor.committed ? "1" : "0"}>
        Stays in your browser. It&apos;s a sketch, not a promise.
      </p>

      <div ref={afterRef} className={styles.after}>
        <p className={styles.caption} aria-live="polite">
          {visitor.committed ? (
            <span className={`${styles.captionText} enter-up`}>
              A sketch for {visitor.name}, drawn in your browser. The real one takes 5–7 working days.
            </span>
          ) : null}
        </p>
        {visitor.committed ? (
          <div className={`${styles.committed} enter-up`}>
            <div className={styles.actions}>
              <a href="#pricing" className={styles.real} onClick={onReal}>
                Make it real — from £500
              </a>
              <AiButton />
            </div>
            <AiNote />
          </div>
        ) : null}
      </div>
    </div>
  );
}
