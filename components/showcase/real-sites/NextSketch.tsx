"use client";

/**
 * The visitor's own sketch, drawn into a pane screen for the dashed
 * "Next project" row. It is the procedural sketch (code, not AI) — the pane
 * that holds it carries the label "Sketch". When the visitor asked Claude to
 * write their copy, that copy is used, exactly as the hero shows it.
 *
 * The sketch renderer draws its own browser chrome; the pane already has one,
 * so the canvas is shifted up by the chrome height and the screen clips it.
 *
 * Draws only once the box comes near the viewport, then again when the
 * name, sector, copy or size change. Nothing runs while it is display:none.
 */

import { useEffect, useRef, useState } from "react";
import { drawSketch, ensureSketchFonts, getSketchLayout } from "@/lib/showcase/sketch";
import { useVisitor } from "@/lib/showcase/visitor";
import { useAiCopy } from "@/lib/showcase/aiCopy";
import { SKETCH_MOBILE_ASPECT as MOBILE_ASPECT } from "./sites";
import styles from "./RealSites.module.css";

export default function NextSketch({ layout }: { layout: "desktop" | "mobile" }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(false);
  const v = useVisitor();
  const ai = useAiCopy();
  const copy =
    ai.status === "done" && ai.copy && ai.forName === v.name && ai.forSector === v.sector
      ? ai.copy
      : undefined;

  // Wait until the box is within half a viewport before doing any work.
  useEffect(() => {
    const box = boxRef.current;
    if (!box || near) return;
    if (typeof IntersectionObserver === "undefined") {
      const id = requestAnimationFrame(() => setNear(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "50% 0px" },
    );
    io.observe(box);
    return () => io.disconnect();
  }, [near]);

  useEffect(() => {
    if (!near) return;
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    let live = true;
    let fontsOk = false;

    const draw = () => {
      if (!live || !fontsOk) return;
      const w = box.clientWidth;
      const h = box.clientHeight;
      if (!(w > 0) || !(h > 0)) return;
      const chrome = getSketchLayout(v.sector, layout).find((b) => b.id === "chrome");
      const ch = chrome ? Math.min(0.2, chrome.y + chrome.h) : 0;
      // Desktop: stretch so the page below the chrome fills the 16:10 screen.
      // Mobile: native aspect, top-cropped like the real phone captures.
      const cssH = layout === "desktop" ? h / (1 - ch) : w * MOBILE_ASPECT;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
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
      box.dataset.drawn = "";
    };

    ensureSketchFonts()
      .catch(() => undefined)
      .then(() => {
        fontsOk = true;
        draw();
      });
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => draw());
      ro.observe(box);
    }
    return () => {
      live = false;
      ro?.disconnect();
    };
  }, [near, v.name, v.display, v.domain, v.sector, copy, layout]);

  return (
    <div ref={boxRef} className={styles.sketchBox}>
      <canvas ref={canvasRef} className={styles.sketchCanvas} data-sketch-canvas="" />
    </div>
  );
}
