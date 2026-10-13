/**
 * RealSites local constants. Facts (domains, labels, subs) come from
 * lib/showcase/content — this file only holds layout numbers for the captures.
 */
import type { SiteSlug } from "@/lib/showcase/content";

/** Pixel height of each 1280-wide `{slug}-tall.webp` (scripts/capture-showcase.js). */
export const TALL_HEIGHT: Record<SiteSlug, number> = {
  beautasy: 4096,
  bektothefuture: 4096,
  silkbees: 4096,
  safarisaev: 2255,
};

export const TALL_WIDTH = 1280;

/** Resting tilt of the desktop pane, degrees (spec: x 4°, y −8°). */
export const PANE_TILT = { x: 4, y: -8 } as const;

/** Row index of the dashed "Next project" row. */
export const NEXT_INDEX = 4;

/** True when the two-column sticky stage layout is on screen. */
export function isStageLayout(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      document.documentElement.classList.contains("fine-desktop") &&
      window.matchMedia("(min-width: 1024px)").matches
    );
  } catch {
    return false;
  }
}

/** Fraction of a tall capture visible in a 16:10 screen of the same width. */
export function visibleFraction(height: number): number {
  return Math.min(1, (TALL_WIDTH * 10) / 16 / height);
}

/** Share of a 780×1688 phone capture visible in a 4:3 card screen. */
export const PHONE_FRAC = (0.75 * 780) / 1688;

/** Native height / width of the mobile sketch in the "Next" card (ATLAS_QUADRANT.mobile). */
export const SKETCH_MOBILE_ASPECT = 1108 / 512;

/**
 * How far (share of the capture's height) each phone capture may scroll in
 * its card. The default runs to the bottom; safarisaev's capture ends in
 * blank page, so it stops on the last buttons.
 */
export const PHONE_TRAVEL: Partial<Record<SiteSlug, number>> = {
  safarisaev: 0.5,
};
