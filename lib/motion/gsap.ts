"use client";

/**
 * Single place where GSAP and its plugins are registered. Every animated
 * component imports from here, so plugins register exactly once and the
 * custom eases are shared. GSAP 3.13+ ships all former Club plugins free.
 *
 * Deliberately NOT registered: Flip, Observer, MorphSVG, ScrambleText, Inertia
 * (unused — import and register locally if a section needs one) and
 * ScrollSmoother — Lenis owns the scroll, and the two must never run together.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(
    ScrollTrigger,
    SplitText,
    CustomEase,
    DrawSVGPlugin,
    useGSAP,
  );

  // House curves — one vocabulary for the whole site. Mirrored in
  // app/globals.css @theme as --ease-studio-*, so CSS and GSAP agree.
  CustomEase.create("studio-out", "0.16, 1, 0.3, 1"); // long, confident settle
  CustomEase.create("studio-in-out", "0.76, 0, 0.24, 1"); // scene changes
  CustomEase.create("studio-snap", "0.2, 0.9, 0.1, 1"); // UI feedback
  CustomEase.create("studio-drawer", "0.32, 0.72, 0, 1"); // mobile sheet

  // Reveal-scale default. Control tweens (hover, press, drag settle) must
  // pass their own shorter duration.
  gsap.defaults({ ease: "studio-out", duration: 0.9 });
}

/** Ease names, so call sites never mistype a string. */
export const EASE = {
  out: "studio-out",
  inOut: "studio-in-out",
  snap: "studio-snap",
  drawer: "studio-drawer",
} as const;

/** The media queries every motion decision branches on. */
export const MQ = {
  ok: "(prefers-reduced-motion: no-preference)",
  reduce: "(prefers-reduced-motion: reduce)",
  desktop: "(min-width: 1024px)",
  fine: "(hover: hover) and (pointer: fine)",
} as const;

export type MotionConditions = Record<keyof typeof MQ, boolean>;

/**
 * gsap.matchMedia() keyed by MQ. `fn` receives which queries match and runs
 * again (after reverting everything it created) whenever one flips. Use it
 * inside useGSAP and return `() => mm.revert()`.
 *
 *   useGSAP(() => {
 *     const mm = motionMedia(({ ok, desktop }) => { … });
 *     return () => mm.revert();
 *   }, { scope: ref });
 */
export function motionMedia(
  fn: (c: MotionConditions) => void | (() => void),
): gsap.MatchMedia {
  const mm = gsap.matchMedia();
  mm.add(MQ, (ctx) => fn(ctx.conditions as MotionConditions));
  return mm;
}

/**
 * Cubic in-out as a plain function — the closest closed form to
 * studio-in-out, used as the Lenis scrollTo easing (Lenis cannot read
 * GSAP's CustomEase).
 */
export const easeInOutFn = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** True when the visitor asked the OS for less motion. Safe on the server. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Reveal from-states use opacity only — never autoAlpha/visibility — so the
 * content stays in the accessibility tree and the tab order before it is
 * revealed. This finishes the reveal the moment focus lands inside `trigger`,
 * so a focused control is never invisible. Returns the cleanup.
 */
export function finishOnFocus(trigger: Element, anim: gsap.core.Animation): () => void {
  const finish = () => {
    anim.progress(1);
  };
  trigger.addEventListener("focusin", finish, { once: true });
  return () => trigger.removeEventListener("focusin", finish);
}

export {
  gsap,
  ScrollTrigger,
  SplitText,
  CustomEase,
  DrawSVGPlugin,
  useGSAP,
};
