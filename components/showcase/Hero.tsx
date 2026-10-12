"use client";

/**
 * Screen 1: proof (real live sites in lit glass), possession (the visitor's
 * own name becoming a site) and the offer (prices, time, ownership).
 *
 * Everything above the fold is server-rendered in its final state. JS only
 * adds motion: the CSS ink-in on the H1, the pane outlines, the pointer
 * lean, the WebGL stage (desktop, capable GPUs) and the scroll-out.
 */

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import { gsap, motionMedia, useGSAP } from "@/lib/motion/gsap";
import { useScrollTo } from "@/components/motion/SmoothScroll";
import { useVisitor } from "@/lib/showcase/visitor";
import { resetAiCopy, useAiCopy } from "@/lib/showcase/aiCopy";
import { track } from "@/lib/showcase/analytics";
import HeroFan, { HeroFanMobile } from "./hero/HeroFan";
import NameCard from "./hero/NameCard";
import {
  fireSweep,
  focusNameInput,
  setHeroScroll,
  splitGraphemes,
  useInk,
} from "./hero/heroBus";
import styles from "./hero/Hero.module.css";

const SUB =
  "For salons, studios, hospitality and trades. We handle everything\u00a0— design, copy, build, launch. You just approve it.";
const FACTS =
  "£500 · £800 · £1,200 — fixed prices · 50% to start · 5–7 working days from your brief · yours on handover";

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/** The visitor's name in the H1. Freshly typed graphemes ink in (wght 200→560). */
function HeroSlot() {
  const visitor = useVisitor();
  const ink = useInk();
  const text = visitor.hasName ? visitor.name : "your business";
  const g = splitGraphemes(text);
  const fresh = (i: number) => visitor.hasName && ink[i] === true;
  let first = g.length;
  for (let i = 0; i < g.length; i++) {
    if (fresh(i)) {
      first = i;
      break;
    }
  }
  const n = visitor.hasName ? visitor.graphemes : 0;
  const size = n > 28 ? styles.slotXLong : n > 18 ? styles.slotLong : "";

  // The underline is drawn for a one-line slot only.
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      el.dataset.wrapped = el.getClientRects().length > 1 ? "1" : "0";
    };
    check();
    let live = true;
    document.fonts?.ready.then(() => live && check());
    window.addEventListener("resize", check);
    return () => {
      live = false;
      window.removeEventListener("resize", check);
    };
  }, [text, size]);

  return (
    <span
      ref={ref}
      className={cx("h1-slot", styles.slot, size)}
      onClick={focusNameInput}
      data-filled={visitor.hasName ? "1" : "0"}
    >
      {g.slice(0, first).join("")}
      {g.slice(first).map((ch, j) => {
        const i = first + j;
        return fresh(i) ? (
          <span key={`g${i}`} className={styles.inkNew}>
            {ch}
          </span>
        ) : (
          <span key={`g${i}`}>{ch}</span>
        );
      })}
      <svg className={styles.underline} viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M1 4.2C22 2.2 46 1.6 64 2.6S90 4.4 99 3" vectorEffect="non-scaling-stroke" />
      </svg>
    </span>
  );
}

/** Keeps Claude's copy honest to the current name, and lights the 'ai' sweep. */
function AiLifecycle() {
  const visitor = useVisitor();
  const ai = useAiCopy();
  const prev = useRef(ai.status);
  useEffect(() => {
    const mine =
      visitor.committed && ai.forName === visitor.name && ai.forSector === visitor.sector;
    // The visitor changed the name or sector mid-write: stop that request.
    if (ai.status === "writing" && !mine) resetAiCopy();
    if (prev.current !== "done" && ai.status === "done" && mine) fireSweep("ai");
    prev.current = ai.status;
  }, [ai, visitor.committed, visitor.name, visitor.sector]);
  return null;
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  const scrollTo = useScrollTo();

  // Scroll-out (desktop, motion allowed): type lifts and fades, the fan or
  // the WebGL camera moves in. Scrubbed 1:1, ease none.
  useGSAP(
    () => {
      const mm = motionMedia(({ ok, desktop }) => {
        const section = sectionRef.current;
        const type = typeRef.current;
        if (!ok || !desktop || !section || !type) return;
        const fan = section.querySelector<HTMLElement>("[data-hero-fan]");
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom top",
            scrub: true,
            onUpdate: (self) => setHeroScroll(self.progress),
            onToggle: (self) => {
              type.style.willChange = self.isActive ? "transform, opacity" : "";
            },
          },
        });
        tl.fromTo(type, { yPercent: 0 }, { yPercent: -8, duration: 1 }, 0);
        tl.fromTo(type, { opacity: 1 }, { opacity: 0, duration: 0.45 }, 0.4);
        if (fan) tl.fromTo(fan, { z: 0 }, { z: 80, duration: 1 }, 0);
        return () => {
          setHeroScroll(0);
          type.style.willChange = "";
        };
      });
      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  const onPricing = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    track("pricing_from_hero");
    scrollTo("#pricing");
  };

  const facts = (where: string) => <p className={cx(styles.facts, where)}>{FACTS}</p>;

  return (
    <section
      ref={sectionRef}
      id="top"
      data-ground="ink"
      className={styles.hero}
      aria-labelledby="hero-title"
    >
      <AiLifecycle />
      <HeroFan />
      <div className={styles.scrim} aria-hidden="true" />
      <div className={styles.grid}>
        <div ref={typeRef} className={styles.type}>
          {/* Lines are inline spans split by <br>, so the whole H1 is one
              text block — the LCP candidate — not three small ones. */}
          <h1 id="hero-title" className={styles.h1}>
            <span className={cx("ink-in", styles.line, styles.lineFixed)} style={{ "--i": 0 } as CSSProperties}>
              {"A serious website "}
            </span>
            <br />
            <span className={cx("ink-in", styles.line)} style={{ "--i": 1 } as CSSProperties}>
              {"for "}
              <HeroSlot />
              {". "}
            </span>
            <br />
            <span className={cx("ink-in", styles.line, styles.lineFixed)} style={{ "--i": 2 } as CSSProperties}>
              {"Built in "}
              <span className={styles.accent}>7 days.</span>
            </span>
          </h1>
          <p className={styles.sub}>{SUB}</p>
          <div className={styles.ctas}>
            <a href="#pricing" className={styles.primary} onClick={onPricing}>
              Choose a plan — from £500
            </a>
            <Link href="/audit" transitionTypes={["nav-forward"]} className={styles.secondary}>
              Audit my current site — free →
            </Link>
          </div>
          {facts(styles.factsMobile)}
          <NameCard />
          {facts(styles.factsDesktop)}
          <HeroFanMobile />
        </div>
      </div>
    </section>
  );
}
