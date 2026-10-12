/**
 * CONTRACT between Hero.tsx (DOM, owns state) and hero/HeroScene.ts (WebGL).
 * Hero passes these as <ThreeStage props={…}>; the scene receives them in
 * setProps(). Read-only for both agents — change it only by agreement.
 */
import type { Sector } from "@/lib/showcase/visitor";
import type { SketchCopy, SketchStage } from "@/lib/showcase/sketch";

export type HeroPaneSlug = "sketch" | "beautasy" | "silkbees" | "safarisaev";

/** Which kind of light event the sketch pane should play. */
export type HeroSweepKind = "intro" | "type" | "commit" | "sector" | "ai";

export interface HeroSceneProps {
  name: string;
  display: string;
  domain: string;
  sector: Sector;
  /** 3 before the visitor commits a name, 4 after. */
  stage: SketchStage;
  committed: boolean;
  /** AI-written copy for the sketch, when the visitor asked for it. */
  copy?: SketchCopy | null;
  /** True while Claude is writing — the scene shows its "AI at work" effect. */
  aiWriting: boolean;
  /** Partial tagline streamed so far (drawn into the sketch as it arrives). */
  aiStreamed: string;
  /** Increments every time Hero wants a sweep; the scene plays `sweepKind` once per change. */
  sweep: number;
  sweepKind: HeroSweepKind;
  /** 0..1 scroll-out progress of #top (scrubbed by Hero's ScrollTrigger). */
  scroll: number;
  /**
   * Fine-pointer hover over a pane. x/y are CSS px relative to the stage host,
   * at the projected top-left of the pane; null when nothing is hovered.
   */
  onHover?: (hit: { slug: HeroPaneSlug; x: number; y: number } | null) => void;
  /** Click on a pane. Hero focuses the input for 'sketch', scrolls to #work otherwise. */
  onSelect?: (slug: HeroPaneSlug) => void;
}
