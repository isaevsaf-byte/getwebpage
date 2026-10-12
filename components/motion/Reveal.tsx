"use client";

import { useRef, type JSX, type ReactNode } from "react";
import { gsap, useGSAP, motionMedia } from "@/lib/motion/gsap";

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
 * by CSS, so without JS everything is simply visible. Reduced motion keeps a
 * 200ms fade with no movement.
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

        const scrollTrigger = { trigger: el, start: "top 85%", once: true };
        const onComplete = () => {
          done.current = true;
        };

        if (ok) {
          gsap.from(targets, {
            autoAlpha: 0,
            y,
            duration: 0.65,
            ease: "studio-out",
            stagger,
            delay,
            scrollTrigger,
            onComplete,
          });
        } else {
          gsap.from(targets, {
            autoAlpha: 0,
            duration: 0.2,
            ease: "none",
            scrollTrigger,
            onComplete,
          });
        }
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
