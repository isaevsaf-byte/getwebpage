/**
 * drawSketch — the visitor's future homepage, drawn on a 2D canvas.
 *
 * Stages: 0 brief · 1 wireframe · 2 type · 3 colour + imagery · 4 live.
 * Every element is drawn inside its block from getSketchLayout, so the
 * lamination scene can lift blocks off the atlas without seams.
 *
 * Client-only at call time (needs a canvas); importing is SSR-safe.
 */
import { BLOCK_ORDER, DESIGN, RECTS, SECTORS, TRADES_BAND, TRADES_BAND_Y } from "./templates";
import type {
  SectorCard,
  SectorPalette,
  SketchBlockId,
  SketchInput,
  SketchLayoutKind,
  SketchSector,
  SketchStage,
} from "./types";
import {
  applyFont,
  cleanDisplay,
  drawFitted,
  fitLine,
  fitText,
  graphemes,
  resetTracking,
  type Align,
  type FitResult,
  type TextStyle,
} from "./text";
import { archPath, drawSectorImage, roundRectPath } from "./imagery";

type Mode = "wire" | "type" | "colour";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Env {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  sx: number;
  sy: number;
  /** Uniform scale for type and strokes. */
  s: number;
  layout: SketchLayoutKind;
  mobile: boolean;
  sector: SketchSector;
  stage: SketchStage;
  mode: Mode;
  pal: SectorPalette;
  R: Record<SketchBlockId, Box>;
  name: string;
  domain: string;
  progress: number;
  hair: number;
  /** Template copy with any visitor-specific overrides applied. */
  copy: { sub: string; cta: string; cta2: string; cards: readonly [SectorCard, SectorCard, SectorCard] };
}

// ── palettes for the monochrome stages ─────────────────────────────────────

const TYPE_PAL: SectorPalette = {
  bg: "#f6f6f3",
  ink: "#1c1f20",
  muted: "#5b6260",
  accent: "#1c1f20",
  onAccent: "#f6f6f3",
  tone1: "#ecedea",
  tone2: "#e1e3df",
  rule: "rgba(28,31,32,0.16)",
};

const WIRE = {
  bg: "#f4f5f2",
  line: "rgba(20,24,26,0.52)",
  dash: "rgba(20,24,26,0.2)",
  bar: "#d2d6d0",
  barDark: "#a9afa9",
  label: "#7d2436",
  grid: "rgba(125,36,54,0.05)",
  gridLine: "rgba(125,36,54,0.14)",
};

const BRIEF = {
  bg: "#eaece7",
  card: "#f6f7f4",
  ink: "#14181a",
  label: "#5a6360",
  caret: "#7d2436",
  accent: "#7d2436",
  onAccent: "#eaece7",
};

const CHROME = {
  bar: "#e4e6e2",
  barType: "#ecedea",
  dot: "#c6cac4",
  pill: "#f7f8f5",
  text: "#636b67",
  line: "rgba(20,24,26,0.12)",
};

// ── per-sector type settings (design px) ───────────────────────────────────

const HEAD: Record<
  SketchSector,
  { track: number; max: readonly [number, number]; lh: number; align: readonly [Align, Align] }
> = {
  salon: { track: -0.022, max: [80, 62], lh: 1.02, align: ["left", "center"] },
  cafe: { track: -0.018, max: [78, 64], lh: 1.02, align: ["left", "left"] },
  studio: { track: -0.034, max: [108, 86], lh: 0.98, align: ["left", "left"] },
  trades: { track: -0.02, max: [76, 60], lh: 1.02, align: ["left", "left"] },
};
const HEAD_MIN: Record<SketchLayoutKind, number> = { desktop: 28, mobile: 26 };

const BTN_RADIUS: Record<SketchSector, number> = { salon: 999, cafe: 3, studio: 0, trades: 2 };

const ST = {
  head: (sector: SketchSector): TextStyle => ({ role: "display", weight: 560, tracking: HEAD[sector].track }),
  sans: (weight = 400, tracking = 0): TextStyle => ({ role: "sans", weight, tracking }),
  mono: (weight = 400, tracking = 0.02): TextStyle => ({ role: "mono", weight, tracking }),
  display: (weight = 500, italic = false, tracking = -0.01): TextStyle => ({ role: "display", weight, italic, tracking }),
};

// ── env ────────────────────────────────────────────────────────────────────

function makeEnv(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  input: SketchInput,
): Env {
  const layout: SketchLayoutKind = input.layout === "mobile" ? "mobile" : "desktop";
  const sector: SketchSector = SECTORS[input.sector] ? input.sector : "salon";
  const D = DESIGN[layout];
  const sx = w / D.w;
  const sy = h / D.h;
  const s = Math.min(sx, sy);
  const rects = RECTS[sector][layout];
  const R = {} as Record<SketchBlockId, Box>;
  for (const id of BLOCK_ORDER) {
    const [x, y, bw, bh] = rects[id];
    R[id] = { x: x * sx, y: y * sy, w: bw * sx, h: bh * sy };
  }
  const stage = (Math.max(0, Math.min(4, Math.round(input.stage))) as SketchStage);
  const mode: Mode = stage <= 1 ? "wire" : stage === 2 ? "type" : "colour";
  const t = ctx.getTransform();
  const dev = Math.hypot(t.a, t.b) || 1;
  const p = input.progress;
  const tpl = SECTORS[sector];
  const o = input.copy;
  const copy = {
    sub: o?.sub?.trim() || tpl.sub,
    cta: o?.cta?.trim() || tpl.cta,
    cta2: o?.cta2?.trim() || tpl.cta2,
    cards: o?.cards ?? tpl.cards,
  };
  return {
    copy,
    ctx,
    w,
    h,
    sx,
    sy,
    s,
    layout,
    mobile: layout === "mobile",
    sector,
    stage,
    mode,
    pal: mode === "colour" ? SECTORS[sector].palette : TYPE_PAL,
    R,
    name: cleanDisplay(input.display || input.name),
    domain: (input.domain || "yourbusiness.co.uk").trim() || "yourbusiness.co.uk",
    progress: typeof p === "number" && Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : 1,
    // One device pixel, but never thinner than a design pixel at 1024.
    hair: Math.max(1 / dev, Math.min(1, s)),
  };
}

const z = (e: Env, v: number) => v * e.s;

function hline(e: Env, x0: number, x1: number, y: number, c: string, width = e.hair) {
  e.ctx.fillStyle = c;
  e.ctx.fillRect(x0, y, x1 - x0, width);
}

