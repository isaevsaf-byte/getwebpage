"use client";

import { useEffect, useRef, type RefObject } from "react";
import { gsap, ScrollTrigger, useGSAP, motionMedia } from "@/lib/motion/gsap";

/** Band height as a share of the screen. Mirrors .band in AuditBand.module.css. */
const BAND = 0.3;
/** Pen marks start once this much of the band has passed them (its top is masked soft). */
const WAKE = 0.55;
const INTRO_S = 2.0;
const REPLAY_S = 1.2;
const REPLAY_DEBOUNCE_MS = 450;

/**
 * The reader pane's one signature moment: an X-ray band sweeps down the page,
 * showing the HTML Claude is given underneath, and the red-pen marks draw in
 * its wake.
 *
 * - Plays once when the pane is mostly in view; replays (shorter) when the
 *   visitor types a new valid address while the pane is on screen.
 * - SSR, no-JS and reduced motion: the final state, marks drawn, band parked
 *   off-screen. From-states are applied here, when the trigger is created.
 * - Transforms only for the band; DrawSVG for the marks; will-change only
 *   while a scan runs.
 */
export function useReaderScan(
  rootRef: RefObject<HTMLElement | null>,
  stageRef: RefObject<HTMLDivElement | null>,
  host: string | null,
) {
  const replay = useRef<(() => void) | null>(null);
  const played = useRef(false);
  const lastHost = useRef<string | null>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      const stage = stageRef.current;
      if (!root || !stage) return;

      const mm = motionMedia(({ ok, desktop, fine }) => {
        if (!ok) return;
        // Phones, tablets and touch screens: the X-ray band follows the
        // scroll instead of playing on its own, so the visitor's thumb moves
        // the reader down the page (and back up). Desktop keeps the timed scan.
        const scrubbed = !(desktop && fine);

        const q = gsap.utils.selector(stage);
        const band = q("[data-band]")[0] as HTMLElement | undefined;
        const code = q("[data-code]")[0] as HTMLElement | undefined;
        const beam = q("[data-beam]")[0] as HTMLElement | undefined;
        const marks = gsap.utils.toArray<SVGPathElement>("[data-mark]", stage);
        const notes = q("[data-note]") as HTMLElement[];
        if (!band || !code || !beam) return;
        const movers = [band, code, beam];

        let tl: gsap.core.Timeline | null = null;
        let scrub: ScrollTrigger | null = null;

        /** The scan as a timeline; sizes are read when it renders (and on refresh). */
        const build = (dur: number, wipe: boolean, paused: boolean) => {
          const H = () => stage.clientHeight;
          const bh = () => band.offsetHeight || H() * BAND;
          const b = bh() / H();
          const lead = wipe ? 0.18 : 0;

          const t = gsap.timeline({
            paused,
            onComplete: paused
              ? undefined
              : () => {
                  gsap.set(movers, { willChange: "auto" });
                },
          });
          if (wipe) t.to([...marks, ...notes], { autoAlpha: 0, duration: lead, ease: "none" }, 0);
          t.set(marks, { drawSVG: "0%", autoAlpha: 1 }, lead)
            .set(notes, { autoAlpha: 0, y: 4 }, lead)
            .fromTo(band, { y: () => -bh() }, { y: H, duration: dur, ease: "none", immediateRender: false }, lead)
            .fromTo(code, { y: bh }, { y: () => -H(), duration: dur, ease: "none", immediateRender: false }, lead)
            .fromTo(beam, { y: 0 }, { y: () => H() + bh(), duration: dur, ease: "none", immediateRender: false }, lead);

          marks.forEach((mark, i) => {
            const f = Number(mark.dataset.y ?? 0) / 100;
            const at = lead + (dur * (f + WAKE * b)) / (1 + b);
            t.to(mark, { drawSVG: "100%", duration: 0.6, ease: "studio-out" }, at);
            const note = notes[i];
            if (note) t.to(note, { autoAlpha: 1, y: 0, duration: 0.35, ease: "studio-out" }, at + 0.2);
          });
          return t;
        };

        const scan = (dur: number, wipe: boolean) => {
          // A timed scan takes over from the scroll for good (a new address).
          scrub?.kill();
          scrub = null;
          tl?.kill();
          gsap.set(movers, { willChange: "transform" });
          tl = build(dur, wipe, false);
        };

        if (scrubbed && !played.current) {
          // From-state now (an unmarked page); the band then rides the scroll
          // from the pane entering to it leaving the upper third.
          gsap.set(marks, { drawSVG: "0%" });
          gsap.set(notes, { autoAlpha: 0, y: 4 });
          tl = build(INTRO_S, false, true);
          scrub = ScrollTrigger.create({
            trigger: stage,
            start: "top 82%",
            end: "bottom 30%",
            scrub: true,
            animation: tl,
            invalidateOnRefresh: true,
            onToggle: (self) => {
              gsap.set(movers, { willChange: self.isActive ? "transform" : "auto" });
              // Once read, a typed address may replay it on a timer.
              if (self.isActive) played.current = true;
            },
          });
        } else if (!played.current) {
          // Intro from-state, applied now (the pane is below the fold): an
          // unmarked page waiting to be read. Skipped if it already played.
          gsap.set(marks, { drawSVG: "0%" });
          gsap.set(notes, { autoAlpha: 0, y: 4 });
          ScrollTrigger.create({
            trigger: root,
            start: "center 72%",
            once: true,
            onEnter: () => {
              played.current = true;
              scan(INTRO_S, false);
            },
          });
        }

        replay.current = () => {
          if (!played.current) return;
          const r = root.getBoundingClientRect();
          if (r.bottom < 0 || r.top > window.innerHeight) return;
          scan(REPLAY_S, true);
        };

        return () => {
          replay.current = null;
          scrub?.kill();
          scrub = null;
          tl?.kill();
          tl = null;
          gsap.set(movers, { clearProps: "transform,willChange" });
          gsap.set(marks, { clearProps: "strokeDasharray,strokeDashoffset,opacity,visibility" });
          gsap.set(notes, { clearProps: "transform,opacity,visibility" });
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  // A new valid address re-reads the page — debounced, once per host.
  useEffect(() => {
    if (!host || host === lastHost.current) return;
    const id = window.setTimeout(() => {
      lastHost.current = host;
      replay.current?.();
    }, REPLAY_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [host]);
}
