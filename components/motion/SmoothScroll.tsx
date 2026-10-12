"use client";

import { useEffect, useRef } from "react";
import { ReactLenis, type LenisRef } from "lenis/react";
import "lenis/dist/lenis.css";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/motion/gsap";

/**
 * Lenis smooth scrolling, driven by GSAP's ticker so ScrollTrigger and Lenis
 * read the same frame. Visitors who prefer reduced motion get native scroll.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const lenis = lenisRef.current?.lenis;
    if (!lenis) return;

    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.off("scroll", onScroll);
      gsap.ticker.remove(tick);
    };
  }, []);

  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{
        autoRaf: false,
        lerp: 0.1,
        // Options are read once, client-side, when Lenis is created — so this
        // is safe to compute here without a hydration mismatch.
        smoothWheel: !prefersReducedMotion(),
        anchors: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}
