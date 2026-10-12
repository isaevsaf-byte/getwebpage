"use client";

/**
 * Atlas images for the CSS-3D model.
 *
 * The sketch atlas (stages 1–4, 2×2) is drawn once per input change and
 * turned into an object URL, so 12 block faces can show their crop of it
 * with plain CSS backgrounds. A second "base" atlas has every block's rect
 * painted out with the colour around it — the bare page the blocks lift
 * off — so when a block moves during the revision there is no ghost of it
 * left behind on the page.
 */
import {
  ATLAS_QUADRANT,
  drawSketchAtlas,
  ensureSketchFonts,
  getSketchLayout,
  type SketchCopy,
  type SketchLayoutKind,
} from "@/lib/showcase/sketch";
import type { Sector } from "@/lib/showcase/visitor";

export interface AtlasInput {
  name: string;
  display: string;
  domain: string;
  sector: Sector;
  copy?: SketchCopy | null;
  layout?: SketchLayoutKind;
}

export interface AtlasUrls {
  atlas: string;
  base: string;
  key: string;
}

export function atlasKey(i: AtlasInput): string {
  const c = i.copy ? JSON.stringify(i.copy) : "";
  return [i.layout ?? "desktop", i.sector, i.name, i.display, i.domain, c].join("|");
}

function toUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    const done = (blob: Blob | null) => {
      if (blob) resolve(URL.createObjectURL(blob));
      else reject(new Error("toBlob failed"));
    };
    try {
      canvas.toBlob(done, "image/webp", 0.92);
    } catch (err) {
      reject(err);
    }
  });
}

/** Waits until the browser has decoded an image URL, so swapping it in never flashes. */
async function decoded(url: string): Promise<void> {
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    /* still usable */
  }
}

/**
 * Draws the atlas + base atlas and returns object URLs for both. The caller
 * owns the URLs (revoke the previous pair once the new one is on screen).
 */
export async function buildAtlasUrls(input: AtlasInput): Promise<AtlasUrls> {
  const layout: SketchLayoutKind = input.layout ?? "desktop";
  await ensureSketchFonts(input.display);
  const canvas = document.createElement("canvas");
  drawSketchAtlas(canvas, {
    name: input.name,
    display: input.display,
    domain: input.domain,
    sector: input.sector,
    layout,
    copy: input.copy ?? undefined,
  });

  // Base: a copy with every block (except the address bar) filled with the
  // colour just outside its top-left corner.
  const q = ATLAS_QUADRANT[layout];
  const base = document.createElement("canvas");
  base.width = canvas.width;
  base.height = canvas.height;
  const bctx = base.getContext("2d", { willReadFrequently: true });
  if (bctx) {
    bctx.drawImage(canvas, 0, 0);
    const blocks = getSketchLayout(input.sector, layout).filter((b) => b.id !== "chrome");
    for (let s = 0; s < 4; s++) {
      const ox = (s % 2) * q.w;
      const oy = Math.floor(s / 2) * q.h;
      for (const b of blocks) {
        const x = Math.round(ox + b.x * q.w);
        const y = Math.round(oy + b.y * q.h);
        const w = Math.round(b.w * q.w);
        const h = Math.round(b.h * q.h);
        const sx = Math.max(ox, x - 3);
        const sy = Math.max(oy, y - 3);
        const px = bctx.getImageData(sx, sy, 1, 1).data;
        bctx.fillStyle = `rgb(${px[0]},${px[1]},${px[2]})`;
        bctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      }
    }
  }

  const [atlas, baseUrl] = await Promise.all([toUrl(canvas), toUrl(base)]);
  await Promise.all([decoded(atlas), decoded(baseUrl)]);
  canvas.width = 0;
  base.width = 0;
  return { atlas, base: baseUrl, key: atlasKey(input) };
}

export function revokeAtlas(u: AtlasUrls | null | undefined) {
  if (!u) return;
  try {
    URL.revokeObjectURL(u.atlas);
    URL.revokeObjectURL(u.base);
  } catch {
    /* ignore */
  }
}