/** Small arrow → drawn with strokes (font-independent). */
function arrow(e: Env, x: number, y: number, len: number, c: string, width = e.hair * 1.4) {
  const { ctx } = e;
  ctx.save();
  ctx.strokeStyle = c;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + len, y);
  ctx.moveTo(x + len - len * 0.38, y - len * 0.34);
  ctx.lineTo(x + len, y);
  ctx.lineTo(x + len - len * 0.38, y + len * 0.34);
  ctx.stroke();
  ctx.restore();
}

function hamburger(e: Env, rightX: number, cy: number, c: string) {
  const w = z(e, 22);
  const gap = z(e, 7);
  e.ctx.fillStyle = c;
  const t = Math.max(e.hair, z(e, 1.6));
  e.ctx.fillRect(rightX - w, cy - gap / 2 - t / 2, w, t);
  e.ctx.fillRect(rightX - w * 0.7, cy + gap / 2 - t / 2, w * 0.7, t);
}

function onBand(e: Env, id: SketchBlockId): boolean {
  if (e.sector !== "trades" || e.mode !== "colour") return false;
  return id === "headline" || id === "sub" || id === "cta" || id === "cta2" || id === "image";
}

// ── shared fits (also reused by the wireframe so bars match real type) ────

function headlineFit(e: Env): { st: TextStyle; fit: FitResult; align: Align } {
  const b = e.R.headline;
  const cfg = HEAD[e.sector];
  const st = ST.head(e.sector);
  const fit = fitText(e.ctx, e.name, st, {
    maxW: b.w,
    maxH: b.h,
    maxSize: cfg.max[e.mobile ? 1 : 0] * e.s,
    minSize: HEAD_MIN[e.layout] * e.s,
    maxLines: 2,
    lineHeight: cfg.lh,
    balance: true,
  });
  return { st, fit, align: cfg.align[e.mobile ? 1 : 0] };
}

function subFit(e: Env): { st: TextStyle; fit: FitResult; align: Align } {
  const b = e.R.sub;
  const st = ST.sans(400);
  const size = z(e, e.mobile ? 19 : e.sector === "studio" ? 15.5 : 17);
  const fit = fitText(e.ctx, e.copy.sub, st, {
    maxW: b.w,
    maxH: b.h,
    maxSize: size,
    minSize: size * 0.7,
    maxLines: 2,
    lineHeight: 1.42,
  });
  const align: Align = e.sector === "salon" && e.mobile ? "center" : "left";
  return { st, fit, align };
}

interface LogoPlan {
  st: TextStyle;
  fit: FitResult;
  box: Box;
  align: Align;
  mark?: Box;
}

function fitPreferOneLine(e: Env, text: string, st: TextStyle, box: Box, max: number, min: number): FitResult {
  const one = fitText(e.ctx, text, st, { maxW: box.w, maxH: box.h, maxSize: max, minSize: min, maxLines: 1, lineHeight: 1.1 });
  if (one.size >= min - 0.01) return one;
  return fitText(e.ctx, text, st, { maxW: box.w, maxH: box.h, maxSize: min, minSize: min * 0.75, maxLines: 2, lineHeight: 1.08 });
}

function logoPlan(e: Env): LogoPlan {
  const b = e.R.logo;
  const name = e.name;
  switch (e.sector) {
    case "salon": {
      const st = ST.display(400, true, 0);
      const fit = fitPreferOneLine(e, name, st, b, z(e, e.mobile ? 30 : 30), z(e, 15));
      return { st, fit, box: b, align: "center" };
    }
    case "cafe": {
      const st = ST.display(600, false, -0.012);
      const fit = fitPreferOneLine(e, name, st, b, z(e, e.mobile ? 27 : 26), z(e, 14));
      return { st, fit, box: b, align: "left" };
    }
    case "studio": {
      const st = ST.sans(600, -0.02);
      const fit = fitPreferOneLine(e, name, st, b, z(e, e.mobile ? 20 : 18), z(e, 12));
      return { st, fit, box: b, align: "left" };
    }
    default: {
      const side = Math.min(b.h, z(e, e.mobile ? 38 : 36));
      const mark = { x: b.x, y: b.y + (b.h - side) / 2, w: side, h: side };
      const gap = z(e, 12);
      const box = { x: b.x + side + gap, y: b.y, w: b.w - side - gap, h: b.h };
      const st = ST.sans(600, -0.01);
      const fit = fitPreferOneLine(e, name, st, box, z(e, e.mobile ? 19 : 18), z(e, 11.5));
      return { st, fit, box, align: "left", mark };
    }
  }
}

function initial(name: string): string {
  const g = graphemes(name.trim());
  return (g[0] || "Y").toLocaleUpperCase();
}

// ── page blocks (type + colour stages) ─────────────────────────────────────

function drawLogo(e: Env) {
  const p = logoPlan(e);
  const { pal } = e;
  if (p.mark) {
    const m = p.mark;
    e.ctx.fillStyle = e.mode === "colour" ? pal.accent : pal.ink;
    roundRectPath(e.ctx, m.x, m.y, m.w, m.h, z(e, 3));
    e.ctx.fill();
    const st = ST.display(600, false, 0);
    const f = fitLine(e.ctx, initial(e.name), st, m.h * 0.56, m.w * 0.74);
    drawFitted(e.ctx, f, st, { x: m.x, y: m.y, w: m.w, h: m.h }, "center", "middle", pal.onAccent);
  }
  drawFitted(e.ctx, p.fit, p.st, p.box, p.align, "middle", pal.ink);
}

function navItems(e: Env, box: Box, items: readonly string[], st: TextStyle, size: number, gap: number, align: Align, color: string, emphasiseLast?: string) {
  const { ctx } = e;
  applyFont(ctx, st, size);
  let widths = items.map((t) => ctx.measureText(t).width);
  let total = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
  if (total > box.w) {
    const k = box.w / total;
    size *= k;
    gap *= k;
    applyFont(ctx, st, size);
    widths = items.map((t) => ctx.measureText(t).width);
    total = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
  }
  let x = align === "center" ? box.x + (box.w - total) / 2 : align === "right" ? box.x + box.w - total : box.x;
  const base = box.y + box.h / 2 + size * 0.36;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  items.forEach((t, i) => {
    const last = i === items.length - 1 && emphasiseLast;
    ctx.fillStyle = last ? emphasiseLast : color;
    ctx.fillText(t, x, base);
    if (last) hline(e, x, x + widths[i], base + size * 0.32, emphasiseLast, Math.max(e.hair, z(e, 1.25)));
    x += widths[i] + gap;
  });
  resetTracking(ctx);
}

