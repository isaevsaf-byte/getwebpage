"use client";

/**
 * The hero stage.
 *
 * Desktop (≥1024): a fan of four panes — the visitor's sketch in front, three
 * real client sites behind. The CSS-3D fan is the server render, the poster
 * and the fallback; on the 'webgl' tier ThreeStage loads hero/HeroScene and
 * fades its canvas in over the fan. The scene is driven only through
 * hero/contract.ts (HeroSceneProps).
 *
 * Mobile (<1024): HeroFanMobile — one draggable CSS-3D sketch pane with two
 * real-site cards behind it in Z, dealt by scroll. three.js is never
 * downloaded there unless the visitor opted into the WebGL experiment
 * (?gl=1, lib/showcase/tier.ts): then the same ThreeStage loads HeroScene's
 * "stack" layout over that poster, in the poster's own camera.
 */

import Image from "next/image";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import ThreeStage from "@/components/three/ThreeStage";
import CssPane from "@/components/showcase/primitives/CssPane";
import { useScrollTo } from "@/components/motion/SmoothScroll";
import { gsap, motionMedia, prefersReducedMotion, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import { useTier } from "@/lib/showcase/tier";
import { FLAGS, getSite, type SiteSlug } from "@/lib/showcase/content";
import type { HeroPaneSlug, HeroSceneProps } from "./contract";
import SketchScreen from "./SketchScreen";
import AiDraft from "./AiDraft";
import { useAiForVisitor } from "./AiButton";
import {
  fireSweep,
  focusNameInput,
  setStageLive,
  useHeroScroll,
  useSketchModel,
  useStageLive,
  useSweep,
} from "./heroBus";
import {
  FAN_CAMERA_TRANSFORM,
  FAN_PANES,
  FAN_PANE_WIDTH,
  FAN_PERSPECTIVE,
  fanPaneTransform,
  fanSketchTilt,
} from "./fanPose";
import styles from "./HeroFan.module.css";

const loadScene = () => import("./HeroScene");

const CAPTION = "In front: your sketch. Behind: sites we've built — live today.";

const TIPS: Record<Exclude<HeroPaneSlug, "sketch">, string> = {
  beautasy: `beautasy.co.uk · ${FLAGS.siteLabels.beautasy} — a family business of our founder`,
  silkbees: `silkbees.co.uk · ${FLAGS.siteLabels.silkbees}`,
  safarisaev: `safarisaev.ai · ${FLAGS.siteLabels.safarisaev} — our founder's own practice`,
};

const ALT: Record<Exclude<HeroPaneSlug, "sketch">, string> = {
  beautasy: "beautasy.co.uk home page, a site we built for a family business of our founder",
  silkbees: "silkbees.co.uk home page, a site we built",
  safarisaev: "safarisaev.ai home page, our founder's own practice",
};

const REST_DESKTOP = fanSketchTilt();

/** Each slot's camera-matched pose (module-level: stable across renders). */
const SLOT_STYLE = Object.fromEntries(
  FAN_PANES.map((def) => [
    def.slug,
    { width: FAN_PANE_WIDTH, transform: fanPaneTransform(def, def.slug !== "sketch") } as CSSProperties,
  ]),
) as Record<HeroPaneSlug, CSSProperties>;

/** Outline draw order: the sketch first, then the real sites front to back. */
const OUTLINE_ORDER: Record<HeroPaneSlug, number> = { sketch: 0, silkbees: 1, safarisaev: 2, beautasy: 3 };
const REST_MOBILE = { x: 3, y: -9 };
const FLAT = { x: 0, y: 0 };

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

function tipFor(slug: HeroPaneSlug, domain: string): string {
  return slug === "sketch" ? `${domain} · your sketch` : TIPS[slug];
}

/** Hover a real pane → its tooltip; click → #work + 'gwp:site-focus'. */
function useSelect() {
  const scrollTo = useScrollTo();
  const last = useRef({ slug: "", t: 0 });
  return useCallback(
    (slug: HeroPaneSlug) => {
      const now = performance.now();
      // The scene and the host click listener may both report one click.
      if (last.current.slug === slug && now - last.current.t < 400) return;
      last.current = { slug, t: now };
      if (slug === "sketch") {
        focusNameInput();
        return;
      }
      // Scroll first: RealSites listens for the event and refines the target
      // to the row, and the last scrollTo wins.
      scrollTo("#work");
      window.dispatchEvent(new CustomEvent<string>("gwp:site-focus", { detail: slug }));
    },
    [scrollTo],
  );
}

/**
 * Tween the pane's --rx/--ry from the previous resting tilt to the new one
 * (commit flattens the sketch). React writes the new values; we animate from
 * the old ones before paint, so there is no jump.
 */
function useTiltTween(pane: React.RefObject<HTMLDivElement | null>, tilt: { x: number; y: number }) {
  const prev = useRef(tilt);
  useLayoutEffect(() => {
    const from = prev.current;
    prev.current = tilt;
    const el = pane.current;
    if (!el || (from.x === tilt.x && from.y === tilt.y)) return;
    if (prefersReducedMotion()) return;
    gsap.fromTo(
      el,
      { "--rx": from.x, "--ry": from.y },
      { "--rx": tilt.x, "--ry": tilt.y, duration: 0.9, ease: "studio-out", overwrite: "auto" },
    );
  }, [pane, tilt]);
}

/* ------------------------------------------------------------------ */
/* Desktop                                                             */
/* ------------------------------------------------------------------ */

export default function HeroFan() {
  const tier = useTier();
  const live = useStageLive();
  const model = useSketchModel();
  const sweep = useSweep();
  const scroll = useHeroScroll(tier === "webgl");
  const select = useSelect();
  const { status: aiStatus } = useAiForVisitor();
  const drafting = aiStatus === "writing" || aiStatus === "done";

  const wrapRef = useRef<HTMLDivElement>(null);
  const fanRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const sketchPaneRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<HeroPaneSlug | null>(null);
  const [tip, setTip] = useState<HeroPaneSlug | null>(null);
  const [paused, setPaused] = useState(false);

  const { visitor, stage, copy, aiWriting, aiStreamed } = model;
  const tilt = visitor.committed ? FLAT : REST_DESKTOP;
  useTiltTween(sketchPaneRef, tilt);

  /** Places the tooltip above a pane's top-left corner (stage-relative px). */
  const placeTip = useCallback((slug: HeroPaneSlug | null, x = 0, y = 0) => {
    hoverRef.current = slug;
    const el = tipRef.current;
    if (el && slug) el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    setTip(slug);
  }, []);

  const onHover = useCallback(
    (hit: { slug: HeroPaneSlug; x: number; y: number } | null) => {
      const wrap = wrapRef.current;
      if (wrap) wrap.style.cursor = hit ? (hit.slug === "sketch" ? "text" : "pointer") : "";
      if (!hit) placeTip(null);
      else placeTip(hit.slug, hit.x, hit.y);
    },
    [placeTip],
  );

  const sceneProps = useMemo(() => {
    const p: HeroSceneProps = {
      name: visitor.name,
      display: visitor.display,
      domain: visitor.domain,
      sector: visitor.sector,
      stage,
      committed: visitor.committed,
      copy,
      aiWriting,
      aiStreamed,
      sweep: sweep.n,
      sweepKind: sweep.kind,
      scroll,
      onHover,
      onSelect: select,
    };
    return p as unknown as Record<string, unknown>;
  }, [visitor, stage, copy, aiWriting, aiStreamed, sweep, scroll, onHover, select]);

  const onReady = useCallback(() => {
    setStageLive(true);
    // ThreeStage hides the poster 500ms after the first frame; stop drawing
    // the CSS sketch once nobody can see it.
    window.setTimeout(() => setPaused(true), 600);
  }, []);

  const onDowngrade = useCallback(() => {
    setStageLive(false);
    setPaused(false);
    placeTip(null);
    if (wrapRef.current) wrapRef.current.style.cursor = "";
  }, [placeTip]);

  useEffect(() => () => setStageLive(false), []);

  // Clicks on the WebGL canvas: the layer ignores pointer events, so the
  // host hears them; the scene reports what is under the pointer via onHover.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !live) return;
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-hero-overlay]")) return;
      if (hoverRef.current) select(hoverRef.current);
    };
    wrap.addEventListener("click", onClick);
    return () => wrap.removeEventListener("click", onClick);
  }, [live, select]);

  // Fine pointer: the CSS fan leans toward the pointer (separate X/Y quickTos).
  useGSAP(
    () => {
      const mm = motionMedia(({ ok, desktop, fine }) => {
        const fan = fanRef.current;
        const section = wrapRef.current?.closest("section");
        if (!ok || !desktop || !fine || !fan || !section) return;
        const ry = gsap.quickTo(fan, "rotationY", { duration: 0.6, ease: "studio-out" });
        const rx = gsap.quickTo(fan, "rotationX", { duration: 0.6, ease: "studio-out" });
        const onMove = (e: PointerEvent) => {
          if (e.pointerType === "touch") return;
          const nx = (e.clientX / window.innerWidth) * 2 - 1;
          const ny = (e.clientY / window.innerHeight) * 2 - 1;
          ry(nx * 5);
          rx(-ny * 3);
        };
        const onLeave = () => {
          ry(0);
          rx(0);
        };
        section.addEventListener("pointermove", onMove, { passive: true });
        section.addEventListener("pointerleave", onLeave, { passive: true });
        return () => {
          section.removeEventListener("pointermove", onMove);
          section.removeEventListener("pointerleave", onLeave);
          gsap.set(fan, { rotationX: 0, rotationY: 0 });
        };
      });
      return () => mm.revert();
    },
    { scope: wrapRef },
  );

  const fine = useRef(false);
  useEffect(() => {
    fine.current = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }, []);

  const enterPane = useCallback(
    (slug: HeroPaneSlug, el: HTMLElement) => {
      if (!fine.current || live) return;
      const wrap = wrapRef.current;
      if (!wrap) return;
      const a = wrap.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      placeTip(slug, b.left - a.left, b.top - a.top);
    },
    [live, placeTip],
  );

  const leavePane = useCallback(() => {
    if (!live) placeTip(null);
  }, [live, placeTip]);

  const poster = (
    <div className={styles.scene} style={{ perspective: FAN_PERSPECTIVE }}>
      <div ref={fanRef} className={styles.lean} data-hero-fan="">
        <div className={styles.fan} style={{ transform: FAN_CAMERA_TRANSFORM }}>
          {FAN_PANES.map((def) => {
            const slotStyle = SLOT_STYLE[def.slug];
            if (def.slug === "sketch") {
              return (
                <div
                  key="sketch"
                  className={cx(styles.slot, styles.slotSketch)}
                  style={slotStyle}
                  onPointerEnter={(e) => enterPane("sketch", e.currentTarget)}
                  onPointerLeave={leavePane}
                  onClick={() => select("sketch")}
                >
                  <CssPane
                    domain={visitor.domain}
                    label={aiWriting ? "Claude writing…" : "SKETCH"}
                    tilt={tilt}
                    paneRef={sketchPaneRef}
                    className={cx(styles.paneRoot, styles.sketchRoot)}
                  >
                    <SketchScreen maxBacking={{ w: 1024, h: 640 }} paused={paused} introSweep />
                    <PaneOutline index={0} />
                  </CssPane>
                </div>
              );
            }
            return (
              <RealPane
                key={def.slug}
                slug={def.slug}
                slotStyle={slotStyle}
                onEnter={enterPane}
                onLeave={leavePane}
                onSelect={select}
              />
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div ref={wrapRef} className={styles.wrap} data-live={live ? "1" : "0"}>
      <ThreeStage
        className={styles.stage}
        poster={poster}
        load={loadScene}
        props={sceneProps}
        onReady={onReady}
        onDowngrade={onDowngrade}
      />
      <div
        ref={tipRef}
        className={styles.tip}
        data-show={tip ? "1" : "0"}
        aria-hidden="true"
        data-hero-overlay=""
      >
        {tip ? tipFor(tip, visitor.domain) : ""}
      </div>
      <div className={styles.foot} data-hero-overlay="" data-draft={drafting ? "1" : "0"}>
        <AiDraft variant="stage" />
        <p className={styles.caption}>{CAPTION}</p>
      </div>
    </div>
  );
}

type RealSlug = Exclude<HeroPaneSlug, "sketch">;

/** A real client site in the fan. Memoised: typing never re-renders it. */
const RealPane = memo(function RealPane({
  slug,
  slotStyle,
  onEnter,
  onLeave,
  onSelect,
}: {
  slug: RealSlug;
  slotStyle: CSSProperties;
  onEnter: (slug: HeroPaneSlug, el: HTMLElement) => void;
  onLeave: () => void;
  onSelect: (slug: HeroPaneSlug) => void;
}) {
  const site = getSite(slug as SiteSlug);
  if (!site) return null;
  return (
    <div
      className={styles.slot}
      style={slotStyle}
      onPointerEnter={(e) => onEnter(slug, e.currentTarget)}
      onPointerLeave={onLeave}
      onClick={() => onSelect(slug)}
    >
      <CssPane domain={site.domain} secure className={styles.paneRoot}>
        <Image
          src={site.pane}
          alt={ALT[slug]}
          fill
          sizes="(min-width: 1024px) 34vw, 1px"
          loading="lazy"
          fetchPriority="low"
          className={styles.shot}
        />
        <PaneOutline index={OUTLINE_ORDER[slug]} />
      </CssPane>
    </div>
  );
});

/** Load-time outline that traces a pane, then fades (CSS keyframes only). */
function PaneOutline({ index }: { index: number }) {
  return (
    <svg
      className={styles.outline}
      style={{ "--o": index } as CSSProperties}
      viewBox="0 0 160 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="0.5"
        y="0.5"
        width="159"
        height="99"
        rx="1.5"
        pathLength={100}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile                                                              */
/* ------------------------------------------------------------------ */

const MOBILE_BACK: { slug: "beautasy" | "silkbees"; cls: string }[] = [
  { slug: "beautasy", cls: styles.mBack },
  { slug: "silkbees", cls: styles.mMid },
];

/**
 * The stack's scroll choreography, for browsers without CSS view timelines
 * (the CSS in HeroFan.module.css is the primary path and mirrors these
 * numbers — keep them in sync). "in" deals the deck as the stack rises into
 * view; "out" tips the rig toward the reader as it leaves.
 */
const DECK = {
  front: { from: { y: 72, z: -40, rotationX: 22 }, to: { y: 0, z: 0, rotationX: 0 } },
  mid: {
    from: { xPercent: 24, yPercent: -16, z: -130, rotation: 7, rotationY: -14 },
    to: { xPercent: 6, yPercent: -8, z: -90, rotation: 0, rotationY: -8 },
  },
  back: {
    from: { xPercent: -24, yPercent: -22, z: -190, rotation: -8, rotationY: 14 },
    to: { xPercent: -6, yPercent: -15, z: -170, rotation: 0, rotationY: 8 },
  },
  rigOut: -10,
} as const;

const HINT_KEY = "gwp:drag-hint";
/** Matches CssPane's drag gain, so the hint turns the pane as a real drag would. */
const HINT_DEG_PER_PX = 0.12;
const IN_OUT = "cubic-bezier(0.76, 0, 0.24, 1)";
const OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

function hintSeen(): boolean {
  try {
    return sessionStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
}

function markHintSeen(): void {
  try {
    sessionStorage.setItem(HINT_KEY, "1");
  } catch {
    // Private mode: the hint may show again next visit; harmless.
  }
}

function supportsViewTimeline(): boolean {
  try {
    return CSS.supports("animation-timeline: view()") && CSS.supports("animation-range: cover 0% cover 50%");
  } catch {
    return false;
  }
}

/** The two real-site cards behind the mobile sketch. Static: never re-renders. */
const MobileBack = memo(function MobileBack() {
  return (
    <>
      {MOBILE_BACK.map(({ slug, cls }) => {
        const site = getSite(slug);
        if (!site) return null;
        return (
          <div key={slug} className={cx(styles.mCard, cls)} data-m-card={slug} aria-hidden="true">
            <CssPane domain={site.domain} secure className={styles.paneRoot}>
              <Image
                src={site.pane}
                alt=""
                fill
                sizes="(max-width: 1023px) 60vw, 1px"
                loading="lazy"
                fetchPriority="low"
                className={styles.shot}
              />
            </CssPane>
          </div>
        );
      })}
    </>
  );
});

/**
 * Phones (<1024, motion allowed):
 * - the deck deals itself as it scrolls into view and tips toward the reader
 *   as it leaves (CSS view timelines on the compositor; GSAP scrub where they
 *   are missing). Transform only, 1:1 with the finger, nothing pinned;
 * - when it lands, one light sweep crosses the sketch, then — once per
 *   session — a fingertip nudges the pane so people find out it turns.
 */
function useMobileDeck(wrapRef: React.RefObject<HTMLDivElement | null>) {
  useGSAP(
    () => {
      const mm = motionMedia(({ ok, desktop }) => {
        const wrap = wrapRef.current;
        if (!ok || desktop || !wrap) return;
        const scene = wrap.querySelector<HTMLElement>("[data-hero-mobile-pane]");
        const rig = wrap.querySelector<HTMLElement>("[data-m-rig]");
        const front = wrap.querySelector<HTMLElement>("[data-m-front]");
        const hintDot = wrap.querySelector<HTMLElement>("[data-m-hint]");
        const mid = wrap.querySelector<HTMLElement>('[data-m-card="silkbees"]');
        const back = wrap.querySelector<HTMLElement>('[data-m-card="beautasy"]');
        if (!scene || !rig || !front || !mid || !back) return;

        if (!supportsViewTimeline()) {
          const layers = [front, mid, back, rig];
          const hint = (on: boolean) => {
            for (const el of layers) el.style.willChange = on ? "transform" : "";
          };
          const deal = gsap.timeline({
            defaults: { ease: "none", duration: 1 },
            scrollTrigger: {
              trigger: scene,
              start: "clamp(top bottom)",
              end: "center 56%",
              scrub: true,
              onToggle: (self) => hint(self.isActive),
            },
          });
          deal.fromTo(front, DECK.front.from, DECK.front.to, 0);
          deal.fromTo(mid, DECK.mid.from, DECK.mid.to, 0);
          deal.fromTo(back, DECK.back.from, DECK.back.to, 0);
          gsap.fromTo(
            rig,
            { rotationX: 0 },
            {
              rotationX: DECK.rigOut,
              ease: "none",
              immediateRender: false,
              scrollTrigger: {
                trigger: scene,
                start: "center 38%",
                end: "bottom top",
                scrub: true,
                onToggle: (self) => hint(self.isActive),
              },
            },
          );
        }

        // Landing: a light sweep, then the one-time drag hint.
        let timer = 0;
        let running: Animation[] = [];
        let touched = false;

        const playHint = () => {
          if (touched || hintSeen() || !hintDot) return;
          // The WebGL stack covers the poster: its drag needs no CSS hint.
          if (wrap.querySelector('[data-stage="live"]')) return;
          const r = front.getBoundingClientRect();
          // Only while the pane is comfortably on screen.
          if (r.top < 56 || r.bottom > window.innerHeight - 24) return;
          markHintSeen();
          const reach = 56;
          const recoil = -30;
          running = [
            front.animate(
              [
                { rotate: "y 0deg", easing: IN_OUT },
                { rotate: `y ${reach * HINT_DEG_PER_PX}deg`, offset: 0.44, easing: IN_OUT },
                { rotate: `y ${recoil * HINT_DEG_PER_PX}deg`, offset: 0.78, easing: IN_OUT },
                { rotate: "y 0deg" },
              ],
              { duration: 1900 },
            ),
            hintDot.animate(
              [
                { opacity: 0, translate: "0 6px", scale: "0.86", easing: OUT },
                { opacity: 1, translate: "0 0", scale: "1", offset: 0.12, easing: IN_OUT },
                { opacity: 1, translate: `${reach}px 0`, scale: "1", offset: 0.44, easing: IN_OUT },
                { opacity: 1, translate: `${recoil}px 0`, scale: "1", offset: 0.78, easing: OUT },
                { opacity: 0, translate: "0 0", scale: "0.92" },
              ],
              { duration: 1900 },
            ),
          ];
        };

        // A real touch always wins: ease the nudge out from where it is.
        const onDown = () => {
          touched = true;
          markHintSeen();
          window.clearTimeout(timer);
          if (!running.length) return;
          const rot = getComputedStyle(front).rotate;
          for (const a of running) a.cancel();
          running = [];
          if (rot && rot !== "none") {
            front.animate([{ rotate: rot }, { rotate: "y 0deg" }], { duration: 260, easing: OUT });
          }
        };
        front.addEventListener("pointerdown", onDown, { passive: true });

        ScrollTrigger.create({
          trigger: scene,
          start: "center 60%",
          once: true,
          onEnter: () => {
            fireSweep("intro");
            if (!hintSeen()) timer = window.setTimeout(playHint, 1500);
          },
        });

        return () => {
          window.clearTimeout(timer);
          for (const a of running) a.cancel();
          front.removeEventListener("pointerdown", onDown);
          for (const el of [front, mid, back, rig]) el.style.willChange = "";
        };
      });
      return () => mm.revert();
    },
    { scope: wrapRef },
  );
}

export function HeroFanMobile() {
  const model = useSketchModel();
  const sweep = useSweep();
  const { visitor, stage, copy, aiWriting, aiStreamed } = model;
  const wrapRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const [paused, setPaused] = useState(false);
  const tilt = visitor.committed ? FLAT : REST_MOBILE;
  useTiltTween(paneRef, tilt);
  useMobileDeck(wrapRef);

  // Only read on the opt-in WebGL tier; harmless props otherwise.
  const sceneProps = useMemo(() => {
    const p: HeroSceneProps = {
      name: visitor.name,
      display: visitor.display,
      domain: visitor.domain,
      sector: visitor.sector,
      stage,
      committed: visitor.committed,
      copy,
      aiWriting,
      aiStreamed,
      sweep: sweep.n,
      sweepKind: sweep.kind,
      scroll: 0,
    };
    return p as unknown as Record<string, unknown>;
  }, [visitor, stage, copy, aiWriting, aiStreamed, sweep]);

  const onReady = useCallback(() => {
    setLive(true);
    // The poster is hidden 500ms after the first frame; stop drawing it.
    window.setTimeout(() => setPaused(true), 600);
  }, []);
  const onDowngrade = useCallback(() => {
    setLive(false);
    setPaused(false);
  }, []);

  const stack = (
    <div className={styles.mScene} data-hero-mobile-pane="">
      <div className={styles.mRig} data-m-rig="" data-ai={aiWriting ? "writing" : "idle"}>
        <MobileBack />
        <div className={styles.mFront} data-m-front="" onClick={() => focusNameInput()}>
          <span className={styles.mAura} aria-hidden="true" />
          <div className={styles.mLift}>
            <CssPane
              domain={visitor.domain}
              label={aiWriting ? "Claude writing…" : "SKETCH"}
              tilt={tilt}
              draggable
              paneRef={paneRef}
              className={styles.paneRoot}
            >
              <SketchScreen maxBacking={{ w: 780, h: 488 }} paused={paused} />
            </CssPane>
          </div>
          <span className={styles.mHint} data-m-hint="" aria-hidden="true" />
        </div>
      </div>
    </div>
  );

  return (
    <div ref={wrapRef} className={styles.mWrap}>
      {/* Full-bleed, so the opt-in canvas can use the gutters; the poster
          inside is centred exactly as before, on every tier. */}
      <div
        className={styles.mStageWrap}
        data-hero-mobile-stage=""
        onClick={live ? () => focusNameInput() : undefined}
      >
        <ThreeStage
          className={styles.mStage}
          poster={stack}
          load={loadScene}
          props={sceneProps}
          onReady={onReady}
          onDowngrade={onDowngrade}
        />
      </div>
      <AiDraft variant="flow" className={styles.mDraft} />
      <p className={styles.mCaption}>{CAPTION}</p>
    </div>
  );
}
