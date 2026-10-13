"use client";

/**
 * SevenDays — the visitor's own sketch, built through the real 7-day
 * process, scrubbed by scroll.
 *
 * Three scrubbed layouts share one master timeline (it tweens a plain
 * `store`; everything reads it on each scroll update):
 *
 * - "desk" (≥1024, motion allowed): captions flow on the left, a sticky
 *   stage on the right holds the lamination model (WebGL scene, or the
 *   CSS-3D model as its poster / fallback) plus DOM overlays — the day
 *   numeral, the annotation, the chips and the hover label.
 * - "side" (phones in landscape): the same two columns, stage under the
 *   header, with a compact in-stage progress bar instead of the rail.
 * - "top" (phones and tablets in portrait): the stage sticks under the
 *   header across the top ~54svh; the captions scroll beneath it as normal
 *   content. The scrub is mapped to a reading line in the caption window, so
 *   each beat is on screen while its part of the build plays.
 *
 * Reduced motion and no-JS: four stacked beat cards, each a still of that
 * stage in a CSS pane, then the end block on paper.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { gsap, ScrollTrigger, useGSAP, MQ, EASE, type MotionConditions } from "@/lib/motion/gsap";
import { useScrollTo } from "@/components/motion/SmoothScroll";
import Reveal from "@/components/motion/Reveal";
import RevealHeading from "@/components/motion/RevealHeading";
import ThreeStage from "@/components/three/ThreeStage";
import CssPane from "@/components/showcase/primitives/CssPane";
import DayRail, { type DayRailHandle } from "@/components/showcase/primitives/DayRail";
import { useVisitor } from "@/lib/showcase/visitor";
import { useAiCopy } from "@/lib/showcase/aiCopy";
import { track } from "@/lib/showcase/analytics";
import { DAY_TICKS, PROCESS_BEATS, SEVEN_DAYS_COPY } from "@/lib/showcase/content";
import { getSketchLayout, type SketchBlockId, type SketchStage } from "@/lib/showcase/sketch";
import type { LaminationHandle, LaminationProps } from "./seven-days/contract";
import CssModel, { type CssModelHandle, type ModelHover } from "./seven-days/CssModel";
import Annotation, { type AnnotationHandle } from "./seven-days/Annotation";
import DayNumeral, { type DayNumeralHandle } from "./seven-days/DayNumeral";
import SketchStill, { STILL_VIEW } from "./seven-days/SketchStill";
import { loadLamination } from "./seven-days/loadScene";
import {
  BEAT_OF_DAY,
  DAY_TARGET_P,
  P,
  beatAt,
  createStore,
  dayAt,
  type SevenStore,
} from "./seven-days/model";
import styles from "./seven-days/SevenDays.module.css";

const RAIL_TICKS = DAY_TICKS.map((t) => ({ label: t.label, day: `D${t.day}` }));

/** Stacked cards: which still each beat shows, its day and the numeral weight. */
const CARDS: readonly { stage: SketchStage; day: number; weight: number; tick: number }[] = [
  { stage: 0, day: 1, weight: 200, tick: 0 },
  { stage: 2, day: 3, weight: 400, tick: 2 },
  { stage: 3, day: 4, weight: 600, tick: 3 },
  { stage: 4, day: 7, weight: 800, tick: 6 },
];

/** URL typing speed when the site goes live. */
const TYPE_MS_PER_CHAR = 28;

/**
 * Phones held sideways get the two-column stage (kept in sync with
 * SevenDays.module.css). Everything else under 1024px with motion allowed
 * gets the stage on top.
 */
const SIDE_Q = "(max-width: 1023.98px) and (orientation: landscape) and (max-height: 600px)";

type ScrubMode = "desk" | "side" | "top";

/** The architect's 3/4 view each layout swings to. Portrait is narrower, so less azimuth. */
const CAMERA: Record<ScrubMode, { az: number; el: number }> = {
  desk: { az: 35, el: 28 },
  side: { az: 35, el: 28 },
  top: { az: 26, el: 30 },
};

/** The phone offer bar (StickyOfferBar): when it may show, and its resting height. */
const OFFER_BAR_Q = "(max-width: 767.98px), (pointer: coarse)";
const OFFER_BAR_H = 56;

/** Where the caption reading line sits inside the window under the top stage (0 top … 1 bottom). */
const READ_AT = 0.45;

function Padlock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 14" aria-hidden="true" focusable="false">
      <path data-shackle d="M3.2 6.2V4.4a2.8 2.8 0 0 1 5.6 0v1.8" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1.2" y="6.2" width="9.6" height="7" rx="1.6" fill="currentColor" />
    </svg>
  );
}

