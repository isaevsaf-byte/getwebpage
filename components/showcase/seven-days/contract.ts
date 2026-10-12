/**
 * CONTRACT between SevenDays.tsx (DOM, owns the scrub timeline) and
 * seven-days/LaminationScene.ts (WebGL). SevenDays passes these via
 * <ThreeStage props={…}> and reads the handle from onReady.
 */
import type { SceneHandle } from "@/lib/three/types";
import type { Sector } from "@/lib/showcase/visitor";
import type { SketchBlockId, SketchCopy } from "@/lib/showcase/sketch";

export interface LaminationProps {
  /** Master progress 0..1 over the whole section (scrubbed, ease none). */
  p: number;
  name: string;
  display: string;
  domain: string;
  sector: Sector;
  copy?: SketchCopy | null;
  /**
   * 0..1 URL-typing progress for the launch beat. Not scrubbed: SevenDays
   * tweens it when p crosses 0.90 (and reverses it on leaveBack).
   */
  launchT: number;
  /** Hovered block (fine pointer). x/y: CSS px within the stage host. */
  onHover?: (hit: { blockId: SketchBlockId; label: string; x: number; y: number } | null) => void;
}

export interface LaminationHandle extends SceneHandle {
  /**
   * Screen-space rect (CSS px within the stage host) of a block's top face at
   * the current camera — SevenDays positions the Day-4 annotation SVG over it.
   * Recompute on resize and ScrollTrigger refresh only, not per frame.
   */
  projectRect(blockId: SketchBlockId): { x: number; y: number; w: number; h: number } | null;
}
