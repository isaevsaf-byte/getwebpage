"use client";

/**
 * Phones with motion (<768px): the four sites and the "Next" card stack into
 * a deck. CSS does the stacking (each row is position: sticky, 8px lower than
 * the one before, from first paint — see "The deck" in RealSites.module.css);
 * this hook only adds what the scroll should feel like:
 *
 * - a card rises tilted back and straightens as it arrives (the pane's
 *   --rx/--ry, so CssPane's sheen slides across the glass);
 * - once its pane is fully on screen, the real site scrolls inside the glass
 *   1:1 with the page, with a scrollbar thumb — the phone version of the
 *   desktop's sticky pane — until the next card covers it;
 * - a bar of light crosses the glass as a card lands;
 * - the card underneath steps back (scale + a paper wash) as the next one
 *   slides over it. The "Next" card's sketch scrolls the same way.
 *
 * Every trigger works in absolute scroll positions measured from the list,
 * which never sticks, so a refresh while a card is stuck measures correctly.
 * Transforms and opacity only. Reduced motion never gets here (the media
 * query), and without JS the deck still stacks — it just doesn't move.
 */

import type { RefObject } from "react";
import { gsap, ScrollTrigger, useGSAP, EASE } from "@/lib/motion/gsap";
import { SKETCH_MOBILE_ASPECT } from "./sites";
import styles from "./RealSites.module.css";

/** Mirrors the CSS that turns the deck on. */
export const DECK_MQ = "(max-width: 767.98px) and (prefers-reduced-motion: no-preference)";
/** The offer bar and a little air at the bottom of the screen. */
const BOTTOM_CLEAR = 76;

type Geo = { top: number[]; h: number[]; T: number[]; paneBottom: number[] };