function navPill(e: Env, rightX: number, cy: number, h: number, label: string, filled: boolean, radius: number, fill: string, text: string, size: number): number {
  const st = ST.sans(e.sector === "trades" ? 600 : 500);
  applyFont(e.ctx, st, size);
  const tw = e.ctx.measureText(label).width;
  const w = tw + z(e, 32);
  const x = rightX - w;
  const y = cy - h / 2;
  roundRectPath(e.ctx, x, y, w, h, Math.min(radius, h / 2));
  if (filled) {
    e.ctx.fillStyle = fill;
    e.ctx.fill();
  } else {
    e.ctx.strokeStyle = fill;
    e.ctx.lineWidth = Math.max(e.hair, z(e, 1.25));
    e.ctx.stroke();
  }
  e.ctx.fillStyle = text;
  e.ctx.textAlign = "left";
  e.ctx.textBaseline = "alphabetic";
  e.ctx.fillText(label, x + (w - tw) / 2, cy + size * 0.36);
  resetTracking(e.ctx);
  return x;
}

function drawNav(e: Env) {
  const b = e.R.nav;
  const { pal } = e;
  const spec = SECTORS[e.sector];
  const colour = e.mode === "colour";
  const cy = b.y + b.h / 2;
  switch (e.sector) {
    case "salon":
      navItems(e, b, spec.nav, ST.sans(400, 0.03), z(e, e.mobile ? 13 : 13), z(e, e.mobile ? 22 : 30), "center", pal.ink, colour ? pal.accent : pal.ink);
      break;
    case "cafe":
      if (e.mobile) {
        hamburger(e, b.x + b.w, cy, pal.ink);
        navPill(e, b.x + b.w - z(e, 38), cy, b.h, spec.nav[3], true, z(e, 3), pal.accent, pal.onAccent, z(e, 15));
      } else {
        const x = navPill(e, b.x + b.w, cy, b.h, spec.nav[3], false, z(e, 3), colour ? pal.accent : pal.ink, colour ? pal.accent : pal.ink, z(e, 14));
        navItems(e, { x: b.x, y: b.y, w: x - b.x - z(e, 28), h: b.h }, spec.nav.slice(0, 3), ST.sans(500), z(e, 14), z(e, 28), "right", pal.ink);
      }
      break;
    case "studio":
      if (e.mobile) {
        hamburger(e, b.x + b.w, cy, pal.ink);
        navItems(e, { x: b.x, y: b.y, w: b.w - z(e, 34), h: b.h }, ["Menu"], ST.mono(400, 0.02), z(e, 14), 0, "right", pal.ink);
      } else {
        navItems(e, b, spec.nav, ST.mono(400, 0.01), z(e, 12.5), z(e, 24), "right", pal.ink);
      }
      break;
    default:
      if (e.mobile) {
        hamburger(e, b.x + b.w, cy, pal.ink);
        navPill(e, b.x + b.w - z(e, 38), cy, b.h, spec.nav[3], true, z(e, 2), pal.accent, pal.onAccent, z(e, 15));
      } else {
        const x = navPill(e, b.x + b.w, cy, b.h, spec.nav[3], true, z(e, 2), pal.accent, pal.onAccent, z(e, 14));
        navItems(e, { x: b.x, y: b.y, w: x - b.x - z(e, 26), h: b.h }, spec.nav.slice(0, 3), ST.sans(500), z(e, 14), z(e, 26), "right", pal.ink);
      }
  }
}

function drawHeadline(e: Env) {
  const { st, fit, align } = headlineFit(e);
  const color = onBand(e, "headline") ? TRADES_BAND.text : e.pal.ink;
  drawFitted(e.ctx, fit, st, e.R.headline, align, "bottom", color);
}

function drawSub(e: Env) {
  const { st, fit, align } = subFit(e);
  const color = onBand(e, "sub") ? TRADES_BAND.soft : e.pal.muted;
  drawFitted(e.ctx, fit, st, e.R.sub, align, "top", color);
}

function drawButton(e: Env, id: "cta" | "cta2") {
  const b = e.R[id];
  const primary = id === "cta";
  const spec = SECTORS[e.sector];
  const { ctx, pal } = e;
  const r = Math.min(z(e, BTN_RADIUS[e.sector]), b.h / 2);
  const band = onBand(e, id);
  let fill: string | null;
  let stroke: string | null;
  let text: string;
  if (band) {
    fill = primary ? TRADES_BAND.text : null;
    stroke = primary ? null : "rgba(232,234,230,0.72)";
    text = primary ? pal.ink : TRADES_BAND.text;
  } else {
    fill = primary ? pal.accent : null;
    stroke = primary ? null : e.mode === "colour" ? pal.ink : pal.ink;
    text = primary ? pal.onAccent : pal.ink;
  }
  const inset = stroke ? Math.max(e.hair, z(e, 1.25)) / 2 : 0;
  roundRectPath(ctx, b.x + inset, b.y + inset, b.w - inset * 2, b.h - inset * 2, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(e.hair, z(e, 1.25));
    ctx.stroke();
  }
  const st = ST.sans(500, 0.005);
  const size = z(e, e.mobile ? 16.5 : e.sector === "studio" ? 13 : 14);
  const label = primary ? e.copy.cta : e.copy.cta2;
  const pad = Math.min(z(e, 18), b.w * 0.12);
  const f = fitLine(ctx, label, st, size, b.w - pad * 2);
  drawFitted(ctx, f, st, b, "center", "middle", text);
}

