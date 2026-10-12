"use client";

/**
 * The visitor's sketch, drawn small into the personal strip's pane. It is the
 * procedural sketch (code, not AI). When the visitor asked Claude to write
 * their copy, that copy is used, exactly as the hero showed it.
 *
 * The renderer draws its own browser chrome; the pane already has one, so the
 * canvas is shifted up by the chrome height and the screen clips it.
 * Drawn once per visitor / copy change (and on resize), never per frame.
 */

import { useEffect, useRef } from "react";
import { drawSketch, ensureSketchFonts, getSketchLayout } from "@/lib/showcase/sketch";
import type { SketchCopy } from "@/lib/showcase/sketch";
import type { VisitorState } from "@/lib/showcase/visitor";
import styles from "./Pricing.module.css";

type Props = {
  visitor: VisitorState;
  copy?: SketchCopy;
};

export default function SketchThumb({ visitor: v, copy }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    let live = true;
    let fontsOk = false;
    let near = false;
    let dirty = true;
    let lastW = 0;
    let lastH = 0;

    const draw = (force: boolean) => {
      if (!live || !fontsOk) return;
      // Far off screen (e.g. the visitor is still typing in the hero): draw later.
      if (!near) {
        dirty = true;
        return;
      }
      const w = box.clientWidth;
      const h = box.clientHeight;
      if (!(w > 0) || !(h > 0)) return;
      if (!force && w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      const chrome = getSketchLayout(v.sector, "desktop").find((b) => b.id === "chrome");
      const ch = chrome ? Math.min(0.2, chrome.y + chrome.h) : 0;
      // Stretch so the page below the renderer's chrome fills the 16:10 screen.
      const cssH = h / (1 - ch);
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
        layout: "desktop",
        progress: 1,
        copy,
      });
      dirty = false;
      box.dataset.drawn = "";
    };

    ensureSketchFonts(v.name)
      .catch(() => undefined)
      .then(() => {
        fontsOk = true;
        draw(true);
      });

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          near = entries.some((e) => e.isIntersecting);
          if (near && dirty) draw(true);
        },
        { rootMargin: "75% 0px" },
      );
      io.observe(box);
    } else {
      near = true;
    }

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => draw(false));
      ro.observe(box);
    }
    return () => {
      live = false;
      io?.disconnect();
      ro?.disconnect();
    };
  }, [v.name, v.display, v.domain, v.sector, copy]);

  return (
    <div ref={boxRef} className={styles.thumbBox}>
      <canvas ref={canvasRef} className={styles.thumbCanvas} aria-hidden="true" />
    </div>
  );
}
