"use client";

/**
 * The visitor's sketch on the CSS tier: two stacked 2D canvases drawn by
 * drawSketch, inside a CssPane screen. Used by the desktop poster fan and by
 * the mobile stack.
 *
 * - SSR / no JS: a static inline-SVG wireframe of the default salon sketch.
 * - Typing redraws the front canvas (rAF-throttled).
 * - Sector change: the new sector is drawn into the back canvas and
 *   cross-faded in (200ms).
 * - Commit and Claude's copy: the back canvas is wiped in left→right
 *   (900ms) under the light bar, so the light "writes" the new page.
 * - While Claude writes: the streamed tagline types into the sketch with a
 *   blinking caret, under a scanning light field.
 * - Reduced motion: every change is a 150ms opacity crossfade, no sweeps,
 *   a steady caret.
 *
 * The sketch's own browser chrome is cropped off (the CssPane already has
 * one), so the canvas is scaled by 1 / (1 − 34/640) and anchored bottom.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { drawSketch, ensureSketchFonts, type SketchInput } from "@/lib/showcase/sketch";
import { prefersReducedMotion } from "@/lib/motion/gsap";
import { useSketchModel, useSweep, type SketchModel } from "./heroBus";
import styles from "./SketchScreen.module.css";

type Kind = "direct" | "fade" | "wipe";

interface Props {
  /** Max backing-store size in device pixels (16:10). */
  maxBacking: { w: number; h: number };
  /** Skip all drawing (the WebGL canvas covers this pane). */
  paused?: boolean;
  /** Plays the intro sweep once the first frame is drawn. */
  introSweep?: boolean;
}

const EASE_IN_OUT = "cubic-bezier(0.76, 0, 0.24, 1)";
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const SWEEP_MS: Record<string, number> = { type: 600, sector: 600, commit: 900, ai: 900, intro: 1400 };
const NON_LATIN = /[^\u0000-ɏ -⁯]/;
const CARET = "|";
const NO_CARET = "​"; // zero-width, but not trimmed away → no template fallback

function toInput(m: SketchModel, caret: boolean): SketchInput {
  const v = m.visitor;
  let copy = m.copy ?? undefined;
  if (m.aiWriting) copy = { sub: (m.aiStreamed || "") + (caret ? CARET : NO_CARET) };
  return {
    name: v.name,
    display: v.display,
    domain: v.domain,
    sector: v.sector,
    stage: m.stage,
    layout: "desktop",
    copy,
  };
}

