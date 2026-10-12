/**
 * Block geometry for the lamination scene and the CSS-3D model.
 * Pure — safe to import on the server.
 */
import { BLOCK_META, BLOCK_ORDER, DESIGN, RECTS } from "./templates";
import type { SketchBlock, SketchLayoutKind, SketchSector } from "./types";

/**
 * The 12 blocks of a sketch, normalised 0..1 of the full canvas (address bar
 * included), in layout order (the order they extrude in). The rects are the
 * exact boxes drawSketch draws each element inside, so a quadrant of the
 * atlas sampled at a block's rect shows that block and nothing else.
 *
 * Returns fresh objects on every call, so callers may mutate them.
 */
export function getSketchLayout(
  sector: SketchSector,
  layout: SketchLayoutKind,
): SketchBlock[] {
  const { w: DW, h: DH } = DESIGN[layout];
  const rects = RECTS[sector][layout];
  return BLOCK_ORDER.map((id) => {
    const [x, y, w, h] = rects[id];
    const meta = BLOCK_META[id];
    return {
      id,
      role: meta.role,
      x: x / DW,
      y: y / DH,
      w: w / DW,
      h: h / DH,
      depth: meta.depth,
      isText: meta.isText,
      isImage: meta.isImage,
      hoverLabel: meta.hoverLabel,
    };
  });
}