function drawCard(e: Env, id: "card1" | "card2" | "card3") {
  const b = e.R[id];
  const i = id === "card1" ? 0 : id === "card2" ? 1 : 2;
  const card = e.copy.cards[i];
  const { ctx, pal } = e;
  const colour = e.mode === "colour";
  const num = `0${i + 1}`;
  switch (e.sector) {
    case "salon": {
      hline(e, b.x, b.x + b.w, b.y, colour ? pal.accent : pal.ink, Math.max(e.hair, z(e, 1.5)));
      const tst = ST.display(500, false, -0.01);
      const tf = fitLine(ctx, card.title, tst, z(e, e.mobile ? 19 : 17), b.w);
      const top = b.y + z(e, e.mobile ? 12 : 14);
      const tb = drawFitted(ctx, tf, tst, { x: b.x, y: top, w: b.w, h: tf.size * 1.3 }, "left", "top", pal.ink);
      const bst = ST.sans(400);
      const bsize = z(e, e.mobile ? 14 : 12.5);
      const bf = fitText(ctx, card.body, bst, {
        maxW: b.w,
        maxH: b.y + b.h - tb.bottom - z(e, 8),
        maxSize: bsize,
        minSize: bsize * 0.8,
        maxLines: e.mobile ? 1 : 3,
        lineHeight: 1.45,
      });
      drawFitted(ctx, bf, bst, { x: b.x, y: tb.bottom + z(e, e.mobile ? 7 : 9), w: b.w, h: b.h }, "left", "top", pal.muted);
      break;
    }
    case "cafe": {
      hline(e, b.x, b.x + b.w, b.y, pal.rule);
      const tst = ST.display(500, false, -0.01);
      const aw = z(e, 16);
      if (e.mobile) {
        const tf = fitLine(ctx, card.title, tst, z(e, 21), b.w - aw * 2);
        const tb = drawFitted(ctx, tf, tst, { x: b.x, y: b.y + z(e, 14), w: b.w - aw * 2, h: tf.size * 1.3 }, "left", "top", pal.ink);
        const bst = ST.sans(400);
        const bf = fitLine(ctx, card.body, bst, z(e, 14.5), b.w - aw * 2);
        drawFitted(ctx, bf, bst, { x: b.x, y: tb.bottom + z(e, 8), w: b.w, h: b.h }, "left", "top", pal.muted);
      } else {
        const col = z(e, 158);
        const tf = fitLine(ctx, card.title, tst, z(e, 18), col - z(e, 10));
        drawFitted(ctx, tf, tst, { x: b.x, y: b.y, w: col, h: b.h }, "left", "middle", pal.ink);
        const bst = ST.sans(400);
        const bf = fitLine(ctx, card.body, bst, z(e, 13), b.w - col - aw * 2);
        drawFitted(ctx, bf, bst, { x: b.x + col, y: b.y, w: b.w - col, h: b.h }, "left", "middle", pal.muted);
      }
      arrow(e, b.x + b.w - aw, b.y + b.h / 2, aw, colour ? pal.accent : pal.ink);
      break;
    }
    case "studio": {
      hline(e, b.x, b.x + b.w, b.y, pal.ink);
      const nst = ST.mono(400, 0.02);
      const nf = fitLine(ctx, num, nst, z(e, e.mobile ? 13 : 11.5), z(e, 40));
      const top = b.y + z(e, e.mobile ? 14 : 12);
      drawFitted(ctx, nf, nst, { x: b.x, y: top, w: z(e, 40), h: nf.size * 1.4 }, "left", "top", colour ? pal.accent : pal.ink);
      const tx = b.x + z(e, e.mobile ? 48 : 40);
      const tw = b.x + b.w - tx;
      const tst = ST.sans(500, -0.005);
      const tf = fitLine(ctx, card.title, tst, z(e, e.mobile ? 17 : 14.5), tw);
      const tb = drawFitted(ctx, tf, tst, { x: tx, y: top - z(e, 1), w: tw, h: tf.size * 1.3 }, "left", "top", pal.ink);
      const bst = ST.sans(400);
      const bf = fitLine(ctx, card.body, bst, z(e, e.mobile ? 14 : 12.5), tw);
      drawFitted(ctx, bf, bst, { x: tx, y: tb.bottom + z(e, e.mobile ? 8 : 6), w: tw, h: b.h }, "left", "top", pal.muted);
      break;
    }
    default: {
      ctx.fillStyle = pal.tone1;
      roundRectPath(ctx, b.x, b.y, b.w, b.h, z(e, 4));
      ctx.fill();
      const pad = z(e, e.mobile ? 18 : 18);
      const nst = ST.mono(400, 0.02);
      const nf = fitLine(ctx, num, nst, z(e, e.mobile ? 13 : 11.5), z(e, 40));
      const inner = { x: b.x + pad, y: b.y + pad * 0.9, w: b.w - pad * 2 - z(e, 26), h: b.h - pad * 1.8 };
      if (e.mobile) {
        drawFitted(ctx, nf, nst, { x: inner.x, y: inner.y, w: z(e, 40), h: nf.size * 1.4 }, "left", "top", pal.muted);
        const tx = inner.x + z(e, 44);
        const tst = ST.sans(600, -0.01);
        const tf = fitLine(ctx, card.title, tst, z(e, 18), inner.w - z(e, 44));
        const tb = drawFitted(ctx, tf, tst, { x: tx, y: inner.y - z(e, 2), w: inner.w, h: tf.size * 1.3 }, "left", "top", pal.ink);
        const bst = ST.sans(400);
        const bf = fitLine(ctx, card.body, bst, z(e, 14.5), inner.w - z(e, 44));
        drawFitted(ctx, bf, bst, { x: tx, y: tb.bottom + z(e, 9), w: inner.w, h: b.h }, "left", "top", pal.muted);
      } else {
        const nb = drawFitted(ctx, nf, nst, { x: inner.x, y: inner.y, w: z(e, 40), h: nf.size * 1.4 }, "left", "top", pal.muted);
        const tst = ST.sans(600, -0.01);
        const tf = fitLine(ctx, card.title, tst, z(e, 17), inner.w);
        const tb = drawFitted(ctx, tf, tst, { x: inner.x, y: nb.bottom + z(e, 16), w: inner.w, h: tf.size * 1.3 }, "left", "top", pal.ink);
        const bst = ST.sans(400);
        const bf = fitLine(ctx, card.body, bst, z(e, 13), b.w - pad * 2);
        drawFitted(ctx, bf, bst, { x: inner.x, y: tb.bottom + z(e, 8), w: b.w - pad * 2, h: b.h }, "left", "top", pal.muted);
      }
      const aw = z(e, 16);
      const ay = e.mobile ? b.y + b.h / 2 : b.y + pad * 0.9 + z(e, 6);
      arrow(e, b.x + b.w - pad - aw, ay, aw, colour ? pal.accent : pal.ink);
    }
  }
}

function drawFooter(e: Env) {
  const b = e.R.footer;
  const { ctx, pal } = e;
  hline(e, b.x, b.x + b.w, b.y, pal.rule);
  const st = e.sector === "studio" ? ST.mono(400, 0.01) : ST.sans(400);
  const size = z(e, e.mobile ? 13 : e.sector === "studio" ? 11 : 11.5);
  const links = SECTORS[e.sector].footerLinks.join("  ·  ");
  applyFont(ctx, st, size);
  const lw = Math.min(ctx.measureText(links).width, b.w * 0.4);
  resetTracking(ctx);
  const row = { x: b.x, y: b.y + z(e, 6), w: b.w, h: b.h - z(e, 6) };
  const lf = fitLine(ctx, links, st, size, lw + 1);
  drawFitted(ctx, lf, st, row, "right", "middle", pal.muted);
  const nf = fitLine(ctx, `© ${e.name}`, st, size, b.w - lw - z(e, 24), size * 0.7);
  drawFitted(ctx, nf, st, { ...row, w: b.w - lw - z(e, 24) }, "left", "middle", pal.muted);
}

