"use client";

/**
 * The Ownership flip card: the visitor's sketch on the front, the same page
 * as real markup on the back. Scrolling turns it over (scrubbed, 1:1); a
 * click/tap on the card or the flip button turns it by hand, and that wins
 * until the scroll direction changes.
 *
 * CSS decides the resting layout from first paint. With html.motion-ok the
 * faces stack in 3D; without it (reduced motion, no JS) they sit one above
 * the other, both readable, nothing rotates.
 */

import { useMemo, useRef, type PointerEvent as ReactPointerEvent, type MouseEvent } from "react";
import CssPane from "@/components/showcase/primitives/CssPane";
import { gsap, ScrollTrigger, useGSAP, motionMedia, EASE } from "@/lib/motion/gsap";
import { useVisitor } from "@/lib/showcase/visitor";
import { useAiCopy } from "@/lib/showcase/aiCopy";
import { buildCode, tokenize } from "./code";
import CodeBlock from "./CodeBlock";
import SketchFace from "./SketchFace";
import s from "./Ownership.module.css";

const TILT = 4; // pointer follow, degrees
const LIFT = 70; // px toward the viewer at mid-turn
/**
 * Share of the scrub range the front holds still, so the visitor reads their
 * own sketch before it turns. The turn itself stays linear (1:1) after it.
 */
const DWELL = 0.3;
const turnOf = (p: number) => Math.max(0, Math.min(1, (p - DWELL) / (1 - DWELL)));

/*
 * CssPane's own glare (its --sheen, set once per pane) follows the turn: on
 * the front it slides off as the card turns away; on the back it crosses
 * once and parks off-pane, so the code is clean at rest.
 */
const frontGlare = (el: HTMLDivElement | null) =>
  el?.style.setProperty("--sheen", "calc(clamp(0, var(--f, 0) * 2, 1) * 45%)");
const backGlare = (el: HTMLDivElement | null) =>
  el?.style.setProperty("--sheen", "calc(clamp(0, var(--f, 1) * 2 - 1, 1) * 90% - 45%)");
const clamp1 = (n: number) => Math.max(-1, Math.min(1, n));

