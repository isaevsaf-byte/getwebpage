"use client";

/**
 * Single place where GSAP and its plugins are registered. Every animated
 * component imports from here, so plugins register exactly once and the
 * custom eases are shared. GSAP 3.13+ ships all former Club plugins free.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Flip } from "gsap/Flip";
import { CustomEase } from "gsap/CustomEase";
import { Observer } from "gsap/Observer";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, Flip, CustomEase, Observer, useGSAP);

  // House curves — one vocabulary for the whole site.
  CustomEase.create("studio-out", "0.16, 1, 0.3, 1"); // long, confident settle
  CustomEase.create("studio-in-out", "0.76, 0, 0.24, 1"); // scene changes
  CustomEase.create("studio-snap", "0.2, 0.9, 0.1, 1"); // UI feedback

  gsap.defaults({ ease: "studio-out", duration: 0.9 });
}

/** True when the visitor asked the OS for less motion. Safe on the server. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export { gsap, ScrollTrigger, SplitText, Flip, CustomEase, Observer, useGSAP };
