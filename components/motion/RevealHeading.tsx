"use client";

import { useRef, type ReactNode } from "react";
import { gsap, SplitText, useGSAP, motionMedia } from "@/lib/motion/gsap";

type Props = {
  as?: "h1" | "h2" | "h3";
  id?: string;
  className?: string;
  children: ReactNode;
  /** ScrollTrigger start. Fires once. */
  start?: string;
};

/**
 * Display heading whose lines rise out of masks (800ms studio-out, 60ms
 * stagger) the first time it scrolls into view. NEVER use above the fold:
 * the server renders the final text, and hiding it would cost LCP.
 *
 * - Splits only after document.fonts.ready, so line breaks are final.
 * - When the reveal finishes the split is reverted: plain text again, which
 *   keeps resizes and screen readers simple.
 * - Reduced motion and no-JS: plain text, never split.
 */
export default function RevealHeading({
  as = "h2",
  id,
  className,
  children,
  start = "top 85%",
}: Props) {
  const ref = useRef<HTMLHeadingElement>(null);
  const done = useRef(false);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const mm = motionMedia(({ ok }) => {
        if (!ok || done.current) return;

        let live = true;
        let split: SplitText | null = null;
        let anim: gsap.core.Tween | null = null;

        const fontsReady: Promise<unknown> = document.fonts?.ready ?? Promise.resolve();
        fontsReady.then(() => {
          if (!live || done.current) return;
          split = SplitText.create(el, {
            type: "lines",
            mask: "lines",
            linesClass: "rh-line",
            autoSplit: true,
            aria: "auto",
            onSplit: (s) => {
              anim = gsap.from(s.lines, {
                yPercent: 110,
                duration: 0.8,
                stagger: 0.06,
                ease: "studio-out",
                scrollTrigger: { trigger: el, start, once: true },
                onComplete: () => {
                  done.current = true;
                  s.revert();
                },
              });
              // Returned so autoSplit carries progress across re-splits.
              return anim;
            },
          });
        });

        return () => {
          live = false;
          anim?.scrollTrigger?.kill();
          split?.revert();
        };
      });

      return () => mm.revert();
    },
    { scope: ref, dependencies: [start] },
  );

  const Tag = as;
  return (
    <Tag ref={ref} id={id} className={className}>
      {children}
    </Tag>
  );
}
