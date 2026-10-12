"use client";

/**
 * One stage of the visitor's sketch, drawn once into a canvas that fills
 * its parent (the screen of a CssPane). The sketch's own address bar is
 * cropped off, because the pane around it already has one.
 *
 * Draws lazily — only when the card is near the viewport — and again when
 * the name, sector, AI copy or size changes.
 */

import { useEffect, useRef } from "react";
import {
  drawSketch,
  ensureSketchFonts,
  getSketchLayout,
  type SketchCopy,
  type SketchStage,
} from "@/lib/showcase/sketch";
import type { Sector } from "@/lib/showcase/visitor";

export interface StillInput {
  name: string;
  display: string;
  domain: string;
  sector: Sector;
  copy?: SketchCopy | null;
}

/** Design-px geometry of the visible (cropped) part of a desktop sketch. */
export const STILL_VIEW = { x: 27.2, y: 34, w: 969.6, h: 606 } as const;

export default function SketchStill({
  input,
  stage,
  className,
}: {
  input: StillInput;
  stage: SketchStage;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { name, display, domain, sector, copy } = input;

  useEffect(() => {
    const c = ref.current;
    const parent = c?.parentElement;
    if (!c || !parent) return;
    let seen = false;
    let alive = true;
    let lastKey = "";

    const draw = () => {
      if (!alive || !seen) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const key = `${w}x${h}@${dpr}`;
      if (key === lastKey) return;
      lastKey = key;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      const ctx = c.getContext("2d");
      if (!ctx) return;
      // Scale so the sketch below its address bar fills the height, then
      // centre it (a sliver of side margin is cropped).
      const chrome = getSketchLayout(sector, "desktop").find((b) => b.id === "chrome");
      const chromeH = chrome ? chrome.h * 640 : 34;
      const s = h / (640 - chromeH);
      const sw = 1024 * s;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.translate(-(sw - w) / 2, -chromeH * s);
      drawSketch(ctx, sw, 640 * s, {
        name,
        display,
        domain,
        sector,
        stage,
        layout: "desktop",
        progress: 1,
        copy: copy ?? undefined,
      });
    };

    let idle = 0;
    const later = (fn: () => void) => {
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(fn, { timeout: 600 });
      } else {
        idle = window.setTimeout(fn, 60);
      }
    };
    // Drawn ahead of arrival, in idle time, so a card never paints mid-swipe.
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || seen) return;
        seen = true;
        ensureSketchFonts(display).then(() => later(draw));
      },
      { rootMargin: "120% 0px" },
    );
    io.observe(parent);
    const ro = new ResizeObserver(() => draw());
    ro.observe(parent);
    return () => {
      alive = false;
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
      window.clearTimeout(idle);
      io.disconnect();
      ro.disconnect();
    };
  }, [name, display, domain, sector, copy, stage]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

export { SketchStill };
