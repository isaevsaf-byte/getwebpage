"use client";

import { useRef, type JSX, type ReactNode } from "react";
import { gsap, useGSAP, motionMedia, finishOnFocus } from "@/lib/motion/gsap";

type Props = {
  as?: keyof JSX.IntrinsicElements;
  /** Rise distance in px (motion allowed only). */
  y?: number;
  /** Seconds between targets when `selector` matches several. */
  stagger?: number;
  /** Animate these descendants instead of the wrapper itself. */
  selector?: string;
  delay?: number;
  className?: string;
  children: ReactNode;
};

/**
 * The quiet default reveal: fade + 20px rise, 650ms studio-out, once, when
 * the block reaches 85% of the viewport.
 *
 * The hidden from-state is applied by JS when the trigger is created, never
 * by CSS, so without JS everything is simply visible. It is opacity only, so
 * the content stays tabbable and in the accessibility tree; focus landing
 * inside finishes the reveal at once. Reduced motion renders final.
 */
export default function Reveal({
  as = "div",
  y = 20,
  stagger = 0,
  selector,
  delay = 0,
  className,
  children,
}: Props) {
  // Typed as a div for JSX; at runtime it is whatever `as` renders.
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const mm = motionMedia(({ ok }) => {
        // Already revealed: a breakpoint change must not hide it again.
        if (done.current) return;
        const targets = selector ? Array.from(el.querySelectorAll(selector)) : [el];
        if (targets.length === 0) return;

        // Reduced motion: no from-state at all. A short fade buys nothing.
        if (!ok) {
          done.current = true;
          return;
        }

        const tween = gsap.from(targets, {
          opacity: 0,
          y,
          duration: 0.65,
          ease: "studio-out",
          stagger,
          delay,
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
          onComplete: () => {
            done.current = true;
          },
        });
        return finishOnFocus(el, tween);
      });

      return () => mm.revert();
    },
    { scope: ref, dependencies: [selector, y, stagger, delay] },
  );

  const Tag = as as "div";
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
