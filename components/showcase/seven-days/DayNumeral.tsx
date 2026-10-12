"use client";

/**
 * The big day numeral. Its Literata weight follows the week continuously
 * (day 1 = 200 … day 7 = 800, through a CSS variable); on a whole-day change
 * the digit rolls through a mask — up when scrolling forward, down when
 * going back. Decorative: the captions and the rail carry the day in text.
 */

import { useImperativeHandle, useRef, type Ref } from "react";
import { gsap } from "@/lib/motion/gsap";
import { weightForDay } from "./model";
import styles from "./SevenDays.module.css";

export interface DayNumeralHandle {
  /** Continuous day 1..7. */
  set(day: number, reduced?: boolean): void;
}

interface Props {
  ref?: Ref<DayNumeralHandle>;
  /** Static render (cards): the digit and its weight. */
  day?: number;
  weight?: number;
  className?: string;
}

export default function DayNumeral({ ref, day = 1, weight, className }: Props) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const aRef = useRef<HTMLSpanElement>(null);
  const bRef = useRef<HTMLSpanElement>(null);
  const st = useRef({ shown: day, front: 0, w: -1 });

  useImperativeHandle(
    ref,
    () => ({
      set(d: number, reduced = false) {
        const root = rootRef.current;
        const a = aRef.current;
        const b = bRef.current;
        if (!root || !a || !b) return;
        const s = st.current;
        const w = Math.round(weightForDay(d));
        if (w !== s.w) {
          s.w = w;
          root.style.setProperty("--wght", String(w));
        }
        const whole = Math.max(1, Math.min(7, Math.floor(d + 1e-6)));
        if (whole === s.shown) return;
        const forward = whole > s.shown;
        s.shown = whole;
        const front = s.front === 0 ? a : b;
        const back = s.front === 0 ? b : a;
        back.textContent = String(whole);
        gsap.killTweensOf([front, back]);
        if (reduced) {
          gsap.set(back, { yPercent: 0, autoAlpha: 1 });
          gsap.set(front, { yPercent: 125, autoAlpha: 0 });
        } else {
          gsap.fromTo(
            back,
            { yPercent: forward ? 125 : -125, autoAlpha: 1 },
            { yPercent: 0, duration: 0.35, ease: "studio-in-out" },
          );
          gsap.to(front, {
            yPercent: forward ? -125 : 125,
            duration: 0.3,
            ease: "studio-in-out",
            onComplete: () => {
              gsap.set(front, { autoAlpha: 0 });
            },
          });
        }
        s.front = s.front === 0 ? 1 : 0;
      },
    }),
    [],
  );

  const style = weight ? ({ "--wght": weight } as React.CSSProperties) : undefined;
  return (
    <span ref={rootRef} className={`${styles.numeral} ${className ?? ""}`} style={style} aria-hidden="true">
      <span className={styles.numeralCap}>Day</span>
      <span className={styles.numeralMask}>
        <span ref={aRef} className={styles.numeralDigit}>
          {day}
        </span>
        <span ref={bRef} className={`${styles.numeralDigit} ${styles.numeralBack}`} />
      </span>
    </span>
  );
}

export { DayNumeral };