function Tick() {
  return (
    <svg className={styles.tick} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path data-tick d="M3 8.6 6.4 12 13 4.6" />
    </svg>
  );
}

export default function SevenDays() {
  const visitor = useVisitor();
  const ai = useAiCopy();
  const scrollTo = useScrollTo();

  const copy =
    ai.status === "done" && ai.copy && ai.forName === visitor.name && ai.forSector === visitor.sector
      ? ai.copy
      : null;

  const modelInput = useMemo(
    () => ({
      name: visitor.name,
      display: visitor.display,
      domain: visitor.domain,
      sector: visitor.sector,
      copy,
    }),
    [visitor.name, visitor.display, visitor.domain, visitor.sector, copy],
  );

  const sectionRef = useRef<HTMLElement>(null);
  const stageColRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const stageBoxRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const paperStickyRef = useRef<HTMLDivElement>(null);
  const stagePaperRef = useRef<HTMLDivElement>(null);
  const progFillRef = useRef<HTMLSpanElement>(null);
  const progLabelRef = useRef<HTMLSpanElement>(null);
  const modelRef = useRef<CssModelHandle>(null);
  const annotRef = useRef<AnnotationHandle>(null);
  const numeralRef = useRef<DayNumeralHandle>(null);
  const railRef = useRef<DayRailHandle>(null);
  const previewChipRef = useRef<HTMLDivElement>(null);
  const liveChipRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const bloomRef = useRef<HTMLSpanElement>(null);
  const beatRefs = useRef<(HTMLElement | null)[]>([]);

  const glRef = useRef<LaminationHandle | null>(null);
  const [glLive, setGlLive] = useState(false);
  const [railVisible, setRailVisible] = useState(false);
  const [railTone, setRailTone] = useState<"ink" | "paper">("ink");
  /** True while a sticky stage is the layout (drives the CSS model). */
  const [sticky, setSticky] = useState(false);

  const storeRef = useRef<SevenStore>(createStore());
  const inputRef = useRef(modelInput);

  /* ── Hover label (shared by the CSS model and the WebGL scene) ────── */
  const showTip = useCallback((hit: { label: string; x: number; y: number } | null) => {
    const tip = tipRef.current;
    const box = stageBoxRef.current;
    if (!tip || !box) return;
    if (!hit) {
      gsap.to(tip, { autoAlpha: 0, duration: 0.1, ease: "none", overwrite: "auto" });
      return;
    }
    if (tip.textContent !== hit.label) tip.textContent = hit.label;
    const maxX = box.clientWidth - tip.offsetWidth - 12;
    const x = Math.max(12, Math.min(maxX, hit.x + 16));
    const y = Math.max(12, hit.y - tip.offsetHeight - 14);
    gsap.set(tip, { x, y });
    gsap.to(tip, { autoAlpha: 1, duration: 0.15, ease: "none", overwrite: "auto" });
  }, []);

  const onModelHover = useCallback((hit: ModelHover | null) => showTip(hit), [showTip]);

  const onSceneHover = useCallback<NonNullable<LaminationProps["onHover"]>>(
    (hit) => showTip(hit ? { label: hit.label, x: hit.x, y: hit.y } : null),
    [showTip],
  );

  // p and launchT are pushed by the timeline on every update, not via React.
  const sceneProps = useMemo(() => {
    const props: Partial<LaminationProps> = {
      name: modelInput.name,
      display: modelInput.display,
      domain: modelInput.domain,
      sector: modelInput.sector,
      copy: modelInput.copy,
      onHover: onSceneHover,
    };
    return props as Record<string, unknown>;
  }, [modelInput, onSceneHover]);
  const scenePropsRef = useRef(sceneProps);
  useEffect(() => {
    inputRef.current = modelInput;
    scenePropsRef.current = sceneProps;
  }, [modelInput, sceneProps]);

  const onSceneReady = useCallback((h: unknown) => {
    const handle = h as LaminationHandle;
    glRef.current = handle;
    const s = storeRef.current;
    handle.setProps?.({ ...scenePropsRef.current, p: s.p, launchT: s.launchT });
    setGlLive(true);
  }, []);
  const onSceneDowngrade = useCallback(() => {
    glRef.current = null;
    setGlLive(false);
  }, []);

  /* ── The master timeline and its triggers ─────────────────────────── */
  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      function buildScrub(section: HTMLElement, mode: ScrubMode): () => void {
        const store = createStore();
        storeRef.current = store;
        setSticky(true);
        section.dataset.mode = mode;
        /** Below 1024 the stage carries its own compact progress; the rail stays off. */
        const compact = mode !== "desk";
        const cam = CAMERA[mode];
        const ticks = Array.from(section.querySelectorAll<SVGPathElement>("[data-tick]"));
        const previewChip = previewChipRef.current;
        const liveChip = liveChipRef.current;
        const paper = paperRef.current;
        const paperSticky = paperStickyRef.current;
        const stagePaper = mode === "top" ? stagePaperRef.current : null;
        const progFill = compact ? progFillRef.current : null;
        const progLabel = compact ? progLabelRef.current : null;
        gsap.set(ticks, { drawSVG: "0%" });
        gsap.set([previewChip, liveChip], { autoAlpha: 0, y: 12 });

        let annotPlaced = false;
        let wipePlaced = false;
        let lastBeat = -1;
        let lastWipe = "";
        let lastFill = "";
        let lastDay = -1;
        let ground: "ink" | "paper" = "ink";
        let lightsOn = false;
        let litOn = false;
        let previewShown = false;
        let previewHidden = false;
        let previewTimer: gsap.core.Tween | null = null;

        const placeAnnotation = () => {
          const box = stageBoxRef.current;
          if (!box) return;
          let rect: { x: number; y: number; w: number; h: number } | null = null;
          if (glRef.current) {
            try {
              rect = glRef.current.projectRect("headline" as SketchBlockId);
            } catch {
              rect = null;
            }
          } else if (modelRef.current) {
            // Measure at the un-revised pose so the loop sits where the headline was.
            const s = storeRef.current;
            modelRef.current.apply({ ...s, rev: 0 });
            rect = modelRef.current.rectOf("headline", box);
            modelRef.current.apply(s);
          }
          annotRef.current?.place(rect);
          annotPlaced = !!rect;
        };

        /**
         * Centre of the lights-on circle. Desk / side: the stage column's centre.
         * Top: the squared-up pane's centre, measured once the wipe starts (the
         * stage is stuck by then), applied to the stage's own paper layer and to
         * the section's viewport-sized one, so the two read as one circle.
         */
        const placeWipe = () => {
          const box = stageBoxRef.current;
          if (!box || !paper) return;
          if (mode !== "top") {
            const sr = section.getBoundingClientRect();
            const br = box.getBoundingClientRect();
            paper.style.setProperty("--wx", `${Math.round(br.left - sr.left + br.width / 2)}px`);
            paper.style.setProperty("--wy", `${Math.round(br.height / 2)}px`);
            wipePlaced = true;
            return;
          }
          if (!stagePaper || !paperSticky) return;
          const c = modelRef.current?.centreOf(box) ?? { x: box.clientWidth / 2, y: box.clientHeight / 2 };
          const br = box.getBoundingClientRect();
          const vx = br.left + c.x;
          const vy = br.top + c.y;
          const vw = document.documentElement.clientWidth;
          // The layer's own box, not the viewport: it is taller than the
          // window (so it still covers once the iOS toolbar slides away),
          // and its top is 0 while it is stuck, so the coordinates match.
          const H = Math.max(paperSticky.offsetHeight, window.innerHeight);
          const reach = `${Math.ceil(Math.hypot(Math.max(vx, vw - vx), Math.max(vy, H - vy)) + 24)}px`;
          stagePaper.style.setProperty("--wx", `${Math.round(c.x)}px`);
          stagePaper.style.setProperty("--wy", `${Math.round(c.y)}px`);
          stagePaper.style.setProperty("--wmax", reach);
          paperSticky.style.setProperty("--wx", `${Math.round(vx)}px`);
          paperSticky.style.setProperty("--wy", `${Math.round(vy)}px`);
          paperSticky.style.setProperty("--wmax", reach);
          wipePlaced = true;
        };

        let tlRef: gsap.core.Timeline | null = null;
        // Writes are batched into the next animation frame. ScrollTrigger
        // updates inside the scroll event, and Lenis then reads scrollTop in
        // the same event; writing there would force a synchronous style and
        // layout pass on every scroll frame.
        let queued = false;
        const render = () => {
          queued = true;
        };
        const flush = () => {
          if (!queued) return;
          queued = false;
          draw();
        };
        gsap.ticker.add(flush);
        const draw = () => {
          const s = store;
          if (tlRef) s.p = tlRef.progress();
          modelRef.current?.apply(s);
          const gl = glRef.current;
          if (gl?.setProps) gl.setProps({ ...scenePropsRef.current, p: s.p, launchT: s.launchT });

          const day = dayAt(s.p);
          const whole = Math.min(7, Math.max(1, Math.floor(day + 1e-6)));
          numeralRef.current?.set(day, false, compact ? 25 : 10);
          if (compact) {
            const f = `scaleX(${s.p.toFixed(4)})`;
            if (progFill && f !== lastFill) {
              lastFill = f;
              progFill.style.transform = f;
            }
            if (progLabel && whole !== lastDay) {
              lastDay = whole;
              progLabel.textContent = DAY_TICKS[whole - 1]?.label ?? "";
            }
          } else {
            railRef.current?.setProgress(s.p);
            railRef.current?.setActive(whole - 1);
          }

          const inHold = s.p >= P.holdStart - 0.01 && s.p <= P.holdEnd + 0.01;
          if (inHold && !annotPlaced) placeAnnotation();
          annotRef.current?.progress(s.annot);
          annotRef.current?.fade(1 - s.annotOut);

          if (s.wipe > 0 && !wipePlaced) placeWipe();
          const lights = s.wipe > 0;
          if (lights !== lightsOn) {
            lightsOn = lights;
            if (lights) section.dataset.lights = "";
            else delete section.dataset.lights;
          }
          // Fully lit: drop the circle, so the paper ground never depends on
          // its size or on the iOS toolbar state.
          const lit = s.wipe >= 1;
          if (lit !== litOn) {
            litOn = lit;
            if (lit) section.dataset.lit = "";
            else delete section.dataset.lit;
          }
          const w = s.wipe.toFixed(4);
          if (w !== lastWipe) {
            lastWipe = w;
            paper?.style.setProperty("--wipe", w);
            stagePaper?.style.setProperty("--wipe", w);
          }
          const bloom = bloomRef.current;
          if (bloom) {
            const b = Math.min(1, Math.max(0, (s.p - 0.88) / 0.05)) * (1 - Math.min(1, Math.max(0, (s.p - 0.95) / 0.04)));
            const o = b.toFixed(3);
            if (bloom.style.opacity !== o) bloom.style.opacity = o;
          }

          const nextGround = s.p > P.groundFlip ? "paper" : "ink";
          if (nextGround !== ground) {
            ground = nextGround;
            section.dataset.ground = ground;
            // The rail is hidden below 1024: no React render mid-scroll.
            if (!compact) setRailTone(ground);
          }

          const beat = beatAt(s.p);
          if (beat !== lastBeat) {
            lastBeat = beat;
            beatRefs.current.forEach((el, i) => {
              if (!el) return;
              if (i === beat) el.dataset.active = "true";
              else delete el.dataset.active;
            });
          }

          if (previewShown && previewChip && (s.p > 0.62 || s.p < P.previewChip - 0.04)) {
            if (!previewHidden) {
              previewHidden = true;
              previewTimer?.kill();
              gsap.to(previewChip, { autoAlpha: 0, y: -8, duration: 0.2, ease: "none", overwrite: "auto" });
            }
          }
          if (!previewShown && s.p >= P.previewChip && s.p < 0.62 && previewChip) {
            previewShown = true;
            gsap.to(previewChip, { autoAlpha: 1, y: 0, duration: 0.3, ease: EASE.out, overwrite: "auto" });
            previewTimer = gsap.to(previewChip, {
              autoAlpha: 0,
              y: -8,
              duration: 0.2,
              ease: "none",
              delay: 2.4,
            });
          }
        };

        /**
         * How much of the bottom of the window is covered: the cookie banner
         * (first visit) or the phone offer bar. Heights, not rects, so the
         * banner's entry slide does not skew it. The bar is hidden over the
         * hero, so while it may show it counts at its resting height.
         */
        let lastCover = -1;
        const bottomCover = () => {
          const banner = document.querySelector<HTMLElement>(".consent");
          const bar = document.querySelector<HTMLElement>("[data-offer-bar]");
          const barH = bar
            ? bar.offsetHeight || (window.matchMedia(OFFER_BAR_Q).matches ? OFFER_BAR_H : 0)
            : 0;
          lastCover = Math.max(banner?.offsetHeight ?? 0, barH);
          return lastCover;
        };

        /**
         * Top layout: the scrub runs from the first caption reaching the
         * reading line (just under the stage, in the caption window) to the
         * last one leaving it. Measured from CSS, so it follows svh, the
         * header height and the safe area, and recomputes on every refresh.
         */
        const readLine = () => {
          const el = stickyRef.current;
          if (!el) return Math.round(window.innerHeight * 0.75);
          const stuck = parseFloat(getComputedStyle(el).top) || 0;
          const bottom = stuck + el.offsetHeight;
          const floor = window.innerHeight - bottomCover();
          return Math.round(bottom + Math.max(0, floor - bottom) * READ_AT);
        };
        const beats = beatRefs.current.filter((el): el is HTMLElement => !!el);
        const onRefresh = () => {
          annotPlaced = false;
          wipePlaced = false;
          if (mode !== "top") placeWipe();
          queued = false;
          draw();
        };
        const scrollTrigger: ScrollTrigger.Vars =
          mode === "top" && beats.length
            ? {
                trigger: beats[0],
                endTrigger: beats[beats.length - 1],
                start: () => `top ${readLine()}px`,
                end: () => `bottom ${readLine()}px`,
                scrub: true,
                onRefresh,
              }
            : { trigger: section, start: "top top", end: "bottom bottom", scrub: true, onRefresh };

        const tl = gsap.timeline({ defaults: { ease: "none" }, onUpdate: render, scrollTrigger });

        tlRef = tl;
        const at = (from: Partial<SevenStore>, to: Partial<SevenStore>, start: number, end: number, ease = "none") =>
          tl.fromTo(store, { ...from }, { ...to, duration: end - start, ease, immediateRender: false }, start);

        // Intro: the pane rises and the camera swings to an architect's 3/4 view.
        tl.fromTo(store, { rise: 0 }, { rise: 1, duration: P.introEnd, ease: "power2.out" }, 0);
        tl.fromTo(store, { az: 0, el: 6 }, { az: cam.az, el: cam.el, duration: P.introEnd, ease: "sine.inOut" }, 0);
        // Beat 1: the brief types itself.
        at({ briefT: 0 }, { briefT: 1 }, P.briefStart, P.briefEnd);
        // Beat 2: the brief wipes away, blocks extrude, the grid appears,
        // then type and colour sweep across and the imagery opens.
        at({ briefWipe: 0 }, { briefWipe: 1 }, P.briefWipeStart, P.briefWipeEnd);
        at({ extrude: 0, grid: 0 }, { extrude: 1, grid: 0.35 }, P.extrudeStart, P.extrudeEnd);
        at({ stage: 1 }, { stage: 2 }, P.extrudeEnd, P.typeEnd);
        at({ stage: 2 }, { stage: 3 }, P.typeEnd, P.colourEnd);
        at({ image: 0 }, { image: 1 }, P.imageStart, P.imageEnd);
        // Beat 3: the red pen, then the revision drops the draft into place.
        at({ annot: 0 }, { annot: 1 }, P.annotStart, P.annotEnd);
        at({ rev: 0 }, { rev: 1 }, P.revStart, P.revEnd);
        at({ annotOut: 0 }, { annotOut: 1 }, P.revEnd, P.holdEnd);
        // Beat 4: square up, the laminate presses it flat, lights on.
        at({ az: cam.az, el: cam.el, fov: 30 }, { az: 0, el: 0, fov: 24 }, P.holdEnd, P.squareEnd, "sine.inOut");
        at({ grid: 0.35 }, { grid: 0 }, P.holdEnd, P.holdEnd + 0.06);
        // On top the end block arrives inside the caption window just before
        // p = 1, so the lights finish a moment earlier there.
        at({ wipe: 0 }, { wipe: 1 }, P.wipeStart, mode === "top" ? 0.975 : 1);
        tl.set({}, {}, 1);

        // The site goes live when p crosses 0.90 — a one-shot, not scrubbed.
        // Created after the timeline, so its start reads the refreshed range.
        const liveAt = () => {
          const st = tl.scrollTrigger;
          return st ? Math.round(st.start + P.live * (st.end - st.start)) : 0;
        };
        const typeDur = () => (Math.max(4, inputRef.current.domain.length) * TYPE_MS_PER_CHAR) / 1000;
        let launch: gsap.core.Timeline | null = null;
        const goLive = () => {
          launch?.kill();
          launch = gsap.timeline();
          launch.to(store, { launchT: 1, duration: typeDur(), ease: "none", onUpdate: render }, 0);
          if (liveChip) {
            const lock = liveChip.querySelector("svg");
            const shackle = liveChip.querySelector("[data-shackle]");
            launch.to(liveChip, { autoAlpha: 1, y: 0, duration: 0.3, ease: EASE.out }, typeDur());
            if (lock) launch.fromTo(lock, { scale: 0.9 }, { scale: 1, duration: 0.2, ease: EASE.snap }, typeDur());
            if (shackle) launch.fromTo(shackle, { y: -1.6 }, { y: 0, duration: 0.2, ease: EASE.snap }, typeDur());
          }
          launch.to(ticks, { drawSVG: "0% 100%", duration: 0.3, stagger: 0.08, ease: EASE.out }, 0.05);
          launch.call(() => modelRef.current?.sweep(), [], typeDur());
        };
        const goBack = () => {
          launch?.kill();
          launch = gsap.timeline();
          launch.to(store, { launchT: 0, duration: typeDur() / 1.5, ease: "none", onUpdate: render }, 0);
          if (liveChip) launch.to(liveChip, { autoAlpha: 0, y: 12, duration: 0.2, ease: "none" }, 0);
          launch.to([...ticks].reverse(), { drawSVG: "0%", duration: 0.2, stagger: 0.053, ease: "none" }, 0);
        };
        const liveTrigger = ScrollTrigger.create({
          start: liveAt,
          end: "max",
          onEnter: goLive,
          onLeaveBack: goBack,
        });

        // The desk rail is on while the section holds the screen.
        const railTrigger = compact
          ? null
          : ScrollTrigger.create({
              trigger: section,
              start: "top 60%",
              end: "bottom 40%",
              onToggle: (self) => setRailVisible(self.isActive),
            });

        // Layer promotion only while the section is near the screen.
        const nearTrigger = ScrollTrigger.create({
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => {
            if (self.isActive) section.dataset.near = "true";
            else delete section.dataset.near;
          },
        });

        const onResize = () => {
          annotPlaced = false;
          wipePlaced = false;
        };
        // iOS reports the old size for a moment after rotating; refresh once
        // more after it settles (ScrollTrigger's own resize refresh stays).
        let turnTimer = 0;
        const onTurn = () => {
          window.clearTimeout(turnTimer);
          turnTimer = window.setTimeout(() => ScrollTrigger.refresh(), 400);
        };
        // The cookie banner mounts after hydration and leaves on a choice:
        // re-measure the caption window whenever what covers it changes.
        const onCover = () => {
          if (mode !== "top") return;
          const before = lastCover;
          if (bottomCover() !== before) ScrollTrigger.refresh();
        };
        const coverTimers = [600, 2000].map((ms) => window.setTimeout(onCover, ms));
        // The event fires before React removes the banner: measure after.
        const onConsent = () => coverTimers.push(window.setTimeout(onCover, 80));
        window.addEventListener("gwp-consent", onConsent);
        window.addEventListener("resize", onResize);
        window.addEventListener("orientationchange", onTurn);
        draw();

        return () => {
          gsap.ticker.remove(flush);
          window.removeEventListener("resize", onResize);
          window.removeEventListener("orientationchange", onTurn);
          window.removeEventListener("gwp-consent", onConsent);
          window.clearTimeout(turnTimer);
          coverTimers.forEach((t) => window.clearTimeout(t));
          launch?.kill();
          previewTimer?.kill();
          liveTrigger.kill();
          railTrigger?.kill();
          nearTrigger.kill();
          tl.scrollTrigger?.kill();
          tl.kill();
          delete section.dataset.near;
          delete section.dataset.mode;
          delete section.dataset.lights;
          delete section.dataset.lit;
          section.dataset.ground = "ink";
          paper?.style.removeProperty("--wipe");
          for (const el of [stagePaper, paperSticky]) {
            if (!el) continue;
            for (const v of ["--wipe", "--wx", "--wy", "--wmax"]) el.style.removeProperty(v);
          }
          if (progFill) progFill.style.transform = "";
          beatRefs.current.forEach((el) => {
            if (el) delete el.dataset.active;
          });
          setRailVisible(false);
          setRailTone("ink");
          setSticky(false);
          storeRef.current = createStore();
        };
      }

      function buildStacked(section: HTMLElement): () => void {
        // Stacked layout: the rail is a bar under the header, so it switches
        // on only once the section itself reaches that bar — never over the hero.
        const railTrigger = ScrollTrigger.create({
          trigger: section,
          start: "top 128px",
          end: "bottom 200px",
          onToggle: (self) => setRailVisible(self.isActive),
        });
        // The bar follows the card in the middle of the screen.
        const io = new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (!e.isIntersecting) continue;
              const i = Number((e.target as HTMLElement).dataset.beat ?? 0);
              const card = CARDS[i];
              if (!card) continue;
              railRef.current?.setActive(card.tick);
              railRef.current?.setProgress((card.tick + 1) / 7);
            }
          },
          { rootMargin: "-45% 0px -45% 0px" },
        );
        beatRefs.current.forEach((el) => el && io.observe(el));
        const end = section.querySelector<HTMLElement>("[data-sd-end]");
        const toneTrigger = end
          ? ScrollTrigger.create({
              trigger: end,
              start: "top 40%",
              onToggle: (self) => setRailTone(self.isActive ? "paper" : "ink"),
            })
          : null;
        railRef.current?.setActive(0);
        railRef.current?.setProgress(1 / 7);
        return () => {
          railTrigger.kill();
          toneTrigger?.kill();
          io.disconnect();
          setRailVisible(false);
          setRailTone("ink");
        };
      }

      // motionMedia's queries plus the landscape-phone one, so turning a
      // phone sideways rebuilds the layout (the width alone never crosses 1024).
      const mm = gsap.matchMedia();
      mm.add({ ...MQ, side: SIDE_Q }, (ctx) => {
        const c = ctx.conditions as MotionConditions & { side: boolean };
        if (!c.ok) return buildStacked(section);
        if (c.desktop) return buildScrub(section, "desk");
        return buildScrub(section, c.side ? "side" : "top");
      });
      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  /* ── Navigation ───────────────────────────────────────────────────── */
  const onJump = useCallback(
    (i: number) => {
      const section = sectionRef.current;
      const beat = beatRefs.current[BEAT_OF_DAY[i] ?? 0];
      if (!section || !beat) return;
      const sticky =
        window.matchMedia(MQ.ok).matches && window.matchMedia(MQ.desktop).matches;
      if (!sticky) {
        scrollTo(beat);
        return;
      }
      const top = section.getBoundingClientRect().top + window.scrollY;
      const range = Math.max(1, section.offsetHeight - window.innerHeight);
      const target = top + (DAY_TARGET_P[i] ?? 0) * range;
      const beatTop = beat.getBoundingClientRect().top + window.scrollY;
      scrollTo(beat, { offset: Math.round(target - beatTop) });
    },
    [scrollTo],
  );

  const goTo = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, hash: string) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const el = document.querySelector<HTMLElement>(hash);
      if (!el) return;
      e.preventDefault();
      scrollTo(el);
    },
    [scrollTo],
  );

  // The rail's own skip link is a plain anchor: count it and smooth it here.
  const onSectionClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      if (e.defaultPrevented) return;
      const a = (e.target as HTMLElement).closest?.("a");
      if (!a || a.getAttribute("href") !== "#work") return;
      if (a.textContent?.trim() === SEVEN_DAYS_COPY.skip) track("skip_week");
      goTo(e as MouseEvent<HTMLAnchorElement>, "#work");
    },
    [goTo],
  );

  const onStart = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      track("pricing_from_sketch");
      goTo(e, "#pricing");
    },
    [goTo],
  );

  /* ── Static geometry for the stacked cards ─────────────────────────── */
  const headRect = useMemo(() => {
    const b = getSketchLayout(visitor.sector, "desktop").find((x) => x.id === "headline");
    if (!b) return { x: 64, y: 150, w: 476, h: 158 };
    return { x: b.x * 1024, y: b.y * 640, w: b.w * 1024, h: b.h * 640 };
  }, [visitor.sector]);
  const stillBox = `${STILL_VIEW.x} ${STILL_VIEW.y} ${STILL_VIEW.w} ${STILL_VIEW.h}`;

  const kicker = visitor.hasName ? (
    <>
      {SEVEN_DAYS_COPY.kickerWithName.split("{name}")[0]}
      <span className={styles.kickerName}>{visitor.name}</span>
      {SEVEN_DAYS_COPY.kickerWithName.split("{name}")[1]}
    </>
  ) : (
    SEVEN_DAYS_COPY.kicker
  );

  return (
    <section
      ref={sectionRef}
      id="seven-days"
      data-ground="ink"
      aria-labelledby="sd-title"
      className={styles.root}
      onClick={onSectionClick}
    >
      <div ref={paperRef} className={styles.paper} aria-hidden="true">
        <div ref={paperStickyRef} className={styles.paperSticky} />
      </div>

      <div className={styles.grid}>
        <div className={styles.captions}>
          <header className={styles.intro}>
            <p className={styles.kicker}>{kicker}</p>
            <RevealHeading as="h2" id="sd-title" className={styles.title}>
              {SEVEN_DAYS_COPY.title}
            </RevealHeading>
            <a className={styles.skip} href="#work">
              {SEVEN_DAYS_COPY.skip}
            </a>
          </header>

          {PROCESS_BEATS.map((beat, i) => {
            const card = CARDS[i];
            return (
              <article
                key={beat.id}
                ref={(el) => {
                  beatRefs.current[i] = el;
                }}
                className={styles.beat}
                data-beat={i}
                aria-labelledby={`sd-beat-${beat.id}`}
              >
                <div className={styles.card} aria-hidden="true">
                  <DayNumeral day={card.day} weight={card.weight} className={styles.cardNum} />
                  <CssPane
                    className={styles.cardPane}
                    domain={card.stage === 4 ? visitor.domain : ""}
                    secure={card.stage === 4}
                    label="Sketch"
                  >
                    <SketchStill input={modelInput} stage={card.stage} className={styles.still} />
                    {card.stage === 3 ? <Annotation mode="static" viewBox={stillBox} rect={headRect} /> : null}
                  </CssPane>
                  {beat.chip ? (
                    <span className={`${styles.chip} ${styles.cardChip}`}>
                      {beat.id === "launch" ? <Padlock className={styles.chipLock} /> : <span className={styles.chipDot} />}
                      {beat.chip}
                    </span>
                  ) : null}
                </div>

                <div className={styles.copy}>
                  <span className={styles.rule} aria-hidden="true" />
                  <RevealHeading as="h3" id={`sd-beat-${beat.id}`} className={styles.beatTitle}>
                    {beat.title}
                  </RevealHeading>
                  <Reveal y={16}>
                    <p className={styles.body}>{beat.body}</p>
                    {beat.chip ? <p className={styles.srOnly}>{beat.chip}</p> : null}
                    {beat.note ? (
                      <p className={styles.note}>
                        {beat.note.split("see pricing")[0]}
                        <a href="#pricing" onClick={(e) => goTo(e, "#pricing")}>
                          see pricing
                        </a>
                        {beat.note.split("see pricing")[1]}
                      </p>
                    ) : null}
                    {beat.checklist ? (
                      <ul className={styles.checklist}>
                        {beat.checklist.map((item) => (
                          <li key={item}>
                            <Tick />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </Reveal>
                </div>
              </article>
            );
          })}

          <div className={styles.end} data-ground="paper" data-sd-end="">
            <Reveal y={16} className={styles.endInner}>
              <h3 className={styles.endLine}>{SEVEN_DAYS_COPY.endLine}</h3>
              <div className={styles.ctas}>
                <a className={styles.primary} href="#pricing" onClick={onStart}>
                  {SEVEN_DAYS_COPY.endPrimary}
                </a>
                <a className={styles.secondary} href="#work" onClick={(e) => goTo(e, "#work")}>
                  {SEVEN_DAYS_COPY.endSecondary}
                </a>
              </div>
              <p className={styles.footnote}>{SEVEN_DAYS_COPY.footnote}</p>
            </Reveal>
          </div>
        </div>

        <div ref={stageColRef} className={styles.stageCol} aria-hidden="true">
          <div ref={stickyRef} className={styles.sticky}>
            <div ref={stageBoxRef} className={styles.stageBox}>
              <div ref={stagePaperRef} className={styles.stagePaper} />
              <div className={styles.progress}>
                <span className={styles.progBar}>
                  <span ref={progFillRef} className={styles.progFill} />
                </span>
                <span ref={progLabelRef} className={styles.progLabel}>
                  {DAY_TICKS[0].label}
                </span>
              </div>
              <DayNumeral ref={numeralRef} day={1} className={styles.stageNum} />
              <span ref={bloomRef} className={styles.bloom} aria-hidden="true" />
              <ThreeStage
                className={styles.three}
                poster={
                  <CssModel
                    ref={modelRef}
                    input={modelInput}
                    hostRef={stageBoxRef}
                    onHover={onModelHover}
                    active={sticky && !glLive}
                  />
                }
                load={loadLamination}
                props={sceneProps}
                onReady={onSceneReady}
                onDowngrade={onSceneDowngrade}
              />
              <Annotation mode="live" ref={annotRef} />
              <div ref={previewChipRef} className={`${styles.chip} ${styles.previewChip}`}>
                <span className={styles.chipDot} />
                {PROCESS_BEATS[1].chip}
              </div>
              <div ref={liveChipRef} className={`${styles.chip} ${styles.liveChip}`}>
                <Padlock className={styles.chipLock} />
                {PROCESS_BEATS[3].chip}
              </div>
              <div ref={tipRef} className={styles.tip} />
            </div>
          </div>
        </div>
      </div>

      <DayRail
        ref={railRef}
        ticks={RAIL_TICKS}
        onJump={onJump}
        skipHref="#work"
        skipLabel={SEVEN_DAYS_COPY.skip}
        tone={railTone}
        visible={railVisible}
      />
    </section>
  );
}
