"use client";

/**
 * The CSS-3D lamination model — SevenDays' css3d tier and the poster under
 * the WebGL stage.
 *
 * A glass pane whose screen is the visitor's sketch. Twelve absolutely
 * positioned blocks (one per sketch element) lift off the page, show the
 * design stages on their top faces (crops of one atlas image), get revised,
 * and press flat again when the site goes live. Two laminated walls per
 * block (bottom and right — the sides the camera sees) make them read as
 * solid sheets.
 *
 * Imperative: SevenDays' master timeline calls `apply(store)` on every
 * scroll update. Nothing here re-renders React while scrolling.
 */

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
} from "react";
import { gsap } from "@/lib/motion/gsap";
import {
  drawSketch,
  ensureSketchFonts,
  getSketchLayout,
  sketchVisibleChars,
  type SketchBlockId,
  type SketchCopy,
} from "@/lib/showcase/sketch";
import type { Sector } from "@/lib/showcase/visitor";
import { buildAtlasUrls, revokeAtlas, atlasKey, type AtlasUrls } from "./atlas";
import {
  HINGE_ABOVE,
  P,
  extrudeOf,
  lidAngle,
  lidTan,
  planBlocks,
  revisionOffsets,
  seg,
  type SevenStore,
} from "./model";
import styles from "./SevenDays.module.css";

export interface ModelInput {
  name: string;
  display: string;
  domain: string;
  sector: Sector;
  copy?: SketchCopy | null;
}

export interface ModelHover {
  blockId: SketchBlockId;
  label: string;
  /** CSS px within `host` passed to the model. */
  x: number;
  y: number;
  touch?: boolean;
}

export interface CssModelHandle {
  apply(store: SevenStore): void;
  /** Projected rect of a block's top face, relative to `host`. */
  rectOf(id: SketchBlockId, host: HTMLElement): { x: number; y: number; w: number; h: number } | null;
  /** Plays the light sweep across the screen (site goes live). */
  sweep(): void;
  /** Pane centre relative to `host`, in CSS px. */
  centreOf(host: HTMLElement): { x: number; y: number } | null;
}

interface Props {
  ref?: Ref<CssModelHandle>;
  input: ModelInput;
  /** Hover host: tooltip coordinates are relative to it. */
  hostRef?: React.RefObject<HTMLElement | null>;
  onHover?: (hit: ModelHover | null) => void;
  /** False while the WebGL canvas covers the poster: skip all work. */
  active?: boolean;
  className?: string;
}

/** Wall element base size in px (scaled to the block height). */
const WALL = 100;
/** Pixels the hovered block lifts. */
const HOVER_LIFT = 6;
/** Extrusion scale, as in the scene: depth units × 0.85 of the page width. */
const DEPTH = 0.85;

function fmt(n: number) {
  return Math.abs(n) < 1e-4 ? "0" : n.toFixed(2);
}

