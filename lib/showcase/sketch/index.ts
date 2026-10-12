/**
 * The sketch renderer: the visitor's future homepage, drawn live on a 2D
 * canvas from their business name and sector.
 *
 * Importing this module is SSR-safe. drawSketch / drawSketchAtlas /
 * ensureSketchFonts only do work in the browser.
 */
export type {
  SketchSector,
  SketchStage,
  SketchBlock,
  SketchBlockId,
  SketchInput,
  SketchCopy,
  SketchLayoutKind,
  SectorSpec,
  SectorPalette,
  SectorCard,
} from "./types";
export { SECTORS } from "./templates";
export { getSketchLayout } from "./layout";
export { drawSketch, drawSketchAtlas, sketchVisibleChars, ATLAS_QUADRANT } from "./draw";
export { sketchToHtml } from "./toHtml";
export { ensureSketchFonts } from "./fonts";