function imageShape(e: Env, b: Box) {
  if (e.sector === "salon") archPath(e.ctx, b.x, b.y, b.w, b.h);
  else {
    e.ctx.beginPath();
    e.ctx.rect(b.x, b.y, b.w, b.h);
  }
}

function drawImage(e: Env) {
  const b = e.R.image;
  const { ctx } = e;
  if (e.mode === "colour") {
    drawSectorImage(ctx, e.sector, e.layout, b.x, b.y, b.w, b.h);
    return;
  }
  // Type stage: a calm grey stand-in that already has the final shape.
  ctx.save();
  imageShape(e, b);
  ctx.fillStyle = "#e3e5e1";
  ctx.fill();
  ctx.clip();
  const g = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
  g.addColorStop(0, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(0,0,0,0.04)");
  ctx.fillStyle = g;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.restore();
  const st = ST.mono(400, 0.02);
  const f = fitLine(ctx, "photo", st, z(e, e.mobile ? 14 : 12), b.w * 0.8);
  drawFitted(ctx, f, st, b, "center", "middle", TYPE_PAL.muted);
}

function drawBackdrop(e: Env) {
  const { ctx, pal } = e;
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, e.w, e.h);
  const m = e.mobile;
  if (e.sector === "salon") {
    const y = (m ? 154 : 134) * e.sy;
    hline(e, (m ? 28 : 64) * e.sx, (m ? 484 : 960) * e.sx, y, pal.rule);
  } else if (e.sector === "cafe" && !m) {
    hline(e, 64 * e.sx, 960 * e.sx, 106 * e.sy, pal.rule);
  } else if (e.sector === "trades") {
    const [y, h] = TRADES_BAND_Y[e.layout];
    ctx.fillStyle = e.mode === "colour" ? pal.accent : pal.tone1;
    ctx.fillRect(0, y * e.sy, e.w, h * e.sy);
  }
}

function drawPage(e: Env) {
  drawBackdrop(e);
  drawImage(e);
  drawLogo(e);
  drawNav(e);
  drawHeadline(e);
  drawSub(e);
  drawButton(e, "cta");
  drawButton(e, "cta2");
  drawCard(e, "card1");
  drawCard(e, "card2");
  drawCard(e, "card3");
  drawFooter(e);
  drawChrome(e);
}

// ── chrome ─────────────────────────────────────────────────────────────────

function padlock(e: Env, x: number, cy: number, size: number, closed: boolean, c: string) {
  const { ctx } = e;
  const bw = size * 0.78;
  const bh = size * 0.6;
  const bx = x;
  const by = cy - bh / 2 + size * 0.16;
  ctx.save();
  ctx.fillStyle = c;
  roundRectPath(ctx, bx, by, bw, bh, size * 0.1);
  ctx.fill();
  ctx.strokeStyle = c;
  ctx.lineWidth = Math.max(e.hair, size * 0.12);
  ctx.beginPath();
  const r = bw * 0.3;
  const sx = bx + bw / 2;
  if (closed) {
    ctx.moveTo(sx - r, by);
    ctx.lineTo(sx - r, by - r * 0.6);
    ctx.arc(sx, by - r * 0.6, r, Math.PI, 0);
    ctx.lineTo(sx + r, by);
  } else {
    ctx.moveTo(sx + r, by);
    ctx.lineTo(sx + r, by - r * 0.6);
    ctx.arc(sx + r * 2, by - r * 0.9, r, Math.PI, 0);
  }
  ctx.stroke();
  ctx.restore();
}

function chromeGeom(e: Env) {
  const b = e.R.chrome;
  const m = e.mobile;
  const ph = z(e, m ? 34 : 22);
  const pill = m
    ? { x: b.x + z(e, 16), y: b.y + (b.h - ph) / 2, w: b.w - z(e, 32), h: ph }
    : { x: b.x + b.w * 0.3, y: b.y + (b.h - ph) / 2, w: b.w * 0.4, h: ph };
  return { b, pill };
}