export default function CssModel({ ref, input, hostRef, onHover, active = true, className }: Props) {
  const { name, display, domain, sector, copy } = input;
  const blocks = useMemo(() => getSketchLayout(sector, "desktop"), [sector]);
  const plan = useMemo(() => planBlocks(blocks), [blocks]);

  const rootRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const briefRef = useRef<HTMLCanvasElement>(null);
  const chromeRef = useRef<HTMLCanvasElement>(null);
  const sheenRef = useRef<HTMLSpanElement>(null);
  const blockEls = useRef<(HTMLDivElement | null)[]>([]);
  const wallT = useRef<(HTMLSpanElement | null)[]>([]);
  const sockEls = useRef<(HTMLSpanElement | null)[]>([]);
  const lidRef = useRef<HTMLDivElement>(null);
  const wallR = useRef<(HTMLSpanElement | null)[]>([]);

  const [urls, setUrls] = useState<AtlasUrls | null>(null);

  const live = useRef({
    store: null as SevenStore | null,
    w: 0,
    h: 0,
    dpr: 1,
    sw2: "",
    sw3: "",
    phase: "",
    briefChars: -1,
    chromeChars: -1,
    fontsOk: false,
    hover: new Map<SketchBlockId, { v: number }>(),
    hovered: null as SketchBlockId | null,
    input,
    active,
    blocks,
    plan,
    lastTransform: [] as string[],
  });

  /* ── Atlas: redraw on input change, debounced, never mid-scroll ───── */
  const key = atlasKey({ name, display, domain, sector, copy });
  const urlsKey = useRef("");
  useEffect(() => {
    urlsKey.current = urls?.key ?? "";
  }, [urls]);
  useEffect(() => {
    // Only the visible model needs an atlas (not phones, not under WebGL).
    if (!active || urlsKey.current === key) return;
    let cancelled = false;
    let timer = 0;
    let lastScroll = 0;
    let pending: AtlasUrls | null = null;
    const onScroll = () => {
      lastScroll = performance.now();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const run = () => {
      if (cancelled) return;
      if (performance.now() - lastScroll < 140) {
        timer = window.setTimeout(run, 160);
        return;
      }
      buildAtlasUrls({ name, display, domain, sector, copy })
        .then((next) => {
          pending = next;
          // Swapping 36 textured layers costs a frame: only while the page is still.
          const commit = () => {
            if (cancelled) return;
            if (performance.now() - lastScroll < 160) {
              timer = window.setTimeout(commit, 180);
              return;
            }
            pending = null;
            setUrls((prev) => {
              if (prev && prev.key !== next.key) window.setTimeout(() => revokeAtlas(prev), 600);
              return next;
            });
          };
          if (cancelled) {
            revokeAtlas(next);
            pending = null;
            return;
          }
          commit();
        })
        .catch(() => {
          /* the model simply stays on the previous atlas */
        });
    };
    timer = window.setTimeout(run, urlsKey.current ? 120 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      revokeAtlas(pending);
    };
    // The inputs are folded into `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active]);

  useEffect(() => () => setUrls((u) => (revokeAtlas(u), null)), []);

  /* ── Canvases: brief (stage 0) and the address bar (stage 4) ─────── */
  const drawBrief = useCallback((force = false) => {
    const s = live.current;
    const c = briefRef.current;
    if (!c || !s.w || !s.fontsOk) return;
    const t = s.store ? s.store.briefT : 0;
    const inp = s.input;
    const sketch = {
      name: inp.name,
      display: inp.display,
      domain: inp.domain,
      sector: inp.sector,
      stage: 0 as const,
      layout: "desktop" as const,
      progress: t,
      copy: inp.copy ?? undefined,
    };
    const chars = sketchVisibleChars(sketch);
    if (!force && chars === s.briefChars) return;
    s.briefChars = chars;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    ctx.clearRect(0, 0, s.w, s.h);
    drawSketch(ctx, s.w, s.h, sketch);
  }, []);

  const drawChrome = useCallback((force = false) => {
    const s = live.current;
    const c = chromeRef.current;
    const chrome = s.blocks.find((b) => b.id === "chrome");
    if (!c || !s.fontsOk || !chrome) return;
    const t = s.store ? s.store.launchT : 0;
    const inp = s.input;
    const sketch = {
      name: inp.name,
      display: inp.display,
      domain: inp.domain,
      sector: inp.sector,
      stage: 4 as const,
      layout: "desktop" as const,
      progress: t,
      copy: inp.copy ?? undefined,
    };
    const chars = sketchVisibleChars(sketch) + (t >= 1 ? 1000 : 0);
    if (!force && chars === s.chromeChars) return;
    s.chromeChars = chars;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    // Drawn at the atlas's design size so the sector imagery comes from the
    // renderer's cache instead of being regenerated mid-scroll.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    drawSketch(ctx, 1024, 640, sketch);
  }, []);

  const sizeCanvases = useCallback(() => {
    const s = live.current;
    const chrome = s.blocks.find((b) => b.id === "chrome");
    const b = briefRef.current;
    if (b) {
      b.width = Math.max(1, Math.round(s.w * s.dpr));
      b.height = Math.max(1, Math.round(s.h * s.dpr));
    }
    const c = chromeRef.current;
    if (c && chrome) {
      c.width = 1024;
      c.height = Math.max(1, Math.round(640 * chrome.h));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    ensureSketchFonts(display).then(() => {
      if (!alive) return;
      live.current.fontsOk = true;
      drawBrief(true);
      drawChrome(true);
    });
    return () => {
      alive = false;
    };
  }, [display, drawBrief, drawChrome]);

  // Input change → redraw the canvases now (they are cheap, one stage each).
  useEffect(() => {
    drawBrief(true);
    drawChrome(true);
  }, [name, display, domain, sector, copy, drawBrief, drawChrome]);

  /* ── apply(store): the per-frame write ────────────────────────────── */
  const apply = useCallback(
    (store: SevenStore) => {
      const s = live.current;
      s.store = store;
      if (!s.active) return;
      const root = rootRef.current;
      const pane = paneRef.current;
      if (!root || !pane) return;
      const W = s.w || 1;
      const H = s.h || 1;
      const p = store.p;

      // Camera: orbit (azimuth, then elevation) with the scene's slow drift
      // through the design beats, a dolly-in for the narrowing field of view,
      // and the intro rise. Camera above-right ⇒ the pane tips its top and
      // right edges toward us.
      const drift = Math.sin(Math.PI * seg(p, 0.1, 0.55));
      const az = store.az + 3 * drift * (store.az / 35);
      const el = store.el - 2 * drift * (store.el / 28);
      // The narrowing field of view brings the screen toward us — gently, so
      // the squared-up pane still sits inside its column.
      const zoom = 1 + 0.32 * (Math.tan((30 * Math.PI) / 360) / Math.tan((store.fov * Math.PI) / 360) - 1);
      const rise = (1 - store.rise) * 0.42 * H;
      pane.style.transform = `translate3d(0, ${fmt(rise)}px, 0) scale(${zoom.toFixed(4)}) rotateX(${fmt(
        -el,
      )}deg) rotateY(${fmt(-az)}deg)`;
      root.style.setProperty("--persp", `${Math.round((H * 1.05) / Math.tan((store.fov * Math.PI) / 360))}px`);
      root.style.setProperty("--rise", store.rise.toFixed(3));

      // Phase flags (rare changes only).
      const phase = store.briefWipe <= 0 ? "brief" : p >= P.lidClosed ? "flat" : "blocks";
      if (phase !== s.phase) {
        s.phase = phase;
        root.dataset.phase = phase;
      }

      // Stage sweeps: three fixed layers (wireframe, type, colour); type and
      // colour are revealed by diagonal sweeps from the top-left corner.
      const st = Math.max(1, Math.min(3, store.stage));
      const sw2 = (-0.06 + 1.12 * Math.min(1, st - 1)).toFixed(4);
      const sw3 = (-0.06 + 1.12 * Math.max(0, st - 2)).toFixed(4);
      if (sw2 !== s.sw2) {
        s.sw2 = sw2;
        root.style.setProperty("--sw2", sw2);
      }
      if (sw3 !== s.sw3) {
        s.sw3 = sw3;
        root.style.setProperty("--sw3", sw3);
      }
      root.style.setProperty("--img", store.image.toFixed(3));
      root.style.setProperty("--grid", store.grid.toFixed(3));
      root.style.setProperty("--bwp", (-0.06 + 1.12 * store.briefWipe).toFixed(4));
      root.style.setProperty("--chromeLive", p >= P.lidClosed || store.launchT > 0 ? "1" : "0");

      // The laminate sheet: hinged above the page, swings over, presses.
      const lid = lidAngle(p);
      const lidT = lidTan(lid);
      const lidOn = seg(p, P.lidOn, P.lidOn + 0.03);
      const lidEl = lidRef.current;
      if (lidEl) {
        lidEl.style.opacity = lidOn.toFixed(3);
        lidEl.style.visibility = lidOn > 0 ? "visible" : "hidden";
        lidEl.style.transform = `rotateX(${fmt((lid * 180) / Math.PI)}deg) translateZ(1.5px)`;
      }
      const hinge = HINGE_ABOVE * H;

      // Blocks.
      const { blocks, plan } = s;
      const revs = revisionOffsets(blocks, store.rev);
      const count = plan.length;
      for (let i = 0; i < count; i++) {
        const el2 = blockEls.current[i];
        if (!el2) continue;
        const { block, id } = plan[i];
        const e = extrudeOf(i, count, store.extrude);
        let h = block.depth * DEPTH * W * e;
        if (h > 2) h += (s.hover.get(id)?.v ?? 0) * HOVER_LIFT;
        const r = revs[id];
        const dx = r ? r.dx * W : 0;
        const dy = r ? r.dy * H : 0;
        const zb = r ? r.dz * W : 0;
        const rz = r ? r.rz : 0;
        if (lidT < 1e3) h = Math.min(h, Math.max(0, (block.y * H + dy + hinge) * lidT - zb));
        const tf = `translate3d(${fmt(dx)}px, ${fmt(dy)}px, ${fmt(zb + h)}px)${rz ? ` rotateZ(${fmt(rz)}deg)` : ""}`;
        if (s.lastTransform[i] !== tf) {
          s.lastTransform[i] = tf;
          el2.style.transform = tf;
          const k = Math.max(0, h) / WALL;
          const wt = wallT.current[i];
          const wr = wallR.current[i];
          if (wt) wt.style.transform = `rotateX(90deg) scaleY(${k.toFixed(4)})`;
          if (wr) wr.style.transform = `rotateY(90deg) scaleX(${k.toFixed(4)})`;
        }
        const sock = sockEls.current[i];
        if (sock) {
          const o = Math.min(1, (zb + h) / 2).toFixed(2);
          if (sock.style.opacity !== o) sock.style.opacity = o;
        }
      }

      if (store.briefT > 0 || phase === "brief") drawBrief();
      if (p >= P.lidClosed - 0.02) drawChrome();
    },
    [drawBrief, drawChrome],
  );
  useEffect(() => {
    const screen = screenRef.current;
    if (!screen) return;
    const measure = () => {
      const s = live.current;
      const w = screen.clientWidth;
      const h = screen.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (w === s.w && h === s.h && dpr === s.dpr) return;
      s.w = w;
      s.h = h;
      s.dpr = dpr;
      sizeCanvases();
      drawBrief(true);
      drawChrome(true);
      s.lastTransform = [];
      if (s.store) apply(s.store);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(screen);
    return () => ro.disconnect();
  }, [sizeCanvases, drawBrief, drawChrome, apply]);

  // Props → live state; a new layout (sector) re-applies everything.
  useEffect(() => {
    const s = live.current;
    s.input = input;
    s.active = active;
    if (s.blocks !== blocks) {
      s.blocks = blocks;
      s.plan = plan;
      s.lastTransform = [];
      s.sw2 = "";
      s.sw3 = "";
      sizeCanvases();
    }
    if (active && s.store) {
      s.lastTransform = [];
      s.sw2 = "";
      s.sw3 = "";
      apply(s.store);
    }
  }, [input, active, blocks, plan, apply, sizeCanvases]);

  /* ── Hover labels ─────────────────────────────────────────────────── */
  const hostRel = useCallback(
    (clientX: number, clientY: number) => {
      const host = hostRef?.current ?? rootRef.current;
      if (!host) return { x: clientX, y: clientY };
      const r = host.getBoundingClientRect();
      return { x: clientX - r.left, y: clientY - r.top };
    },
    [hostRef],
  );

  const setHover = useCallback(
    (id: SketchBlockId | null) => {
      const s = live.current;
      if (s.hovered === id) return;
      const prev = s.hovered;
      s.hovered = id;
      const tweenTo = (bid: SketchBlockId, v: number) => {
        let o = s.hover.get(bid);
        if (!o) {
          o = { v: 0 };
          s.hover.set(bid, o);
        }
        gsap.to(o, {
          v,
          duration: v ? 0.15 : 0.1,
          ease: "studio-snap",
          overwrite: "auto",
          onUpdate: () => {
            s.lastTransform = [];
            if (s.store) apply(s.store);
          },
        });
      };
      if (prev) tweenTo(prev, 0);
      if (id) tweenTo(id, 1);
    },
    [apply],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    let touchTimer = 0;
    const blockFrom = (t: EventTarget | null): SketchBlockId | null => {
      const el = (t as HTMLElement | null)?.closest?.("[data-block]") as HTMLElement | null;
      return (el?.dataset.block as SketchBlockId | undefined) ?? null;
    };
    const labelOf = (id: SketchBlockId) => blocks.find((b) => b.id === id)?.hoverLabel ?? "";
    const visible = () => {
      const st = live.current.store;
      return live.current.phase === "blocks" && !!st && st.p > 0.27 && st.p < 0.74;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" || !fine.matches || !live.current.active) return;
      const id = visible() ? blockFrom(e.target) : null;
      setHover(id);
      if (!id) {
        onHover?.(null);
        return;
      }
      const { x, y } = hostRel(e.clientX, e.clientY);
      onHover?.({ blockId: id, label: labelOf(id), x, y });
    };
    const onLeave = () => {
      setHover(null);
      onHover?.(null);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || !live.current.active || !visible()) return;
      const id = blockFrom(e.target);
      if (!id) return;
      const { x, y } = hostRel(e.clientX, e.clientY);
      setHover(id);
      onHover?.({ blockId: id, label: labelOf(id), x, y, touch: true });
      window.clearTimeout(touchTimer);
      touchTimer = window.setTimeout(() => {
        setHover(null);
        onHover?.(null);
      }, 2000);
    };
    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", onLeave, { passive: true });
    root.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      window.clearTimeout(touchTimer);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerdown", onDown);
    };
  }, [blocks, hostRel, onHover, setHover]);

  /* ── Handle ───────────────────────────────────────────────────────── */
  useImperativeHandle(
    ref,
    () => ({
      apply,
      rectOf(id, host) {
        const i = plan.findIndex((p) => p.id === id);
        const face = blockEls.current[i]?.firstElementChild as HTMLElement | null;
        if (!face) return null;
        const r = face.getBoundingClientRect();
        const h = host.getBoundingClientRect();
        if (!r.width || !r.height) return null;
        return { x: r.left - h.left, y: r.top - h.top, w: r.width, h: r.height };
      },
      centreOf(host) {
        const pane = screenRef.current;
        if (!pane) return null;
        const r = pane.getBoundingClientRect();
        const h = host.getBoundingClientRect();
        return { x: r.left + r.width / 2 - h.left, y: r.top + r.height / 2 - h.top };
      },
      sweep() {
        const el = sheenRef.current;
        if (!el) return;
        gsap.fromTo(
          el,
          { xPercent: -120, autoAlpha: 1 },
          {
            xPercent: 120,
            duration: 0.9,
            ease: "studio-in-out",
            overwrite: true,
            onComplete: () => {
              gsap.set(el, { autoAlpha: 0 });
            },
          },
        );
      },
    }),
    [plan, apply],
  );

  const atlasStyle = useMemo(
    () =>
      ({
        "--atlas": urls ? `url("${urls.atlas}")` : "none",
        "--base": urls ? `url("${urls.base}")` : "none",
      }) as CSSProperties,
    [urls],
  );

  return (
    <div
      ref={rootRef}
      className={`${styles.model} ${className ?? ""}`}
      style={atlasStyle}
      data-phase="brief"
      data-ready={urls ? "1" : "0"}
      aria-hidden="true"
    >
      <div ref={paneRef} className={styles.pane}>
        <span className={styles.paneShadow} />
        <span className={styles.paneBody} />
        <div ref={screenRef} className={styles.screen}>
          <div className={styles.base}>
            <span className={styles.base1} />
            <span className={styles.base2} />
            <span className={styles.base3} />
          </div>
          <svg className={styles.gridLines} viewBox="0 0 1024 640" preserveAspectRatio="none">
            {Array.from({ length: 13 }, (_, i) => {
              const x = 64 + (i * 896) / 12;
              return <line key={i} x1={x} x2={x} y1={-40} y2={680} />;
            })}
            <line x1={-30} x2={1054} y1={34} y2={34} />
            <line x1={-30} x2={1054} y1={606} y2={606} />
          </svg>
          <div className={styles.sockets}>
            {plan.map(({ id, block }, i) =>
              id === "chrome" ? null : (
                <span
                  key={id}
                  ref={(el) => {
                    sockEls.current[i] = el;
                  }}
                  className={styles.socket}
                  style={{
                    left: `${block.x * 100}%`,
                    top: `${block.y * 100}%`,
                    width: `${block.w * 100}%`,
                    height: `${block.h * 100}%`,
                  }}
                />
              ),
            )}
          </div>
          <canvas ref={briefRef} className={styles.brief} />
          <div className={styles.blocks}>
            {plan.map(({ id, block }, i) => (
              <div
                key={id}
                ref={(el) => {
                  blockEls.current[i] = el;
                }}
                data-block={id}
                className={`${styles.block} ${block.isImage ? styles.isImage : ""} ${
                  id === "chrome" ? styles.isChrome : ""
                }`}
                style={
                  {
                    left: `${block.x * 100}%`,
                    top: `${block.y * 100}%`,
                    width: `${block.w * 100}%`,
                    height: `${block.h * 100}%`,
                    "--bx": block.x,
                    "--by": block.y,
                    "--bw": Math.min(block.w, 0.999),
                    "--bh": block.h,
                  } as CSSProperties
                }
              >
                <span className={styles.face}>
                  {id === "chrome" ? <canvas ref={chromeRef} className={styles.chromeCanvas} /> : null}
                </span>
                <span
                  ref={(el) => {
                    wallT.current[i] = el;
                  }}
                  className={styles.wallT}
                />
                <span
                  ref={(el) => {
                    wallR.current[i] = el;
                  }}
                  className={styles.wallR}
                />
              </div>
            ))}
          </div>
          <div ref={lidRef} className={styles.lid} />
          <span className={styles.sheenClip}>
            <span ref={sheenRef} className={styles.sheen} />
          </span>
        </div>
      </div>
    </div>
  );
}

export { CssModel };
