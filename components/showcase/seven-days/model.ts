/**
 * SevenDays — the progress map, in one place.
 *
 * Pure (no DOM, no GSAP), so the master timeline, the CSS-3D model, the
 * day numeral and the rail all read the same numbers. `p` is the master
 * progress 0..1 over the whole section (scrubbed 1:1 with scroll).
 */
import type { SketchBlock, SketchBlockId } from "@/lib/showcase/sketch";

/** Progress landmarks (spec: seven-days.motion). */
export const P = {
  introEnd: 0.08,
  briefStart: 0.08,
  briefEnd: 0.25,
  briefWipeStart: 0.232,
  briefWipeEnd: 0.258,
  extrudeStart: 0.25,
  extrudeEnd: 0.4,
  typeEnd: 0.47,
  colourEnd: 0.53,
  imageStart: 0.48,
  imageEnd: 0.55,
  previewChip: 0.52,
  holdStart: 0.55,
  annotStart: 0.57,
  annotEnd: 0.64,
  revStart: 0.64,
  revEnd: 0.7,
  holdEnd: 0.72,
  squareEnd: 0.84,
  lidOn: 0.72,
  lidClosed: 0.895,
  live: 0.9,
  wipeStart: 0.93,
  groundFlip: 0.96,
} as const;

/** The plain object the master timeline tweens. Scenes read it in render(). */
export interface SevenStore {
  p: number;
  /** 0 → 1 pane rise over the intro. */
  rise: number;
  /** Camera azimuth / elevation in degrees, field of view in degrees. */
  az: number;
  el: number;
  fov: number;
  /** Brief typing 0..1 (stage 0). */
  briefT: number;
  /** Brief screen wipe 0..1 (top → bottom, as the blocks start to rise). */
  briefWipe: number;
  /** Extrusion phase 0..1 (each block staggered inside it). */
  extrude: number;
  /** Construction grid opacity 0..0.35. */
  grid: number;
  /** Continuous sketch stage 1..4 for the top faces. */
  stage: number;
  /** Circular imagery reveal 0..1 on the image block. */
  image: number;
  /** Annotation draw 0..1 and its fade-out 0..1. */
  annot: number;
  annotOut: number;
  /** The visible revision 0..1. */
  rev: number;
  /** Lights-on wipe 0..1. */
  wipe: number;
  /** URL typing 0..1 (not scrubbed — tweened when p crosses 0.90). */
  launchT: number;
}

export function createStore(): SevenStore {
  return {
    p: 0,
    rise: 0,
    az: 0,
    el: 6,
    fov: 30,
    briefT: 0,
    briefWipe: 0,
    extrude: 0,
    grid: 0,
    stage: 1,
    image: 0,
    annot: 0,
    annotOut: 0,
    rev: 0,
    wipe: 0,
    launchT: 0,
  };
}