function drawChrome(e: Env) {
  const { ctx } = e;
  const { b, pill } = chromeGeom(e);
  const live = e.stage === 4;
  ctx.fillStyle = e.mode === "type" ? CHROME.barType : CHROME.bar;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  hline(e, b.x, b.x + b.w, b.y + b.h - e.hair, CHROME.line);
  if (!e.mobile) {
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = CHROME.dot;
      ctx.beginPath();
      ctx.arc(b.x + z(e, 18 + i * 15), b.y + b.h / 2, z(e, 4.5), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = CHROME.pill;
  roundRectPath(ctx, pill.x, pill.y, pill.w, pill.h, pill.h / 2);
  ctx.fill();
  if (!live) return;

  const size = z(e, e.mobile ? 15 : 12);
  const lock = size * 0.95;
  const padX = z(e, e.mobile ? 16 : 12);
  const st = ST.sans(400, 0);
  const full = e.domain;
  const g = graphemes(full);
  const shown = g.slice(0, Math.round(e.progress * g.length)).join("");
  const typing = e.progress < 1;
  const tx = pill.x + padX + lock + z(e, 7);
  const maxW = pill.x + pill.w - padX - tx;
  // Fit on the full domain so the size never jumps while typing.
  const f = fitLine(ctx, full, st, size, maxW, size * 0.6);
  const cy = pill.y + pill.h / 2;
  padlock(e, pill.x + padX, cy, lock, !typing, CHROME.text);
  applyFont(ctx, st, f.size);
  ctx.fillStyle = CHROME.text;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const base = cy + f.size * 0.36;
  ctx.fillText(shown, tx, base);
  if (typing) {
    const cw = ctx.measureText(shown).width;
    ctx.fillRect(tx + cw + z(e, 1.5), cy - f.size * 0.6, Math.max(e.hair, z(e, 1.3)), f.size * 1.2);
  }
  resetTracking(ctx);
}

// ── stage 1: wireframe ─────────────────────────────────────────────────────

function wireBar(e: Env, x: number, y: number, w: number, h: number, dark = false) {
  e.ctx.fillStyle = dark ? WIRE.barDark : WIRE.bar;
  roundRectPath(e.ctx, x, y, Math.max(0, w), h, Math.min(h / 2, z(e, 2)));
  e.ctx.fill();
}

/** Bars standing in for a fitted text block, line for line. */
function wireText(e: Env, fit: FitResult, box: Box, align: Align, valign: "top" | "bottom" | "middle", capRatio: number, dark = false) {
  const total = fit.ascent + fit.descent + fit.lineGap * (fit.lines.length - 1);
  const top = valign === "top" ? box.y : valign === "bottom" ? box.y + box.h - total : box.y + (box.h - total) / 2;
  fit.lines.forEach((_, i) => {
    const w = fit.widths[i];
    const base = top + fit.ascent + fit.lineGap * i;
    const bh = fit.size * capRatio;
    const x = align === "center" ? box.x + (box.w - w) / 2 : align === "right" ? box.x + box.w - w : box.x;
    wireBar(e, x, base - bh, w, bh, dark);
  });
}

function wireLabel(e: Env, text: string, x: number, y: number) {
  const st = ST.mono(400, 0.02);
  const f = fitLine(e.ctx, text, st, z(e, e.mobile ? 12 : 10), z(e, 220));
  drawFitted(e.ctx, f, st, { x, y, w: z(e, 220), h: f.size * 1.3 }, "left", "top", WIRE.label);
}

function strokeBox(e: Env, b: Box, c: string, dashed = false) {
  const { ctx } = e;
  ctx.save();
  ctx.strokeStyle = c;
  ctx.lineWidth = e.hair;
  if (dashed) ctx.setLineDash([z(e, 4), z(e, 3)]);
  const o = e.hair / 2;
  ctx.strokeRect(b.x + o, b.y + o, b.w - e.hair, b.h - e.hair);
  ctx.restore();
}

function drawWire(e: Env) {
  const { ctx } = e;
  ctx.fillStyle = WIRE.bg;
  ctx.fillRect(0, 0, e.w, e.h);

  // Column grid.
  const m = e.mobile;
  const cols = m ? 4 : 12;
  const margin = (m ? 28 : 64) * e.sx;
  const gutter = 16 * e.sx;
  const cw = (e.w - margin * 2 - gutter * (cols - 1)) / cols;
  for (let i = 0; i < cols; i++) {
    const x = margin + i * (cw + gutter);
    ctx.fillStyle = WIRE.grid;
    ctx.fillRect(x, e.R.chrome.h, cw, e.h - e.R.chrome.h);
  }
  ctx.fillStyle = WIRE.gridLine;
  ctx.fillRect(margin, e.R.chrome.h, e.hair, e.h);
  ctx.fillRect(e.w - margin - e.hair, e.R.chrome.h, e.hair, e.h);

  if (e.sector === "trades") {
    const [y, h] = TRADES_BAND_Y[e.layout];
    strokeBox(e, { x: -2, y: y * e.sy, w: e.w + 4, h: h * e.sy }, WIRE.dash, true);
  }

  // Every block's footprint, dashed.
  for (const id of BLOCK_ORDER) if (id !== "chrome") strokeBox(e, e.R[id], WIRE.dash, true);

  // Chrome.
  const { b, pill } = chromeGeom(e);
  hline(e, b.x, b.x + b.w, b.y + b.h - e.hair, WIRE.line);
  ctx.save();
  ctx.strokeStyle = WIRE.line;
  ctx.lineWidth = e.hair;
  if (!m) {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(b.x + z(e, 18 + i * 15), b.y + b.h / 2, z(e, 4), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  roundRectPath(ctx, pill.x, pill.y, pill.w, pill.h, pill.h / 2);
  ctx.stroke();
  ctx.restore();

  // Logo.
  const lp = logoPlan(e);
  if (lp.mark) strokeBox(e, lp.mark, WIRE.line);
  wireText(e, lp.fit, lp.box, lp.align, "middle", 0.62, true);

  // Nav: bars sized like the real labels.
  const spec = SECTORS[e.sector];
  const nb = e.R.nav;
  const ncy = nb.y + nb.h / 2;
  const navBars = (items: readonly string[], box: Box, size: number, gap: number, align: Align, st: TextStyle) => {
    applyFont(ctx, st, size);
    const ws = items.map((t) => ctx.measureText(t).width);
    resetTracking(ctx);
    const total = Math.min(box.w, ws.reduce((a, c) => a + c, 0) + gap * (items.length - 1));
    const k = total / (ws.reduce((a, c) => a + c, 0) + gap * (items.length - 1));
    let x = align === "center" ? box.x + (box.w - total) / 2 : align === "right" ? box.x + box.w - total : box.x;
    ws.forEach((w) => {
      wireBar(e, x, ncy - size * 0.28, w * k, size * 0.56);
      x += (w + gap) * k;
    });
  };
  const btnOutline = (rightX: number, w: number, r: number) => {
    ctx.save();
    roundRectPath(ctx, rightX - w, nb.y + e.hair, w, nb.h - e.hair * 2, Math.min(r, nb.h / 2));
    ctx.strokeStyle = WIRE.line;
    ctx.lineWidth = e.hair;
    ctx.stroke();
    ctx.restore();
    wireBar(e, rightX - w + w * 0.24, ncy - z(e, 3), w * 0.52, z(e, 6), true);
  };
  if (e.sector === "salon") navBars(spec.nav, nb, z(e, 13), z(e, m ? 22 : 30), "center", ST.sans(400, 0.03));
  else if (m) {
    ctx.fillStyle = WIRE.barDark;
    hamburger(e, nb.x + nb.w, ncy, WIRE.barDark);
    if (e.sector === "studio") navBars(["Menu"], { ...nb, w: nb.w - z(e, 34) }, z(e, 14), 0, "right", ST.mono());
    else btnOutline(nb.x + nb.w - z(e, 38), z(e, 84), z(e, BTN_RADIUS[e.sector]));
  } else if (e.sector === "studio") navBars(spec.nav, nb, z(e, 12.5), z(e, 24), "right", ST.mono(400, 0.01));
  else {
    const bw = z(e, e.sector === "cafe" ? 78 : 80);
    btnOutline(nb.x + nb.w, bw, z(e, BTN_RADIUS[e.sector]));
    navBars(spec.nav.slice(0, 3), { ...nb, w: nb.w - bw - z(e, 28) }, z(e, 14), z(e, 28), "right", ST.sans(500));
  }

  // Headline + sub: bars that match the real type, line for line.
  const hf = headlineFit(e);
  wireText(e, hf.fit, e.R.headline, hf.align, "bottom", 0.7, true);
  const sf = subFit(e);
  wireText(e, sf.fit, e.R.sub, sf.align, "top", 0.52);

  // Buttons.
  for (const id of ["cta", "cta2"] as const) {
    const bb = e.R[id];
    ctx.save();
    roundRectPath(ctx, bb.x + e.hair / 2, bb.y + e.hair / 2, bb.w - e.hair, bb.h - e.hair, Math.min(z(e, BTN_RADIUS[e.sector]), bb.h / 2));
    if (id === "cta") {
      ctx.fillStyle = WIRE.bar;
      ctx.fill();
    }
    ctx.strokeStyle = WIRE.line;
    ctx.lineWidth = e.hair;
    ctx.stroke();
    ctx.restore();
    wireBar(e, bb.x + bb.w * 0.24, bb.y + bb.h / 2 - z(e, 3.5), bb.w * 0.52, z(e, 7), id === "cta");
  }

  // Image: final shape, crossed.
  const ib = e.R.image;
  ctx.save();
  imageShape(e, ib);
  ctx.fillStyle = "rgba(20,24,26,0.035)";
  ctx.fill();
  ctx.strokeStyle = WIRE.line;
  ctx.lineWidth = e.hair;
  ctx.stroke();
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(ib.x, ib.y);
  ctx.lineTo(ib.x + ib.w, ib.y + ib.h);
  ctx.moveTo(ib.x + ib.w, ib.y);
  ctx.lineTo(ib.x, ib.y + ib.h);
  ctx.strokeStyle = WIRE.dash;
  ctx.stroke();
  ctx.restore();

  // Cards: title + body bars in each sector's arrangement.
  (["card1", "card2", "card3"] as const).forEach((id) => {
    const cb = e.R[id];
    if (e.sector === "trades") strokeBox(e, cb, WIRE.line);
    else hline(e, cb.x, cb.x + cb.w, cb.y, WIRE.line);
    const pad = e.sector === "trades" ? z(e, 18) : 0;
    const x = cb.x + pad + (e.sector === "studio" ? z(e, m ? 48 : 40) : e.sector === "trades" && m ? z(e, 44) : 0);
    const inner = cb.w - (x - cb.x) - pad;
    if (e.sector === "studio" || e.sector === "trades") wireBar(e, cb.x + pad, cb.y + z(e, 14), z(e, 16), z(e, 7), true);
    if (e.sector === "cafe" && !m) {
      wireBar(e, x, cb.y + cb.h / 2 - z(e, 6), z(e, 110), z(e, 12), true);
      wireBar(e, x + z(e, 158), cb.y + cb.h / 2 - z(e, 4), Math.min(z(e, 170), inner - z(e, 190)), z(e, 8));
    } else {
      const ty = e.sector === "trades" && !m ? cb.y + z(e, 52) : cb.y + z(e, m ? 16 : 16);
      wireBar(e, x, ty, Math.min(inner * 0.6, z(e, 120)), z(e, m ? 13 : 11), true);
      wireBar(e, x, ty + z(e, m ? 24 : 21), inner * 0.82, z(e, m ? 8 : 7));
    }
  });

  // Footer.
  const fb = e.R.footer;
  hline(e, fb.x, fb.x + fb.w, fb.y, WIRE.line);
  wireBar(e, fb.x, fb.y + fb.h * 0.5, z(e, 110), z(e, 6));
  wireBar(e, fb.x + fb.w - z(e, 96), fb.y + fb.h * 0.5, z(e, 96), z(e, 6));

  // A designer's notes, in the studio's own oxblood.
  const hb = e.R.headline;
  wireLabel(e, "h1 · your name, tallest", hb.x, hb.y + z(e, 2));
  wireLabel(e, "photo", ib.x + z(e, 10), ib.y + (e.sector === "salon" ? ib.w * 0.5 : z(e, 8)));
}

// ── stage 0: the brief ─────────────────────────────────────────────────────

interface BriefField {
  label: string;
  value: string;
}

function briefFields(name: string, sector: SketchSector): BriefField[] {
  const spec = SECTORS[sector];
  const cta = spec.cta.charAt(0).toLowerCase() + spec.cta.slice(1);
  return [
    { label: "Business:", value: name },
    { label: "Type:", value: spec.label },
    { label: "Visitors should:", value: cta },
    { label: "Pages:", value: spec.nav.join(" · ") },
  ];
}

function briefTotal(fields: BriefField[]): number {
  return fields.reduce((a, f) => a + graphemes(f.value).length, 0);
}

function drawBrief(e: Env) {
  const { ctx } = e;
  const m = e.mobile;
  ctx.fillStyle = BRIEF.bg;
  ctx.fillRect(0, 0, e.w, e.h);

  // Card.
  const card = m
    ? { x: 28 * e.sx, y: 132 * e.sy, w: 456 * e.sx, h: 700 * e.sy }
    : { x: 212 * e.sx, y: 84 * e.sy, w: 600 * e.sx, h: 492 * e.sy };
  const shadow = ctx.createLinearGradient(0, card.y + card.h - z(e, 10), 0, card.y + card.h + z(e, 18));
  shadow.addColorStop(0, "rgba(20,24,26,0.08)");
  shadow.addColorStop(1, "rgba(20,24,26,0)");
  ctx.fillStyle = shadow;
  ctx.fillRect(card.x + z(e, 10), card.y + card.h - z(e, 10), card.w - z(e, 20), z(e, 28));
  ctx.fillStyle = BRIEF.card;
  roundRectPath(ctx, card.x, card.y, card.w, card.h, z(e, 6));
  ctx.fill();
  ctx.strokeStyle = "rgba(20,24,26,0.12)";
  ctx.lineWidth = e.hair;
  ctx.stroke();

  const pad = z(e, m ? 28 : 40);
  const inner = { x: card.x + pad, w: card.w - pad * 2 };

  // Title row.
  const tst: TextStyle = { role: "display", weight: 560, tracking: -0.015 };
  const tf = fitLine(ctx, "Project brief", tst, z(e, m ? 30 : 26), inner.w * 0.7);
  const tb = drawFitted(ctx, tf, tst, { x: inner.x, y: card.y + pad, w: inner.w, h: tf.size * 1.2 }, "left", "top", BRIEF.ink);
  const dst = ST.mono(400, 0.02);
  const df = fitLine(ctx, "Day 1", dst, z(e, m ? 14 : 12), inner.w * 0.3);
  drawFitted(ctx, df, dst, { x: inner.x, y: tb.top, w: inner.w, h: tb.bottom - tb.top }, "right", "bottom", BRIEF.label);
  const ruleY = tb.bottom + z(e, m ? 22 : 20);
  hline(e, inner.x, inner.x + inner.w, ruleY, "rgba(20,24,26,0.16)");

  // Fields.
  const fields = briefFields(e.name, e.sector);
  const total = briefTotal(fields);
  let remaining = Math.round(e.progress * total);
  const typing = e.progress < 1;
  const lsz = z(e, m ? 14 : 12.5);
  const vsz = z(e, m ? 18 : 15.5);
  const rowH = z(e, m ? 104 : 78);
  const lst = ST.mono(400, 0.01);
  const vst = ST.mono(400, 0);
  let caretDrawn = false;
  fields.forEach((f, i) => {
    const y = ruleY + z(e, m ? 26 : 24) + i * rowH;
    const g = graphemes(f.value);
    const n = Math.min(g.length, Math.max(0, remaining));
    remaining -= g.length;
    // Label.
    const lf = fitLine(ctx, f.label, lst, lsz, inner.w);
    drawFitted(ctx, lf, lst, { x: inner.x, y, w: inner.w, h: lf.size * 1.3 }, "left", "top", BRIEF.label);
    // Value — fitted on the full value so the size never jumps while typing.
    const vy = y + z(e, m ? 28 : 24);
    const vh = rowH - z(e, m ? 44 : 38);
    const full = fitText(ctx, f.value, vst, { maxW: inner.w - z(e, 4), maxH: vh, maxSize: vsz, minSize: vsz * 0.72, maxLines: 2, lineHeight: 1.3 });
    applyFont(ctx, vst, full.size);
    // Re-wrap the shown part with the full value's breaks.
    let consumed = 0;
    let lastX = inner.x;
    let lastBase = vy + full.ascent;
    ctx.fillStyle = BRIEF.ink;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    full.lines.forEach((line, li) => {
      const lg = graphemes(line);
      const take = Math.max(0, Math.min(lg.length, n - consumed));
      consumed += lg.length + (li < full.lines.length - 1 ? 1 : 0);
      const base = vy + full.ascent + full.lineGap * li;
      if (take > 0) {
        const part = lg.slice(0, take).join("");
        ctx.fillText(part, inner.x, base);
        lastX = inner.x + ctx.measureText(part).width;
        lastBase = base;
      }
    });
    resetTracking(ctx);
    // Underline.
    hline(e, inner.x, inner.x + inner.w, y + rowH - z(e, 14), "rgba(20,24,26,0.12)");
    // Caret at the typing point.
    if (typing && !caretDrawn && n < g.length) {
      caretDrawn = true;
      ctx.fillStyle = BRIEF.caret;
      ctx.fillRect(lastX + z(e, 2), lastBase - full.size * 0.86, Math.max(e.hair, z(e, 2)), full.size * 1.08);
    }
  });

  // Send button, bottom of the card.
  const bh = z(e, m ? 50 : 40);
  const bw = z(e, m ? 160 : 132);
  const by = card.y + card.h - pad - bh;
  ctx.fillStyle = BRIEF.accent;
  roundRectPath(ctx, inner.x, by, bw, bh, z(e, 2));
  ctx.fill();
  const bst = ST.sans(500, 0.005);
  const bf = fitLine(ctx, "Send brief", bst, z(e, m ? 16 : 13.5), bw - z(e, 24));
  drawFitted(ctx, bf, bst, { x: inner.x, y: by, w: bw, h: bh }, "center", "middle", BRIEF.onAccent);

  drawChrome(e);
}

// ── public API ─────────────────────────────────────────────────────────────

/**
 * Draws one sketch into (0, 0, w, h) of ctx, honouring the current
 * transform (callers scale for devicePixelRatio, then pass CSS sizes — or
 * pass backing sizes with an identity transform). Never throws on odd input.
 * Await ensureSketchFonts() once before the first draw.
 */
export function drawSketch(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  input: SketchInput,
): void {
  if (!ctx || !(w > 0) || !(h > 0)) return;
  const e = makeEnv(ctx, w, h, input);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.setLineDash([]);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  try {
    if ("textRendering" in ctx) (ctx as CanvasRenderingContext2D & { textRendering: string }).textRendering = "optimizeLegibility";
    if ("fontKerning" in ctx) ctx.fontKerning = "normal";
  } catch {
    /* older engines */
  }
  if (e.stage === 0) drawBrief(e);
  else if (e.stage === 1) drawWire(e);
  else drawPage(e);
  ctx.restore();
}

/** Quadrant size of the atlas for a layout. */
export const ATLAS_QUADRANT: Record<SketchLayoutKind, { w: number; h: number }> = {
  desktop: { w: 1024, h: 640 },
  mobile: { w: 512, h: 1108 },
};

/**
 * 2×2 atlas of stages 1–4 (fully typed): stage 1 top-left, 2 top-right,
 * 3 bottom-left, 4 bottom-right. Quadrants are 1024×640 (desktop) or
 * 512×1108 (mobile); the canvas is resized to 2× that if needed.
 * Quadrant for stage n: col = (n - 1) % 2, row = floor((n - 1) / 2).
 */
export function drawSketchAtlas(
  canvas: HTMLCanvasElement,
  input: Omit<SketchInput, "stage" | "progress">,
): void {
  const q = ATLAS_QUADRANT[input.layout === "mobile" ? "mobile" : "desktop"];
  if (canvas.width !== q.w * 2) canvas.width = q.w * 2;
  if (canvas.height !== q.h * 2) canvas.height = q.h * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let stage = 1 as SketchStage; stage <= 4; stage = (stage + 1) as SketchStage) {
    const i = stage - 1;
    ctx.save();
    ctx.translate((i % 2) * q.w, Math.floor(i / 2) * q.h);
    drawSketch(ctx, q.w, q.h, { ...input, stage, progress: 1 });
    ctx.restore();
  }
}

/**
 * How many characters are visible for this input: the typed brief at
 * stage 0, the typed domain at stage 4, otherwise 0. Callers redraw only
 * when this changes.
 */
export function sketchVisibleChars(input: SketchInput): number {
  const p = typeof input.progress === "number" ? Math.max(0, Math.min(1, input.progress)) : 1;
  if (input.stage === 0) {
    const total = briefTotal(briefFields(cleanDisplay(input.display || input.name), SECTORS[input.sector] ? input.sector : "salon"));
    return Math.round(p * total);
  }
  if (input.stage === 4) return Math.round(p * graphemes(input.domain || "").length);
  return 0;
}
