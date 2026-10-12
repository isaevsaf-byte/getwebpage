"use client";

/**
 * The only WebGL entry point on the site.
 *
 * The CSS-3D `poster` is always rendered (it is the SSR, no-JS, mobile and
 * fallback view). On the 'webgl' tier only, once the page has loaded, the
 * browser is idle and the host is within a viewport of the screen, the stage
 * downloads three.js plus the scene module, renders on demand into a canvas
 * layered over the poster, and fades it in after the first frame.
 *
 * Nothing in this file imports three.js at runtime — only types — so the
 * main bundle stays free of it.
 */

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import type { Texture, WebGLRenderer } from "three";
import { downgradeTier, useTier } from "@/lib/showcase/tier";
import { claimContextSlot } from "@/lib/three/budget";
import type { SceneFactory, SceneHandle, StageContext } from "@/lib/three/types";
import styles from "./ThreeStage.module.css";

export type { SceneFactory, SceneHandle, SceneModule, StageContext } from "@/lib/three/types";

export interface ThreeStageProps {
  className?: string;
  /** The CSS-3D DOM version. Always rendered; hidden (not unmounted) while the canvas is live. */
  poster: ReactNode;
  /** e.g. `() => import("./HeroScene")`. Only called on the webgl tier. */
  load: () => Promise<{ default: SceneFactory }>;
  /** Forwarded to handle.setProps after creation and on every change. */
  props?: Record<string, unknown>;
  /** Fires after the first frame has been drawn. */
  onReady?: (h: SceneHandle) => void;
  /** Fires when the stage gave up on WebGL (context loss, slow GPU, init error). */
  onDowngrade?: () => void;
}

/** Frames per probe window and the thresholds (mean frame interval, ms). */
const PROBE_FRAMES = 90;
const PROBE_DPR_MS = 22;
const PROBE_TIER_MS = 26;
const FADE_IN_MS = 500;
const FADE_OUT_MS = 300;

const noop = () => {};

type Latest = Pick<ThreeStageProps, "load" | "props" | "onReady" | "onDowngrade">;

interface Bridge {
  latest: RefObject<Latest>;
  handleRef: RefObject<SceneHandle | null>;
  invalidateRef: RefObject<() => void>;
  setLive: (v: boolean) => void;
  setFailed: (v: boolean) => void;
}

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export default function ThreeStage({
  className,
  poster,
  load,
  props,
  onReady,
  onDowngrade,
}: ThreeStageProps) {
  const tier = useTier();
  const [failed, setFailed] = useState(false);
  const [live, setLive] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<SceneHandle | null>(null);
  const invalidateRef = useRef<() => void>(noop);
  const latest = useRef<Latest>({ load, props, onReady, onDowngrade });

  useEffect(() => {
    latest.current = { load, props, onReady, onDowngrade };
  });

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle || !props || !handle.setProps) return;
    handle.setProps(props);
    invalidateRef.current();
  }, [props]);

  const active = tier === "webgl" && !failed;

  useEffect(() => {
    if (!active) return;
    const host = hostRef.current;
    const layer = layerRef.current;
    if (!host || !layer) return;
    return mountStage(host, layer, { latest, handleRef, invalidateRef, setLive, setFailed });
  }, [active]);

  return (
    <div ref={hostRef} className={cx(styles.stage, className)} data-tier={tier}>
      <div className={cx(styles.poster, live && styles.posterHidden)} aria-hidden={live || undefined}>
        {poster}
      </div>
      {active ? <div ref={layerRef} className={styles.layer} aria-hidden="true" /> : null}
    </div>
  );
}

export { ThreeStage };

/**
 * Imperative lifecycle of one stage. Returns the teardown. Kept outside the
 * component so the render loop never touches React state per frame.
 */
