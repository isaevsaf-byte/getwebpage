"use client";

/**
 * The Day-4 annotation: a hand-drawn oxblood loop around the headline plus
 * an arrow — the client's red pen on the preview.
 *
 * - `mode="live"` (desktop stage): positioned over the projected headline
 *   rect by `place(rect)`; `progress(t)` draws it (scrubbed); `fade(o)`
 *   takes it away once the revision has landed.
 * - `mode="static"`: fully drawn inside a fixed viewBox (mobile cards,
 *   reduced motion). Pass the headline rect in that viewBox's units.
 */

import { useImperativeHandle, useMemo, useRef, type Ref } from "react";
import styles from "./SevenDays.module.css";

export interface AnnotRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AnnotationHandle {
  place(rect: AnnotRect | null): void;
  progress(t: number): void;
  fade(o: number): void;
}

interface Paths {
  loop: string;
  arrow: string;
  head: string;
  box: { x: number; y: number; w: number; h: number };
}

/** Deterministic hand-drawn geometry for a rect, in the rect's own units. */
export function annotationPaths(r: AnnotRect, unit = 1): Paths {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const padX = Math.max(10 * unit, r.w * 0.06);
  const padY = Math.max(10 * unit, r.h * 0.16);
  const rx = r.w / 2 + padX;
  const ry = r.h / 2 + padY;
  const tilt = (-3 * Math.PI) / 180;
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);

  // The loop: starts upper-left, goes round once and overshoots, drifting
  // outward a little like a quick marker stroke.
  const N = 72;
  const start = -2.55;
  const sweep = Math.PI * 2 + 0.5;
  const pts: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const th = start + sweep * u;
    const wob = 1 + 0.022 * Math.sin(3 * th + 0.7) + 0.012 * Math.sin(5 * th + 1.9);
    const drift = 1 + 0.07 * u * u;
    const ex = Math.cos(th) * rx * wob * drift;
    const ey = Math.sin(th) * ry * wob * drift * (1 - 0.04 * u);
    pts.push([cx + ex * cosT - ey * sinT, cy + ex * sinT + ey * cosT]);
  }
  let loop = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    loop += ` Q${x.toFixed(1)} ${y.toFixed(1)} ${((x + nx) / 2).toFixed(1)} ${((y + ny) / 2).toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  loop += ` L${last[0].toFixed(1)} ${last[1].toFixed(1)}`;

  // The arrow comes in from below-right and stops just short of the loop.
  const ta = 0.95; // radians, lower right
  const tip: [number, number] = [cx + Math.cos(ta) * rx * 1.1, cy + Math.sin(ta) * ry * 1.1 + 6 * unit];
  const len = Math.max(64 * unit, Math.min(120 * unit, r.w * 0.28));
  const tail: [number, number] = [tip[0] + len * 0.78, tip[1] + len * 0.62];
  const ctrl: [number, number] = [tail[0] - len * 0.05, tip[1] + len * 0.08];
  const arrow = `M${tail[0].toFixed(1)} ${tail[1].toFixed(1)} Q${ctrl[0].toFixed(1)} ${ctrl[1].toFixed(1)} ${tip[0].toFixed(1)} ${tip[1].toFixed(1)}`;

  // Arrowhead: two strokes back along the incoming tangent.
  const ang = Math.atan2(tip[1] - ctrl[1], tip[0] - ctrl[0]);
  const hl = 13 * unit;
  const h1: [number, number] = [tip[0] - Math.cos(ang - 0.5) * hl, tip[1] - Math.sin(ang - 0.5) * hl];
  const h2: [number, number] = [tip[0] - Math.cos(ang + 0.5) * hl, tip[1] - Math.sin(ang + 0.5) * hl];
  const head = `M${h1[0].toFixed(1)} ${h1[1].toFixed(1)} L${tip[0].toFixed(1)} ${tip[1].toFixed(1)} L${h2[0].toFixed(1)} ${h2[1].toFixed(1)}`;

  const minX = Math.min(cx - rx * 1.12, tip[0]) - 8 * unit;
  const minY = cy - ry * 1.12 - 8 * unit;
  const maxX = Math.max(cx + rx * 1.12, tail[0]) + 8 * unit;
  const maxY = Math.max(cy + ry * 1.12, tail[1]) + 8 * unit;
  return { loop, arrow, head, box: { x: minX, y: minY, w: maxX - minX, h: maxY - minY } };
}

interface LiveProps {
  mode: "live";
  ref?: Ref<AnnotationHandle>;
  className?: string;
}

interface StaticProps {
  mode: "static";
  /** viewBox of the parent coordinate space, e.g. "0 0 1024 606". */
  viewBox: string;
  rect: AnnotRect;
  className?: string;
}

export default function Annotation(props: LiveProps | StaticProps) {
  if (props.mode === "static") return <StaticAnnotation {...props} />;
  return <LiveAnnotation {...props} />;
}

function StaticAnnotation({ viewBox, rect, className }: StaticProps) {
  const p = useMemo(() => annotationPaths(rect, 1.4), [rect]);
  return (
    <svg
      className={`${styles.annotStatic} ${className ?? ""}`}
      viewBox={viewBox}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d={p.loop} />
      <path d={p.arrow} />
      <path d={p.head} />
    </svg>
  );
}

function LiveAnnotation({ ref, className }: LiveProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const loopRef = useRef<SVGPathElement>(null);
  const arrowRef = useRef<SVGPathElement>(null);
  const headRef = useRef<SVGPathElement>(null);
  const lens = useRef({ loop: 0, arrow: 0, head: 0, t: -1, placed: false, o: 1 });

  useImperativeHandle(
    ref,
    () => {
      const draw = (el: SVGPathElement | null, len: number, f: number) => {
        if (!el) return;
        const v = Math.max(0, Math.min(1, f));
        el.style.strokeDasharray = `${len.toFixed(1)} ${(len + 2).toFixed(1)}`;
        el.style.strokeDashoffset = (len * (1 - v)).toFixed(1);
        el.style.visibility = v > 0 ? "visible" : "hidden";
      };
      const render = () => {
        const s = lens.current;
        const t = Math.max(0, s.t);
        draw(loopRef.current, s.loop, t / 0.72);
        draw(arrowRef.current, s.arrow, (t - 0.72) / 0.18);
        draw(headRef.current, s.head, (t - 0.9) / 0.1);
      };
      return {
        place(rect) {
          const svg = svgRef.current;
          if (!svg) return;
          if (!rect) {
            lens.current.placed = false;
            svg.style.visibility = "hidden";
            return;
          }
          const p = annotationPaths(rect);
          svg.style.left = `${p.box.x}px`;
          svg.style.top = `${p.box.y}px`;
          svg.style.width = `${p.box.w}px`;
          svg.style.height = `${p.box.h}px`;
          svg.setAttribute("viewBox", `${p.box.x} ${p.box.y} ${p.box.w} ${p.box.h}`);
          loopRef.current?.setAttribute("d", p.loop);
          arrowRef.current?.setAttribute("d", p.arrow);
          headRef.current?.setAttribute("d", p.head);
          const s = lens.current;
          s.loop = loopRef.current?.getTotalLength() ?? 0;
          s.arrow = arrowRef.current?.getTotalLength() ?? 0;
          s.head = headRef.current?.getTotalLength() ?? 0;
          s.placed = true;
          svg.style.visibility = "visible";
          render();
        },
        progress(t) {
          const s = lens.current;
          if (Math.abs(t - s.t) < 1e-4) return;
          s.t = t;
          if (s.placed) render();
        },
        fade(o) {
          const s = lens.current;
          if (Math.abs(o - s.o) < 1e-3) return;
          s.o = o;
          if (svgRef.current) svgRef.current.style.opacity = o.toFixed(3);
        },
      };
    },
    [],
  );

  return (
    <svg ref={svgRef} className={`${styles.annotLive} ${className ?? ""}`} aria-hidden="true" focusable="false">
      <path ref={loopRef} />
      <path ref={arrowRef} />
      <path ref={headRef} />
    </svg>
  );
}

export { Annotation };