/** The final, fully built state (reduced motion, static renders). */
export function finalStore(): SevenStore {
  return {
    p: 1,
    rise: 1,
    az: 0,
    el: 0,
    fov: 24,
    briefT: 1,
    briefWipe: 1,
    extrude: 1,
    grid: 0,
    stage: 4,
    image: 1,
    annot: 1,
    annotOut: 1,
    rev: 1,
    wipe: 1,
    launchT: 1,
  };
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
/** Same curve as studio-out, close enough for per-block shaping. */
export const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

/* ------------------------------------------------------------------ */
/* Days                                                                */
/* ------------------------------------------------------------------ */

/**
 * Continuous day 1..7 for a progress value. The integer part is the day
 * shown; the fraction drives the numeral's weight between whole days.
 * Day 1 → 0.00, 2 → 0.25, 3 → 0.40, 4 → 0.55, 5 → 0.72, 6 → 0.80, 7 → 0.90.
 */
const DAY_KEYS: readonly [number, number][] = [
  [0, 1],
  [0.25, 2],
  [0.4, 3],
  [0.55, 4],
  [0.72, 5],
  [0.8, 6],
  [0.9, 7],
];

export function dayAt(p: number): number {
  if (p <= 0) return 1;
  for (let i = DAY_KEYS.length - 1; i >= 0; i--) {
    const [kp, day] = DAY_KEYS[i];
    if (p >= kp) {
      const next = DAY_KEYS[i + 1];
      if (!next) return day;
      return day + (p - kp) / (next[0] - kp);
    }
  }
  return 1;
}

/** Literata weight for a continuous day: day 1 = 200 … day 7 = 800. */
export const weightForDay = (day: number) => 200 + (Math.min(7, Math.max(1, day)) - 1) * 100;

/** Where the rail jumps to for day index 0..6 (lands mid-day, not on a boundary). */
export const DAY_TARGET_P: readonly number[] = [0.16, 0.33, 0.48, 0.64, 0.76, 0.85, 0.985];

/** Which caption beat (0..3) a rail tick belongs to. */
export const BEAT_OF_DAY: readonly number[] = [0, 1, 1, 2, 3, 3, 3];

/** The beat a progress value is in (for aria-current on captions). */
export function beatAt(p: number): number {
  if (p < P.briefEnd) return 0;
  if (p < P.holdStart) return 1;
  if (p < P.holdEnd) return 2;
  return 3;
}

/* ------------------------------------------------------------------ */
/* Blocks                                                              */
/* ------------------------------------------------------------------ */

/** Stagger of each block's rise inside the extrusion phase (spec: 0.035). */
const EXTRUDE_STAGGER = 0.035;

export interface BlockPlan {
  id: SketchBlockId;
  index: number;
  /** Row index top → bottom, for the flatten cascade. */
  row: number;
  rows: number;
  block: SketchBlock;
}

/** Groups blocks into rows by their top edge (blocks within 4% share a row). */
export function planBlocks(blocks: SketchBlock[]): BlockPlan[] {
  const tops = blocks.map((b) => b.y).sort((a, b) => a - b);
  const rows: number[] = [];
  for (const t of tops) {
    if (!rows.length || t - rows[rows.length - 1] > 0.04) rows.push(t);
  }
  const rowOf = (y: number) => {
    let r = 0;
    for (let i = 0; i < rows.length; i++) if (y >= rows[i] - 0.04) r = i;
    return r;
  };
  return blocks.map((block, index) => ({
    id: block.id,
    index,
    row: rowOf(block.y),
    rows: rows.length,
    block,
  }));
}

/** 0..1 rise of block `index` for an extrusion phase value. */
export function extrudeOf(index: number, count: number, extrude: number): number {
  const span = 1 - (count - 1) * EXTRUDE_STAGGER;
  return easeOutQuint(clamp01((extrude - index * EXTRUDE_STAGGER) / span));
}

export interface RevisionOffset {
  /** Normalised to the sketch width / height (y down). */
  dx: number;
  dy: number;
  /** Lift toward the viewer, sketch-width units. */
  dz: number;
  /** Degrees. */
  rz: number;
}

const ZERO: RevisionOffset = { dx: 0, dy: 0, dz: 0, rz: 0 };

/**
 * The visible revision, mirrored from the WebGL scene so both tiers tell the
 * same story: the draft sits slightly wrong — the headline 3% to the left,
 * the two buttons the wrong way round — and the Day-4 revision slides the
 * headline home while the buttons swap back along a 3D arc.
 * `rev` 0 = draft, 1 = revised (in its socket).
 */
export function revisionOffsets(
  blocks: SketchBlock[],
  rev: number,
): Partial<Record<SketchBlockId, RevisionOffset>> {
  const t = easeInOutCubic(clamp01(rev));
  const arc = Math.sin(Math.PI * t);
  const out: Partial<Record<SketchBlockId, RevisionOffset>> = {};
  const head = blocks.find((b) => b.id === "headline");
  if (head) out.headline = { dx: -0.03 * (1 - t), dy: 0, dz: 0.0138 * arc, rz: 0 };
  const a = blocks.find((b) => b.id === "cta");
  const c = blocks.find((b) => b.id === "cta2");
  if (a && c && Math.abs(a.y - c.y) < 0.01) {
    const [l, r] = a.x < c.x ? [a, c] : [c, a];
    const left = l.x;
    const right = r.x + r.w;
    // Draft: the right button starts at the left edge, the left one ends at the right edge.
    const rDraft = left - r.x;
    const lDraft = right - l.w - l.x;
    const draft: Record<string, number> = { [r.id]: rDraft, [l.id]: lDraft };
    out.cta = { dx: (draft.cta ?? 0) * (1 - t), dy: -0.04 * arc, dz: 0.047 * arc, rz: -4 * arc };
    out.cta2 = { dx: (draft.cta2 ?? 0) * (1 - t), dy: 0.04 * arc, dz: 0, rz: 4 * arc };
  }
  return out;
}

/** Hinge of the laminate sheet, in sketch-height units above the page top. */
export const HINGE_ABOVE = 0.035 * 0.55;

/** Laminate sheet angle in radians: lying open above the page (π) → closed (0). */
export function lidAngle(p: number): number {
  if (p < 0.74) return Math.PI;
  if (p < 0.8) return lerp(Math.PI, (40 * Math.PI) / 180, easeInOutCubic(seg(p, 0.74, 0.8)));
  return Math.atan(Math.tan((40 * Math.PI) / 180) * Math.pow(1 - seg(p, 0.8, 0.895), 1.6));
}

/** tan of the lid angle; effectively infinite while it is open past vertical. */
export function lidTan(a: number): number {
  return a > (89.9 * Math.PI) / 180 ? 1e4 : Math.tan(a);
}

/** 0..1 of p between a and b. */
export function seg(p: number, a: number, b: number): number {
  return clamp01((p - a) / (b - a));
}

export const NO_OFFSET = ZERO;