export default function FlipCard() {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<() => void>(() => {});
  const downRef = useRef<{ x: number; y: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const v = useVisitor();
  const ai = useAiCopy();
  const copy =
    ai.status === "done" && ai.copy && ai.forName === v.name && ai.forSector === v.sector
      ? ai.copy
      : undefined;
  const lines = useMemo(
    () => tokenize(buildCode(v.display, v.sector, copy), v.display),
    [v.display, v.sector, copy],
  );

  useGSAP(
    () => {
      const stage = stageRef.current;
      const card = cardRef.current;
      if (!stage || !card) return;
      // Vars live on the wrapper so the flip button (outside the stage) reads them too.
      const vars = stage.parentElement ?? stage;

      const mm = motionMedia(({ ok, fine }) => {
        if (!ok) {
          toggleRef.current = () => {};
          return;
        }

        const st = { f: 0, rx: 0, ry: 0 };
        let side: "front" | "back" = "front";

        const apply = () => {
          const deg = st.f * 180 + st.ry;
          const r = (deg * Math.PI) / 180;
          const lift = Math.sin(st.f * Math.PI);
          card.style.transform =
            `translate3d(0,${(-lift * 12).toFixed(2)}px,${(lift * LIFT).toFixed(2)}px) ` +
            `rotateX(${st.rx.toFixed(2)}deg) rotateY(${deg.toFixed(2)}deg)`;
          vars.style.setProperty("--f", st.f.toFixed(4));
          vars.style.setProperty("--c", Math.abs(Math.cos(r)).toFixed(3));
          vars.style.setProperty("--code", Math.min(1, Math.max(0, (st.f - 0.5) / 0.42)).toFixed(3));
          const next = deg > 90 ? "back" : "front";
          if (next !== side) {
            // DOM only: no React render at the crossing, mid-turn.
            side = next;
            card.dataset.side = next;
            btnRef.current?.setAttribute("aria-pressed", String(next === "back"));
          }
        };

        // Scrubbed flip. Driven from onUpdate rather than a scrub tween, so a
        // hand flip can take over and hand back without a jump.
        let manualDir = 0; // scroll direction when the hand flip happened; 0 = none
        let lastDir = 1;
        let catching = false;
        const trigger = ScrollTrigger.create({
          trigger: stage,
          start: "top 75%",
          end: "center 40%",
          onUpdate(self) {
            const dir = self.direction;
            if (manualDir) {
              if (dir === manualDir) return;
              manualDir = 0;
              catching = true;
            }
            lastDir = dir;
            const p = turnOf(self.progress);
            if (catching && Math.abs(st.f - p) > 0.004) {
              gsap.to(st, { f: p, duration: 0.45, ease: EASE.out, overwrite: "auto", onUpdate: apply });
              return;
            }
            catching = false;
            gsap.killTweensOf(st, "f");
            st.f = p;
            apply();
          },
        });
        // The card keeps its own layer while it is on screen and drops it only
        // off screen, so the re-raster never lands on a visible frame.
        const onScreen = ScrollTrigger.create({
          trigger: stage,
          start: "top bottom",
          end: "bottom top",
          onToggle(self) {
            card.style.willChange = self.isActive ? "transform" : "";
          },
        });
        st.f = turnOf(trigger.progress);
        apply();

        toggleRef.current = () => {
          manualDir = lastDir;
          catching = false;
          card.style.willChange = "transform";
          gsap.to(st, {
            f: side === "back" ? 0 : 1,
            duration: 0.7,
            ease: EASE.inOut,
            overwrite: "auto",
            onUpdate: apply,
            onComplete: () => {
              if (!onScreen.isActive) card.style.willChange = "";
            },
          });
        };

        // Pointer follow, fine pointers only. The stage never moves, so the
        // hit area is stable.
        let unbind = () => {};
        if (fine) {
          const qx = gsap.quickTo(st, "rx", { duration: 0.6, ease: EASE.out, onUpdate: apply });
          const qy = gsap.quickTo(st, "ry", { duration: 0.6, ease: EASE.out, onUpdate: apply });
          const onMove = (e: PointerEvent) => {
            if (e.pointerType !== "mouse") return;
            const b = stage.getBoundingClientRect();
            qy(clamp1(((e.clientX - b.left) / b.width) * 2 - 1) * TILT);
            qx(-clamp1(((e.clientY - b.top) / b.height) * 2 - 1) * TILT);
          };
          const onLeave = () => {
            qx(0);
            qy(0);
          };
          stage.addEventListener("pointermove", onMove);
          stage.addEventListener("pointerleave", onLeave);
          unbind = () => {
            stage.removeEventListener("pointermove", onMove);
            stage.removeEventListener("pointerleave", onLeave);
          };
        }

        return () => {
          unbind();
          toggleRef.current = () => {};
          card.style.transform = "";
          card.style.willChange = "";
          card.dataset.side = "front";
          btnRef.current?.setAttribute("aria-pressed", "false");
          for (const p of ["--f", "--c", "--code"]) vars.style.removeProperty(p);
        };
      });

      return () => mm.revert();
    },
    { scope: stageRef },
  );

  const onDown = (e: ReactPointerEvent) => {
    downRef.current = { x: e.clientX, y: e.clientY };
  };
  // A click (or tap) turns the card, unless it was a drag-select of the code.
  const onCardClick = (e: MouseEvent) => {
    const d = downRef.current;
    downRef.current = null;
    if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return;
    const sel = typeof window !== "undefined" ? window.getSelection() : null;
    if (sel && !sel.isCollapsed && cardRef.current?.contains(sel.anchorNode)) return;
    toggleRef.current();
  };

  const source = `view-source:${v.domain}`;

  return (
    <div className={s.stageWrap}>
      <div ref={stageRef} className={s.stage}>
        <div
          ref={cardRef}
          className={s.card}
          // Static on purpose: the flip writes data-side / aria-pressed to the
          // DOM directly, and React never re-sends an unchanged prop.
          data-side="front"
          onPointerDown={onDown}
          onClick={onCardClick}
        >
          <div className={`${s.face} ${s.front}`}>
            <p className={s.tag}>Your sketch</p>
            <div className={s.paneWrap}>
              <div className={s.pDesk}>
                <CssPane domain={v.domain} secure aspect="16/10" paneRef={frontGlare}>
                  <SketchFace v={v} copy={copy} layout="desktop" />
                </CssPane>
              </div>
              <div className={s.pPhone}>
                <CssPane domain={v.domain} secure aspect="9/19.5" paneRef={frontGlare}>
                  <SketchFace v={v} copy={copy} layout="mobile" />
                </CssPane>
              </div>
              <span className={s.shade} aria-hidden="true" />
              <span className={s.sheen} aria-hidden="true" />
            </div>
          </div>

          <div className={`${s.face} ${s.back}`}>
            <p className={s.tag}>Your sketch, as code</p>
            <div className={s.paneWrap}>
              <div className={s.pDesk}>
                <CssPane domain={source} aspect="16/10" paneRef={backGlare}>
                  <CodeBlock lines={lines} />
                </CssPane>
              </div>
              <div className={s.pPhone}>
                <CssPane domain={source} aspect="9/19.5" paneRef={backGlare}>
                  <CodeBlock lines={lines} wrap />
                </CssPane>
              </div>
              <span className={s.shade} aria-hidden="true" />
              <span className={s.sheen} aria-hidden="true" />
            </div>
          </div>

          <span className={`${s.edge} ${s.edgeL}`} aria-hidden="true" />
          <span className={`${s.edge} ${s.edgeR}`} aria-hidden="true" />
        </div>
      </div>

      <div className={s.foot}>
        <button
          type="button"
          className={s.flipBtn}
          ref={btnRef}
          aria-pressed={false}
          aria-label="Show the code"
          onClick={() => toggleRef.current()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className={s.flipIcon}>
            <path
              d="M4.5 12a7.5 7.5 0 0 1 12.8-5.3M19.5 12a7.5 7.5 0 0 1-12.8 5.3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path d="M17.6 3.2v3.8h-3.8M6.4 20.8V17h3.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <p className={s.caption}>
          On a real build, the code, the domain and the logins are handed to you.
        </p>
      </div>
    </div>
  );
}