export function useCardDeck(rootRef: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const mm = gsap.matchMedia();

      mm.add(DECK_MQ, () => {
        if (!document.documentElement.classList.contains("motion-ok")) return;
        const list = root.querySelector<HTMLElement>(`.${styles.rows}`);
        const rows = list ? Array.from(list.querySelectorAll<HTMLElement>(":scope > [data-row]")) : [];
        if (!list || rows.length < 2) return;
        const last = rows.length - 1;

        /* Geometry, re-measured on every ScrollTrigger refresh. */
        let geo: Geo | null = null;
        const G = (): Geo => {
          if (geo) return geo;
          const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
          let y = list.getBoundingClientRect().top + window.scrollY;
          const g: Geo = { top: [], h: [], T: [], paneBottom: [] };
          rows.forEach((row, i) => {
            const h = row.offsetHeight;
            g.top[i] = y;
            g.h[i] = h;
            y += h + gap;
            // Lets CSS raise a card that would not fit under the header.
            row.style.setProperty("--rs-h", `${h}px`);
          });
          rows.forEach((row, i) => {
            g.T[i] = parseFloat(getComputedStyle(row).top) || 0;
            const pane = row.querySelector<HTMLElement>(`.${styles.cardPane}`);
            g.paneBottom[i] = pane ? pane.offsetTop + pane.offsetHeight : g.h[i] * 0.6;
          });
          geo = g;
          return g;
        };
        const stale = () => {
          geo = null;
        };
        ScrollTrigger.addEventListener("refreshInit", stale);

        const vh = () => window.innerHeight;
        /** Scroll position at which row i lands (sticks). */
        const land = (i: number) => G().top[i] - G().T[i];
        /** Scroll position at which row i's top meets the bottom of row i-1. */
        const touch = (i: number) => G().top[i] - G().T[i - 1] - G().h[i - 1];

        const cleanups: (() => void)[] = [];
        /** A compositor layer only while a scrub is live, so idle cards cost no GPU memory. */
        const layerWhileActive =
          (els: [HTMLElement | null | undefined, string][]) => (self: ScrollTrigger) => {
            for (const [el, prop] of els) if (el) el.style.willChange = self.isActive ? prop : "";
          };

        rows.forEach((row, i) => {
          const card = row.querySelector<HTMLElement>("[data-deck-card]");
          const pane = row.querySelector<HTMLElement>(`.${styles.cardPaneInner} > div`);
          const wash = row.querySelector<HTMLElement>("[data-wash]");
          const shade = row.querySelector<HTMLElement>("[data-shade]");
          const sweep = row.querySelector<HTMLElement>("[data-card-sweep]");

          // 1 — arrive: tilted back, straightening as the card rises.
          if (pane) {
            gsap.fromTo(
              pane,
              { "--rx": 16, "--ry": -9 },
              {
                "--rx": 0,
                "--ry": 0,
                ease: "none",
                scrollTrigger: {
                  start: () => G().top[i] - vh(),
                  end: () => G().top[i] - vh() * 0.4,
                  scrub: true,
                  invalidateOnRefresh: true,
                },
              },
            );
          }

          // 2 — the site scrolls in the glass while its pane is in full view.
          const shot = row.querySelector<HTMLElement>("[data-card-shot]");
          const thumb = row.querySelector<HTMLElement>("[data-card-thumb]");
          const canvas = row.querySelector<HTMLElement>("[data-sketch-canvas]");
          const screen = (shot ?? canvas?.parentElement)?.parentElement ?? null;
          const inner = shot ?? canvas;
          if (inner && screen) {
            const travel = () => {
              const sh = screen.clientHeight;
              const ih = shot ? shot.offsetHeight : screen.clientWidth * SKETCH_MOBILE_ASPECT;
              // The sketch canvas is drawn shifted up by its own chrome; keep that
              // crop (about 4% before the first draw has positioned it).
              const top = parseFloat(canvas?.style.top || "");
              const lead = shot ? 0 : Number.isFinite(top) ? Math.max(0, -top) : ih * 0.04;
              const cap = Number(shot?.dataset.travel) || 1;
              return -Math.max(0, Math.min(ih - lead - sh, ih * cap));
            };
            const start = () => G().top[i] + G().paneBottom[i] - (vh() - BOTTOM_CLEAR);
            const end = () => {
              const s = start();
              // Until the next card reaches the pane's bottom edge; the last card
              // scrolls through its hold instead.
              const e =
                i < last
                  ? G().top[i + 1] - G().T[i] - G().paneBottom[i] - 24
                  : land(i) + Math.max(160, vh() * 0.22);
              return Math.max(s + 160, e);
            };
            const tl = gsap.timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                start,
                end,
                scrub: true,
                invalidateOnRefresh: true,
                onToggle: layerWhileActive([
                  [inner, "transform"],
                  [thumb, "transform"],
                ]),
              },
            });
            tl.fromTo(inner, { y: 0 }, { y: travel }, 0);
            if (thumb) {
              const bar = thumb.parentElement ?? screen;
              tl.fromTo(
                thumb,
                { yPercent: 0 },
                {
                  yPercent: () => {
                    const full = bar.clientHeight / Math.max(1, thumb.offsetHeight) - 1;
                    const ih = shot ? shot.offsetHeight : 1;
                    const range = Math.max(1, ih - screen.clientHeight);
                    return full * Math.min(1, -travel() / range) * 100;
                  },
                },
                0,
              );
            }
          }

          // 3 — a bar of light crosses the glass as the card lands.
          if (sweep) {
            gsap.set(sweep, { autoAlpha: 0 });
            ScrollTrigger.create({
              start: () => land(i) - 2,
              onEnter: () => {
                gsap.fromTo(
                  sweep,
                  { xPercent: -100, autoAlpha: 1 },
                  {
                    xPercent: 240,
                    duration: 0.7,
                    ease: EASE.inOut,
                    overwrite: true,
                    onStart: () => {
                      sweep.style.willChange = "transform";
                    },
                    onComplete: () => {
                      sweep.style.willChange = "";
                      gsap.set(sweep, { autoAlpha: 0 });
                    },
                  },
                );
              },
            });
          }

          // 4 — stepping back under the next card.
          if (i < last && card && wash) {
            const next = rows[i + 1];
            const nextShade = next.querySelector<HTMLElement>("[data-shade]");
            const tl = gsap.timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                start: () => touch(i + 1),
                end: () => Math.max(touch(i + 1) + 1, land(i + 1)),
                scrub: true,
                invalidateOnRefresh: true,
                onToggle: layerWhileActive([
                  [card, "transform"],
                  [wash, "opacity"],
                  [nextShade, "opacity"],
                ]),
              },
            });
            gsap.set(card, { transformOrigin: "50% 0%" });
            tl.fromTo(card, { scale: 1 }, { scale: 0.94 }, 0);
            tl.fromTo(wash, { opacity: 0 }, { opacity: 0.5 }, 0);
            if (nextShade) tl.fromTo(nextShade, { opacity: 0 }, { opacity: 1 }, 0);
          } else if (shade) {
            gsap.set(shade, { opacity: 0 });
          }
        });

        /* A keyboard user tabbing back into a covered card gets it uncovered. */
        const onFocusIn = (e: FocusEvent) => {
          const row = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-row]");
          const i = row ? rows.indexOf(row) : -1;
          if (i < 0 || i === last) return;
          const r = row!.getBoundingClientRect();
          const n = rows[i + 1].getBoundingClientRect();
          if (n.top >= r.bottom - 1) return;
          // Just before the next card starts to cover this one.
          window.scrollTo({ top: Math.max(0, touch(i + 1) - 8), behavior: "instant" });
        };
        list.addEventListener("focusin", onFocusIn);
        cleanups.push(() => list.removeEventListener("focusin", onFocusIn));

        return () => {
          ScrollTrigger.removeEventListener("refreshInit", stale);
          cleanups.forEach((f) => f());
          for (const row of rows) row.style.removeProperty("--rs-h");
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );
}