function mountStage(host: HTMLDivElement, layer: HTMLDivElement, bridge: Bridge): () => void {
  let disposed = false;
  let degraded = false;
  let torn = false;
  let release: (() => void) | null = null;
  let renderer: WebGLRenderer | null = null;
  let env: Texture | null = null;
  let handle: SceneHandle | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let raf = 0;
  let fadeTimer = 0;
  let nearIO: IntersectionObserver | null = null;
  let seenIO: IntersectionObserver | null = null;
  let ro: ResizeObserver | null = null;
  const cancelers: (() => void)[] = [];

  let onScreen = true;
  let shown = false;
  let last = 0;
  let clock = 0;
  let width = 1;
  let height = 1;
  let dpr = 1;
  let probeN = 0;
  let probeSum = 0;
  let probeStage = 0; // 0: initial DPR, 1: after stepping to DPR 1, 2: done

  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const measure = () => ({
    width: Math.max(1, Math.round(host.clientWidth)),
    height: Math.max(1, Math.round(host.clientHeight)),
  });

  const canRun = () => !disposed && !degraded && onScreen && !document.hidden && !!handle && !!renderer;

  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  };

  const invalidate = () => {
    if (raf || !canRun()) return;
    raf = requestAnimationFrame(frame);
  };

  /** Draw immediately (used after a resize so the cleared buffer never shows). */
  const renderNow = () => {
    if (!canRun() || !handle) return;
    let keep = false;
    try {
      keep = handle.render(0, clock);
    } catch (err) {
      console.error("[ThreeStage] render failed", err);
      degrade("error");
      return;
    }
    if (keep) invalidate();
  };

  function frame(now: number) {
    raf = 0;
    if (!canRun() || !handle) {
      last = 0;
      return;
    }
    const interval = last ? now - last : 0;
    const dt = last ? Math.min(interval / 1000, 0.1) : 1 / 60;
    last = now;
    clock += dt;

    let keep: boolean;
    try {
      keep = handle.render(dt, clock);
    } catch (err) {
      console.error("[ThreeStage] render failed", err);
      degrade("error");
      return;
    }
    if (!shown) reveal();
    if (interval) probe(interval);
    if (degraded || disposed) return;
    if (keep) raf = requestAnimationFrame(frame);
    else last = 0;
  }

  function reveal() {
    shown = true;
    canvas?.classList.add(styles.canvasLive);
    host.dataset.stage = "live";
    fadeTimer = window.setTimeout(() => {
      if (!disposed && !degraded) bridge.setLive(true);
    }, FADE_IN_MS);
    if (handle) bridge.latest.current.onReady?.(handle);
  }

  /** Mean frame interval over consecutive frames: step DPR to 1, then give up on WebGL. */
  function probe(interval: number) {
    if (probeStage > 1) return;
    probeSum += Math.min(interval, 100);
    probeN += 1;
    if (probeN < PROBE_FRAMES) return;
    const mean = probeSum / probeN;
    probeN = 0;
    probeSum = 0;
    host.dataset.stageFrameMs = mean.toFixed(1);
    if (probeStage === 0) {
      if (mean > PROBE_DPR_MS) {
        probeStage = 1;
        if (dpr > 1) applyDpr(1);
      } else {
        probeStage = 2;
      }
    } else {
      probeStage = 2;
      if (mean > PROBE_TIER_MS) degrade("perf");
    }
  }

  function applyDpr(next: number) {
    if (!renderer || !handle) return;
    dpr = next;
    host.dataset.stageDpr = String(dpr);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    handle.resize(width, height, dpr);
    renderNow();
  }

  function degrade(reason: "lost" | "perf" | "error") {
    if (degraded || disposed) return;
    degraded = true;
    stop();
    host.dataset.stage = `poster-${reason}`;
    bridge.setLive(false);
    const finish = () => {
      teardown();
      try {
        downgradeTier();
      } catch {
        // sessionStorage can throw in private modes; the local fallback still applies.
      }
      bridge.latest.current.onDowngrade?.();
      bridge.setFailed(true);
    };
    if (reason === "perf" && canvas && shown) {
      canvas.classList.add(styles.canvasLeaving);
      window.clearTimeout(fadeTimer);
      fadeTimer = window.setTimeout(finish, FADE_OUT_MS);
    } else {
      finish();
    }
  }

  const onLost = () => degrade("lost");

  const onVisibility = () => {
    if (document.hidden) stop();
    else invalidate();
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!handle?.pointer || e.pointerType === "touch") return;
    const r = host.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
    handle.pointer(Math.max(-1, Math.min(1, nx)), Math.max(-1, Math.min(1, ny)));
    invalidate();
  };

  const onPointerLeave = () => {
    if (!handle) return;
    if (handle.pointerLeave) handle.pointerLeave();
    else handle.pointer?.(0, 0);
    invalidate();
  };

  function teardown() {
    if (torn) return;
    torn = true;
    disposed = true;
    stop();
    window.clearTimeout(fadeTimer);
    for (const cancel of cancelers) cancel();
    nearIO?.disconnect();
    seenIO?.disconnect();
    ro?.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    host.removeEventListener("pointermove", onPointerMove);
    host.removeEventListener("pointerleave", onPointerLeave);
    // Remove before forceContextLoss, which fires webglcontextlost itself.
    canvas?.removeEventListener("webglcontextlost", onLost);
    if (bridge.handleRef.current === handle) bridge.handleRef.current = null;
    bridge.invalidateRef.current = noop;
    try {
      handle?.dispose();
    } catch (err) {
      console.error("[ThreeStage] scene dispose failed", err);
    }
    try {
      env?.dispose();
    } catch {}
    if (renderer) {
      try {
        renderer.dispose();
      } catch {}
      try {
        renderer.forceContextLoss();
      } catch {}
    }
    canvas?.remove();
    release?.();
    release = null;
    handle = null;
    renderer = null;
    env = null;
    canvas = null;
    delete host.dataset.stage;
  }

  // ── Gates: page loaded → browser idle → host near the viewport ──────────
  const waitForLoad = () =>
    new Promise<void>((resolve) => {
      if (document.readyState === "complete") return resolve();
      const onLoad = () => resolve();
      window.addEventListener("load", onLoad, { once: true });
      cancelers.push(() => window.removeEventListener("load", onLoad));
    });

  const waitForIdle = () =>
    new Promise<void>((resolve) => {
      if (typeof window.requestIdleCallback === "function") {
        const id = window.requestIdleCallback(() => resolve(), { timeout: 2000 });
        cancelers.push(() => window.cancelIdleCallback(id));
      } else {
        const id = window.setTimeout(resolve, 300);
        cancelers.push(() => window.clearTimeout(id));
      }
    });

  const waitForNear = () =>
    new Promise<void>((resolve) => {
      nearIO = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          nearIO?.disconnect();
          nearIO = null;
          resolve();
        },
        { rootMargin: "100% 0px" },
      );
      nearIO.observe(host);
    });

  const start = async () => {
    host.dataset.stage = "waiting";
    await waitForLoad();
    if (disposed) return;
    await waitForIdle();
    if (disposed) return;
    await waitForNear();
    if (disposed) return;

    release = claimContextSlot();
    if (!release) {
      // Two stages are already live. Stay on the poster; this is not a downgrade.
      host.dataset.stage = "poster-budget";
      return;
    }

    host.dataset.stage = "loading";
    let modules: [
      typeof import("@/lib/three/renderer"),
      typeof import("@/lib/three/studioEnv"),
      { default: SceneFactory },
    ];
    try {
      modules = await Promise.all([
        import("@/lib/three/renderer"),
        import("@/lib/three/studioEnv"),
        bridge.latest.current.load(),
      ]);
    } catch (err) {
      // A chunk failed to download (offline, deploy skew). Keep the poster and
      // do not mark the session as low-end.
      console.error("[ThreeStage] scene download failed", err);
      if (!disposed) host.dataset.stage = "poster-offline";
      release?.();
      release = null;
      return;
    }
    if (disposed) return;
    const [{ createRenderer, stageDpr }, { createStudioEnv }, sceneModule] = modules;

    canvas = document.createElement("canvas");
    canvas.className = styles.canvas;
    canvas.setAttribute("aria-hidden", "true");
    canvas.addEventListener("webglcontextlost", onLost);
    layer.appendChild(canvas);

    try {
      renderer = createRenderer(canvas);
      ({ width, height } = measure());
      dpr = stageDpr();
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      host.dataset.stageDpr = String(dpr);
      env = createStudioEnv(renderer);

      const ctx: StageContext = { renderer, canvas, width, height, dpr, env, invalidate, reduced: false };
      const created = await sceneModule.default(ctx);
      if (disposed) {
        created.dispose();
        return;
      }
      handle = created;
      const initialProps = bridge.latest.current.props;
      if (initialProps && handle.setProps) handle.setProps(initialProps);
      if (handle.compile) await handle.compile();
      if (disposed) return;
    } catch (err) {
      console.error("[ThreeStage] WebGL init failed", err);
      degrade("error");
      return;
    }

    bridge.handleRef.current = handle;
    bridge.invalidateRef.current = invalidate;

    seenIO = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        onScreen = entry.isIntersecting;
        if (onScreen) invalidate();
        else stop();
      },
      { threshold: 0 },
    );
    seenIO.observe(host);

    ro = new ResizeObserver(() => {
      if (!renderer || !handle) return;
      const next = measure();
      if (next.width === width && next.height === height) return;
      width = next.width;
      height = next.height;
      renderer.setSize(width, height, false);
      handle.resize(width, height, dpr);
      renderNow();
    });
    ro.observe(host);

    document.addEventListener("visibilitychange", onVisibility);
    if (fine) {
      host.addEventListener("pointermove", onPointerMove, { passive: true });
      host.addEventListener("pointerleave", onPointerLeave, { passive: true });
    }

    invalidate();
  };

  start();

  return teardown;
}
