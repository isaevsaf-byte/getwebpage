"use client";

/**
 * Progress rail for SevenDays. Imperative by design: the section's
 * ScrollTriggers call `setProgress` every frame and `setActive` on beat
 * changes through the ref, so nothing re-renders while scrolling.
 *
 * Desktop (≥1024): fixed at the right edge — a rolling day counter, seven
 * jump buttons on a 1px track whose fill scales with progress, and the skip
 * link. Below 1024: a 2px segmented bar under the header with "Day n/7".
 */

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { gsap } from "@/lib/motion/gsap";
import styles from "./DayRail.module.css";

export interface DayRailTick {
  label: string;
  day: string;
}

export interface DayRailHandle {
  /** 0…1 through the week. Under reduced motion it snaps to whole days. */
  setProgress(p: number): void;
  /** Index into `ticks`. Rolls the day number (instant under reduced motion). */
  setActive(i: number): void;
}

export interface DayRailProps {
  ref?: Ref<DayRailHandle>;
  ticks: DayRailTick[];
  onJump: (index: number) => void;
  skipHref: string;
  skipLabel: string;
  tone: "ink" | "paper";
  visible: boolean;
}

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/** "D3" → "3", "3" → "3"; falls back to the 1-based position. */
function dayNumber(tick: DayRailTick | undefined, index: number): string {
  const digits = tick?.day.replace(/\D+/g, "");
  return digits || String(index + 1);
}

type Roller = { front: HTMLSpanElement; back: HTMLSpanElement };

function makeRoller(box: HTMLElement | null): Roller | null {
  if (!box) return null;
  const [front, back] = Array.from(box.children) as HTMLSpanElement[];
  if (!front || !back) return null;
  gsap.set(front, { y: 0, yPercent: 0 });
  gsap.set(back, { y: 0, yPercent: 100 });
  return { front, back };
}

function roll(r: Roller | null, text: string, reduced: boolean) {
  if (!r) return;
  gsap.killTweensOf([r.front, r.back]);
  if (reduced) {
    r.front.textContent = text;
    gsap.set(r.front, { yPercent: 0 });
    gsap.set(r.back, { yPercent: 100 });
    return;
  }
  const incoming = r.back;
  const outgoing = r.front;
  incoming.textContent = text;
  gsap.fromTo(incoming, { yPercent: 100 }, { yPercent: 0, duration: 0.3, ease: "studio-out" });
  gsap.to(outgoing, { yPercent: -100, duration: 0.2, ease: "studio-out" });
  r.front = incoming;
  r.back = outgoing;
}

export default function DayRail({ ref, ticks, onJump, skipHref, skipLabel, tone, visible }: DayRailProps) {
  const fillRef = useRef<HTMLSpanElement>(null);
  const barFillRef = useRef<HTMLSpanElement>(null);
  const deskRollRef = useRef<HTMLSpanElement>(null);
  const mobRollRef = useRef<HTMLSpanElement>(null);
  const ticksRef = useRef<HTMLOListElement>(null);

  const state = useRef({
    active: -1,
    setFill: null as null | ((v: number) => void),
    setBar: null as null | ((v: number) => void),
    desk: null as Roller | null,
    mob: null as Roller | null,
    reduceMq: null as MediaQueryList | null,
  });

  useEffect(() => {
    const s = state.current;
    s.setFill = fillRef.current ? (gsap.quickSetter(fillRef.current, "scaleY") as (v: number) => void) : null;
    s.setBar = barFillRef.current ? (gsap.quickSetter(barFillRef.current, "scaleX") as (v: number) => void) : null;
    s.desk = makeRoller(deskRollRef.current);
    s.mob = makeRoller(mobRollRef.current);
    s.reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    return () => {
      if (s.desk) gsap.killTweensOf([s.desk.front, s.desk.back]);
      if (s.mob) gsap.killTweensOf([s.mob.front, s.mob.back]);
      s.setFill = null;
      s.setBar = null;
      s.desk = null;
      s.mob = null;
    };
  }, []);

  const count = Math.max(1, ticks.length);
  const ticksLive = useRef(ticks);
  useEffect(() => {
    ticksLive.current = ticks;
  }, [ticks]);

  useImperativeHandle(
    ref,
    () => ({
      setProgress(p: number) {
        const s = state.current;
        let v = Math.max(0, Math.min(1, Number.isFinite(p) ? p : 0));
        if (s.reduceMq?.matches) v = Math.ceil(v * count - 1e-6) / count;
        s.setFill?.(v);
        s.setBar?.(v);
      },
      setActive(i: number) {
        const s = state.current;
        const list = ticksLive.current;
        const next = Math.max(0, Math.min(list.length - 1, Math.round(i)));
        if (next === s.active) return;
        s.active = next;
        const buttons = ticksRef.current?.querySelectorAll<HTMLButtonElement>("button[data-tick]");
        buttons?.forEach((b, idx) => {
          if (idx === next) b.setAttribute("aria-current", "step");
          else b.removeAttribute("aria-current");
        });
        const text = dayNumber(list[next], next);
        const reduced = !!s.reduceMq?.matches;
        roll(s.desk, text, reduced);
        roll(s.mob, text, reduced);
      },
    }),
    [count],
  );

  const first = dayNumber(ticks[0], 0);
  const railClass = cx(styles.rail, tone === "paper" && styles.paper, visible && styles.visible);

  return (
    <>
      <nav className={cx(railClass, styles.desk)} aria-label="Week progress" inert={!visible}>
        <div className={styles.counter} aria-hidden="true">
          <span className={styles.counterCaption}>Day</span>
          <span className={styles.num}>
            <span className={styles.roll} ref={deskRollRef}>
              <span>{first}</span>
              <span />
            </span>
            <span className={styles.counterCaption}>/{count}</span>
          </span>
        </div>
        <div className={styles.ticks}>
          <span className={styles.track} aria-hidden="true" />
          <span className={styles.fill} ref={fillRef} aria-hidden="true" />
          <ol className={styles.tickList} ref={ticksRef}>
          {ticks.map((tick, i) => {
            const n = dayNumber(tick, i);
            return (
              <li key={`${tick.day}-${i}`}>
                <button
                  type="button"
                  data-tick={i}
                  className={styles.tick}
                  aria-label={`Jump to day ${n}`}
                  onClick={() => onJump(i)}
                >
                  <span className={styles.tip} aria-hidden="true">
                    Day {n} · {tick.label}
                  </span>
                  <span className={styles.tickMark} aria-hidden="true" />
                </button>
              </li>
            );
          })}
          </ol>
        </div>
        <a className={styles.skip} href={skipHref}>
          {skipLabel}
        </a>
      </nav>

      <div className={cx(railClass, styles.mob)} aria-hidden="true">
        <span className={styles.bar}>
          <span className={styles.barFill} ref={barFillRef} />
        </span>
        <span className={styles.mobLabel}>
          <span>Day</span>
          <span className={styles.num}>
            <span className={styles.roll} ref={mobRollRef}>
              <span>{first}</span>
              <span />
            </span>
            /{count}
          </span>
        </span>
      </div>
    </>
  );
}

export { DayRail };
