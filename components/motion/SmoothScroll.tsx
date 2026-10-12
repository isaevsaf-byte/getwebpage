"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ReactLenis, useLenis } from "lenis/react";
import "lenis/dist/lenis.css";
import {
  gsap,
  ScrollTrigger,
  easeInOutFn,
  prefersReducedMotion,
} from "@/lib/motion/gsap";

/** Room for the fixed site header when landing on a section. */
const HEADER_OFFSET = -72;

/**
 * Lenis smooth scrolling for the wheel, driven by GSAP's ticker so
 * ScrollTrigger and Lenis read the same frame.
 *
 * - Touch stays native (syncTouch off) — iOS momentum is better than ours.
 * - Reduced motion: wheel smoothing is never switched on, and Lenis's own
 *   respectReducedMotion makes programmatic scrolls instant.
 * - Anchor links are not hijacked; in-page jumps go through useScrollTo(),
 *   which knows about the header offset and moves focus.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        autoRaf: false,
        lerp: 0.1,
        // Options are read once, client-side, when Lenis is created — so this
        // is safe to compute during render without a hydration mismatch.
        smoothWheel: !prefersReducedMotion(),
        syncTouch: false,
        anchors: false,
        stopInertiaOnNavigate: true,
      }}
    >
      <LenisBridge />
      {children}
    </ReactLenis>
  );
}

/** Wires Lenis to GSAP and to the router. Renders nothing. */
function LenisBridge() {
  const lenis = useLenis();
  const pathname = usePathname();
  const lastPath = useRef(pathname);
  const fromHistory = useRef(false);

  // One clock: GSAP's ticker drives Lenis, Lenis scroll drives ScrollTrigger.
  useEffect(() => {
    if (!lenis) return;
    const onScroll = () => ScrollTrigger.update();
    const tick = (time: number) => lenis.raf(time * 1000);
    lenis.on("scroll", onScroll);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      lenis.off("scroll", onScroll);
      gsap.ticker.remove(tick);
    };
  }, [lenis]);

  // Back/forward: leave the browser's restored position alone.
  useEffect(() => {
    const onPop = () => {
      fromHistory.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // New page → top, with no inertia carried over from the old one.
  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;
    const restoring = fromHistory.current;
    fromHistory.current = false;
    if (restoring || window.location.hash) return;
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname, lenis]);

  // Webfonts change line breaks, so trigger positions move once they land.
  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => {
      if (live) ScrollTrigger.refresh();
    });
    return () => {
      live = false;
    };
  }, []);

  return null;
}

/** The section's own heading, or the element itself. */
function focusTarget(el: HTMLElement): HTMLElement {
  if (/^H[1-6]$/.test(el.tagName)) return el;
  return el.querySelector<HTMLElement>("h1, h2, h3") ?? el;
}

function moveFocus(el: HTMLElement) {
  const target = focusTarget(el);
  if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
  target.focus({ preventScroll: true });
}

/**
 * In-page scroll with the header offset. Smooth (1.1s, in-out) through Lenis
 * when motion is allowed; an instant jump otherwise. Afterwards focus moves to
 * the section heading so keyboard and screen-reader users land there too.
 *
 *   const scrollTo = useScrollTo();
 *   <button onClick={() => scrollTo("#pricing")}>See prices</button>
 */
export function useScrollTo(): (
  target: string | HTMLElement,
  opts?: { offset?: number },
) => void {
  const lenis = useLenis();

  return useCallback(
    (target: string | HTMLElement, opts?: { offset?: number }) => {
      const el =
        typeof target === "string"
          ? document.querySelector<HTMLElement>(target)
          : target;
      if (!el) return;
      const offset = opts?.offset ?? HEADER_OFFSET;

      if (lenis && !prefersReducedMotion()) {
        lenis.scrollTo(el, {
          duration: 1.1,
          easing: easeInOutFn,
          offset,
          onComplete: () => moveFocus(el),
        });
        return;
      }

      el.scrollIntoView({ behavior: "instant", block: "start" });
      window.scrollBy({ top: offset, behavior: "instant" });
      moveFocus(el);
    },
    [lenis],
  );
}
