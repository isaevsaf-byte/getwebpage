"use client";

/**
 * Front of the Ownership card: the visitor's sketch (stage 4, the procedural
 * renderer — code, not AI), with the AI copywriter's words if they asked for
 * them. The renderer draws its own address bar; the pane already has one, so
 * the canvas is shifted up by that bar and the screen clips it.
 *
 * Draws once the box is near the viewport, then only when the name, sector,
 * copy or size change. A hidden variant (display:none) has no size and never
 * draws. Changing any input clears the canvas only when it is redrawn.
 */

import { useEffect, useRef } from "react";
import { drawSketch, ensureSketchFonts, getSketchLayout } from "@/lib/showcase/sketch";
import type { SketchCopy, SketchLayoutKind } from "@/lib/showcase/sketch";
import type { VisitorState } from "@/lib/showcase/visitor";
import s from "./Ownership.module.css";

/** Backing-store cap: sharp on 2x screens, never a huge bitmap. */
const MAX_BACKING_W = 1280;

type Props = { v: VisitorState; copy?: SketchCopy; layout: SketchLayoutKind };

export default function SketchFace({ v, copy, layout }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    let live = true;
    let fontsOk = false;
    let near = false;
    let last = "";

    const draw = (force: boolean) => {
      if (!live || !fontsOk || !near) return;
      const w = box.clientWidth;
      const h = box.clientHeight;
      if (!(w > 0) || !(h > 0)) return;
      const key = `${w}x${h}`;
      if (!force && key === last) return;
      last = key;
      const chrome = getSketchLayout(v.sector, layout).find((b) => b.id === "chrome");
      const ch = chrome ? Math.min(0.2, chrome.y + chrome.h) : 0;
      // The page below the renderer's own address bar fills the screen exactly.
      const cssH = h / (1 - ch);
      const dpr = Math.min(2, window.devicePixelRatio || 1, MAX_BACKING_W / w);
      const bw = Math.round(w * dpr);
      const bh = Math.round(cssH * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${cssH}px`;
      canvas.style.top = `${(-ch * cssH).toFixed(2)}px`;
      if (canvas.width !== bw) canvas.width = bw;
      if (canvas.height !== bh) canvas.height = bh;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, bw, bh);
      ctx.setTransform(bw / w, 0, 0, bh / cssH, 0, 0);
      drawSketch(ctx, w, cssH, {
        name: v.name,
        display: v.display,
        domain: v.domain,
        sector: v.sector,
        stage: 4,
        layout,
        progress: 1,
        copy,
      });
    };

    ensureSketchFonts(v.name)
      .catch(() => undefined)
      .then(() => {
        fontsOk = true;
        draw(true);
      });

    // Only draw near the viewport: a name typed in the hero, far above,
    // costs nothing here until the visitor scrolls down.
    const io =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => {
              if (!entries.some((e) => e.isIntersecting)) return;
              near = true;
              io?.disconnect();
              draw(true);
            },
            { rootMargin: "60% 0px" },
          );
    if (io) io.observe(box);
    else near = true;

    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => draw(false));
    ro?.observe(box);
    return () => {
      live = false;
      io?.disconnect();
      ro?.disconnect();
    };
  }, [v.name, v.display, v.domain, v.sector, copy, layout]);

  return (
    <div ref={boxRef} className={s.sketchBox}>
      <canvas ref={canvasRef} className={s.sketchCanvas} aria-hidden="true" />
    </div>
  );
}
