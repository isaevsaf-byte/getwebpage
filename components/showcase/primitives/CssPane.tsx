"use client";

/**
 * A browser pane built from DOM + CSS 3D. It is the mobile/css3d tier, the
 * poster under the WebGL stage, and the frame in RealSites and Ownership.
 *
 * Server-rendered at its tilt, so it is complete without JavaScript. With
 * `draggable`, a horizontal drag (mouse or touch) turns it up to ±28° and it
 * springs back on release; vertical swipes stay native scrolling.
 */

import { useCallback, useEffect, useRef, type CSSProperties, type ReactNode, type Ref } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion/gsap";
import styles from "./CssPane.module.css";

export type PaneAspect = "16/10" | "9/19.5" | "4/3";

export interface CssPaneProps {
  domain: string;
  secure?: boolean;
  tone?: "ink" | "paper";
  aspect?: PaneAspect;
  /** Resting rotation in degrees. */
  tilt?: { x: number; y: number };
  draggable?: boolean;
  /** Small mono tag at the top-right of the chrome, e.g. "Sketch". */
  label?: string;
  className?: string;
  style?: CSSProperties;
  /** The screen slot (holds children). */
  screenRef?: Ref<HTMLDivElement>;
  /** The rotating pane. Its --rx / --ry (unitless degrees) can be tweened directly. */
  paneRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}

const ASPECT_CLASS: Record<PaneAspect, string> = {
  "16/10": styles.a16x10,
  "9/19.5": styles.a9x19,
  "4/3": styles.a4x3,
};

const DRAG_DEG_PER_PX = 0.12;
const DRAG_LIMIT = 28;
const DRAG_SLOP = 4;

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") ref(value);
  else (ref as { current: T | null }).current = value;
}

export default function CssPane({
  domain,
  secure = false,
  tone = "ink",
  aspect = "16/10",
  tilt,
  draggable = false,
  label,
  className,
  style,
  screenRef,
  paneRef,
  children,
}: CssPaneProps) {
  const tiltX = tilt?.x ?? 0;
  const tiltY = tilt?.y ?? 0;
  const paneEl = useRef<HTMLDivElement | null>(null);

  const setPane = useCallback(
    (node: HTMLDivElement | null) => {
      paneEl.current = node;
      assignRef(paneRef, node);
    },
    [paneRef],
  );

  useEffect(() => {
    const el = paneEl.current;
    if (!draggable || !el) return;

    const proxy = { ry: tiltY };
    let pointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let startRy = tiltY;
    let dragging = false;
    let suppressClick = false;

    const apply = () => el.style.setProperty("--ry", proxy.ry.toFixed(2));

    const onDown = (e: PointerEvent) => {
      if (pointerId !== null) return; // a second finger never steers
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (prefersReducedMotion()) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      dragging = false;
      gsap.killTweensOf(proxy);
      startRy = proxy.ry; // pick up mid-spring-back
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!dragging) {
        if (Math.abs(dx) < DRAG_SLOP || Math.abs(dx) < Math.abs(dy)) return;
        dragging = true;
        try {
          el.setPointerCapture(e.pointerId);
        } catch {}
        el.classList.add(styles.dragging);
      }
      proxy.ry = Math.max(-DRAG_LIMIT, Math.min(DRAG_LIMIT, startRy + dx * DRAG_DEG_PER_PX));
      apply();
    };

    const onEnd = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      el.classList.remove(styles.dragging);
      if (!dragging) return;
      dragging = false;
      suppressClick = e.type === "pointerup";
      gsap.to(proxy, {
        ry: tiltY,
        duration: 0.7,
        ease: "studio-out",
        overwrite: "auto",
        onUpdate: apply,
      });
    };

    // A drag that ends over the pane must not also count as a click on it.
    const onClickCapture = (e: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      e.stopPropagation();
      e.preventDefault();
    };
    const onDragStart = (e: DragEvent) => e.preventDefault();

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onEnd);
    el.addEventListener("pointercancel", onEnd);
    el.addEventListener("lostpointercapture", onEnd);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("dragstart", onDragStart);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onEnd);
      el.removeEventListener("pointercancel", onEnd);
      el.removeEventListener("lostpointercapture", onEnd);
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("dragstart", onDragStart);
      gsap.killTweensOf(proxy);
    };
  }, [draggable, tiltY]);

  const paneStyle = { "--rx": tiltX, "--ry": tiltY } as CSSProperties;

  return (
    <div className={cx(styles.root, className)} style={style}>
      <div
        ref={setPane}
        className={cx(
          styles.pane,
          tone === "paper" && styles.paper,
          ASPECT_CLASS[aspect],
          draggable && styles.draggable,
        )}
        style={paneStyle}
      >
        <div className={styles.chrome}>
          <span className={styles.dots} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className={styles.domain}>
            {secure ? (
              <svg className={styles.lock} viewBox="0 0 9 11" aria-label="Secure connection" role="img">
                <path
                  d="M2 4.5V3a2.5 2.5 0 0 1 5 0v1.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <rect x="0.6" y="4.5" width="7.8" height="6" rx="1.2" fill="currentColor" />
              </svg>
            ) : null}
            <span>{domain}</span>
          </span>
          {label ? <span className={styles.label}>{label}</span> : <span aria-hidden="true" />}
        </div>
        <div ref={screenRef} className={styles.screen}>
          {children}
        </div>
        <span className={styles.glare} aria-hidden="true" />
      </div>
    </div>
  );
}

export { CssPane };