export default function SketchScreen({ maxBacking, paused = false, introSweep = false }: Props) {
  const model = useSketchModel();
  const sweep = useSweep();
  const rootRef = useRef<HTMLDivElement>(null);
  const aRef = useRef<HTMLCanvasElement>(null);
  const bRef = useRef<HTMLCanvasElement>(null);
  const sweepRef = useRef<HTMLSpanElement>(null);
  const [caretTick, setCaretTick] = useState(true);

  // Imperative state — never drives React renders.
  const st = useRef({
    front: 0 as 0 | 1,
    ready: false,
    raf: 0,
    anim: null as Animation | null,
    size: { w: 0, h: 0 },
    last: null as { sector: string; stage: number; copy: unknown } | null,
    input: null as SketchInput | null,
    introPlayed: false,
    drawn: false,
  });

  const canvases = useCallback(() => [aRef.current, bRef.current] as const, []);

  /** Sizes both backing stores to the pane. Returns false while hidden. */
  const fit = useCallback((): boolean => {
    const root = rootRef.current;
    if (!root) return false;
    const cssW = root.clientWidth * 1.0567;
    if (cssW < 2) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(2, Math.min(maxBacking.w, Math.round(cssW * dpr)));
    const h = Math.round(w * 0.625);
    const s = st.current;
    if (s.size.w === w && s.size.h === h) return true;
    s.size = { w, h };
    for (const c of canvases()) {
      if (!c) continue;
      c.width = w;
      c.height = h;
    }
    return true;
  }, [canvases, maxBacking.w]);

  const paint = useCallback((canvas: HTMLCanvasElement | null, input: SketchInput) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawSketch(ctx, canvas.width, canvas.height, input);
  }, []);

  /** Ends a running crossfade/wipe at its final frame. */
  const settle = useCallback(() => {
    const s = st.current;
    if (!s.anim) return;
    const a = s.anim;
    s.anim = null;
    a.finish();
  }, []);

  const setLayers = useCallback(() => {
    const [a, b] = canvases();
    const s = st.current;
    if (!a || !b) return;
    const front = s.front === 0 ? a : b;
    const back = s.front === 0 ? b : a;
    front.dataset.on = "1";
    back.dataset.on = "0";
    front.style.clipPath = "";
    front.style.opacity = "";
    back.style.clipPath = "";
    back.style.opacity = "";
  }, [canvases]);

  // Light-bar sweeps (CSS tier only; none under reduced motion).
  const playSweep = useCallback((kind: string) => {
    const el = sweepRef.current;
    if (!el || prefersReducedMotion()) return;
    el.getAnimations().forEach((a) => a.cancel());
    el.animate(
      [
        { transform: "translateX(0%) skewX(-14deg)", opacity: 0 },
        { opacity: 1, offset: 0.12 },
        { opacity: 1, offset: 0.86 },
        { transform: "translateX(250%) skewX(-14deg)", opacity: 0 },
      ],
      { duration: SWEEP_MS[kind] ?? 600, easing: EASE_IN_OUT },
    );
  }, []);

  /** First frame is on screen: reveal the canvases over the wireframe. */
  const paintBoth = useCallback(() => {
    const s = st.current;
    if (!s.input || !fit()) return false;
    const [a, b] = canvases();
    paint(a, s.input);
    paint(b, s.input);
    if (!s.drawn) {
      s.drawn = true;
      if (rootRef.current) rootRef.current.dataset.drawn = "1";
      if (introSweep && !paused && !s.introPlayed) {
        s.introPlayed = true;
        window.setTimeout(() => playSweep("intro"), 160);
      }
    }
    return true;
  }, [canvases, fit, paint, introSweep, paused, playSweep]);

  const run = useCallback(
    (kind: Kind) => {
      const s = st.current;
      if (!s.ready || !s.input || paused) return;
      if (!fit()) return;
      const [a, b] = canvases();
      if (!a || !b) return;

      if (kind === "direct") {
        if (s.raf) return;
        s.raf = requestAnimationFrame(() => {
          s.raf = 0;
          if (!s.input) return;
          if (s.anim) settle();
          paint(s.front === 0 ? a : b, s.input);
        });
        return;
      }

      settle();
      if (s.raf) {
        cancelAnimationFrame(s.raf);
        s.raf = 0;
      }
      const incoming = s.front === 0 ? b : a;
      paint(incoming, s.input);
      incoming.dataset.on = "2"; // on top, being revealed
      const reduce = prefersReducedMotion();
      const anim =
        kind === "wipe" && !reduce
          ? incoming.animate(
              [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" }],
              { duration: 900, easing: EASE_IN_OUT },
            )
          : incoming.animate([{ opacity: 0 }, { opacity: 1 }], {
              duration: reduce ? 150 : 200,
              easing: EASE_OUT,
            });
      s.anim = anim;
      const done = () => {
        if (s.anim === anim) s.anim = null;
        s.front = s.front === 0 ? 1 : 0;
        setLayers();
        // Keep the hidden canvas in sync so the next crossfade starts clean.
        if (s.input) paint(s.front === 0 ? b : a, s.input);
      };
      anim.addEventListener("finish", done, { once: true });
    },
    [canvases, fit, paint, paused, settle, setLayers],
  );

  // Fonts first, then the first frame.
  useEffect(() => {
    let live = true;
    ensureSketchFonts().then(() => {
      if (!live) return;
      st.current.ready = true;
      setLayers();
      if (!paused) paintBoth();
    });
    return () => {
      live = false;
    };
    // Fonts load once; later pauses/resumes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Non-Latin names: pull the extra unicode-range subset, then redraw.
  const name = model.visitor.name;
  useEffect(() => {
    if (!name || !NON_LATIN.test(name)) return;
    let live = true;
    ensureSketchFonts(name).then(() => {
      if (live) run("direct");
    });
    return () => {
      live = false;
    };
  }, [name, run]);

  // Blinking caret while Claude writes (steady under reduced motion).
  useEffect(() => {
    if (!model.aiWriting || prefersReducedMotion()) return;
    const id = window.setInterval(() => setCaretTick((c) => !c), 530);
    return () => window.clearInterval(id);
  }, [model.aiWriting]);
  const caret = model.aiWriting ? caretTick : true;

  // Every model change → pick the transition and draw.
  const { visitor, stage, copy, aiWriting, aiStreamed } = model;
  useEffect(() => {
    const s = st.current;
    s.input = toInput({ visitor, stage, copy, aiWriting, aiStreamed }, caret);
    const prev = s.last;
    const next = { sector: visitor.sector, stage, copy };
    s.last = next;
    let kind: Kind = "direct";
    if (prev && s.drawn) {
      if (prev.sector !== next.sector) kind = "fade";
      else if (prev.stage !== next.stage || (prev.copy !== next.copy && next.copy)) kind = "wipe";
    }
    if (!s.ready || paused) return;
    if (!s.drawn) {
      paintBoth();
      return;
    }
    run(kind);
  }, [visitor, stage, copy, aiWriting, aiStreamed, caret, paused, run, paintBoth]);

  // Resize (and becoming visible after a breakpoint change) → redraw both.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const s = st.current;
      if (!s.ready || !s.input || paused) return;
      const before = `${s.size.w}x${s.size.h}`;
      if (!fit()) return;
      if (`${s.size.w}x${s.size.h}` === before && s.drawn) return;
      settle();
      paintBoth();
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, [fit, paused, settle, paintBoth]);

  // Coming back from the WebGL tier: draw what changed while hidden.
  useEffect(() => {
    if (paused) return;
    const s = st.current;
    if (!s.ready) return;
    paintBoth();
  }, [paused, paintBoth]);

  const lastSweep = useRef(sweep.n);
  useEffect(() => {
    if (sweep.n === lastSweep.current) return;
    lastSweep.current = sweep.n;
    if (paused || !st.current.drawn) return;
    playSweep(sweep.kind);
  }, [sweep, paused, playSweep]);

  useEffect(() => {
    const s = st.current;
    return () => {
      if (s.raf) cancelAnimationFrame(s.raf);
      s.anim?.cancel();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-drawn="0"
      data-ai={aiWriting ? "writing" : copy ? "done" : "idle"}
      suppressHydrationWarning
    >
      <SketchPlaceholder />
      <div className={styles.crop}>
        <canvas ref={aRef} className={styles.canvas} data-on="1" aria-hidden="true" />
        <canvas ref={bRef} className={styles.canvas} data-on="0" aria-hidden="true" />
      </div>
      <span className={styles.aiField} aria-hidden="true">
        <span className={styles.aiScan} />
      </span>
      <span className={styles.sweepTrack} aria-hidden="true">
        <span ref={sweepRef} className={styles.sweep} />
      </span>
    </div>
  );
}

/**
 * The default salon sketch as a static wireframe — the server-rendered, no-JS
 * state of the pane (never blank). Cropped like the canvas (chrome off).
 */
export function SketchPlaceholder() {
  const gid = `hero-ph-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      className={styles.placeholder}
      viewBox="0 34 1024 606"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="0" y="34" width="1024" height="606" fill="#f3ece8" />
      <g fill="none" stroke="rgba(42,29,34,0.22)" strokeWidth="1.5">
        <rect x="64" y="150" width="476" height="158" strokeDasharray="6 6" />
        <path d="M588 594V258a186 186 0 0 1 372 0v336z" />
        <path d="M588 594L960 148M960 594L588 148" strokeOpacity="0.5" />
      </g>
      <text
        x="512"
        y="80"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontStyle="italic"
        fontSize="26"
        fill="#2a1d22"
      >
        your business
      </text>
      <g fill="#664f57">
        <rect x="380" y="103" width="62" height="7" rx="3.5" />
        <rect x="462" y="103" width="44" height="7" rx="3.5" />
        <rect x="526" y="103" width="44" height="7" rx="3.5" />
        <rect x="590" y="103" width="36" height="7" rx="3.5" />
      </g>
      <text x="64" y="268" fontFamily="Georgia, serif" fontSize="66" fill="#2a1d22">
        your business
      </text>
      <rect x="64" y="330" width="300" height="10" rx="5" fill="#664f57" opacity="0.7" />
      <rect x="64" y="388" width="200" height="46" rx="23" fill="#8e3f52" />
      <rect x="276" y="388" width="172" height="46" rx="23" fill="none" stroke="#2a1d22" strokeWidth="1.5" />
      <g fill="#2a1d22" opacity="0.75">
        <rect x="64" y="478" width="148" height="1.5" />
        <rect x="228" y="478" width="148" height="1.5" />
        <rect x="392" y="478" width="148" height="1.5" />
        <rect x="64" y="494" width="84" height="9" rx="2" />
        <rect x="228" y="494" width="70" height="9" rx="2" />
        <rect x="392" y="494" width="60" height="9" rx="2" />
      </g>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e6d3cf" />
          <stop offset="1" stopColor="#d9bfc0" />
        </linearGradient>
      </defs>
      <path d="M600 594V262a174 174 0 0 1 348 0v332z" fill={`url(#${gid})`} />
      <rect x="64" y="620" width="896" height="1" fill="rgba(42,29,34,0.16)" />
    </svg>
  );
}
