/**
 * Text fitting for the canvas. Everything variable-length is measured and
 * fitted, never clipped: binary-searched size, up to N lines, words broken
 * by grapheme only when a single word cannot fit. Results are memoised.
 */
import { fontGeneration, fontString, type FontRole } from "./fonts";

export interface TextStyle {
  role: FontRole;
  weight: number;
  italic?: boolean;
  /** em, e.g. -0.02 */
  tracking?: number;
}

export interface FitResult {
  size: number;
  lines: string[];
  widths: number[];
  /** Ink ascent of the first line and descent of the last, in px. */
  ascent: number;
  descent: number;
  lineGap: number;
}

let segmenter: Intl.Segmenter | null | undefined;

export function graphemes(s: string): string[] {
  if (segmenter === undefined) {
    segmenter =
      typeof Intl !== "undefined" && "Segmenter" in Intl
        ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
        : null;
  }
  if (segmenter) return Array.from(segmenter.segment(s), (x) => x.segment);
  return Array.from(s);
}

let stripRe: RegExp | null | undefined;

/**
 * Defensive clean-up for whatever reaches the renderer: strips emoji,
 * control and format characters, collapses whitespace. Empty → fallback.
 */
export function cleanDisplay(raw: string | undefined | null, fallback = "your business"): string {
  let s = String(raw ?? "");
  if (stripRe === undefined) {
    try {
      stripRe = new RegExp(
        "[\\p{Extended_Pictographic}\\p{Emoji_Modifier}\\p{Regional_Indicator}\\p{Cc}\\p{Cf}\\u20e3\\ufe0e\\ufe0f]",
        "gu",
      );
    } catch {
      stripRe = null;
    }
  }
  if (stripRe) s = s.replace(stripRe, "");
  s = s.replace(/\s+/g, " ").trim();
  const g = graphemes(s);
  if (g.length > 48) s = g.slice(0, 48).join("").trim();
  return s.length ? s : fallback;
}

const hasLetterSpacing =
  typeof CanvasRenderingContext2D !== "undefined" &&
  "letterSpacing" in CanvasRenderingContext2D.prototype;

/** Applies font + tracking to the context. */
export function applyFont(
  ctx: CanvasRenderingContext2D,
  st: TextStyle,
  size: number,
): void {
  ctx.font = fontString(st.role, st.weight, size, st.italic);
  if (hasLetterSpacing) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      `${((st.tracking ?? 0) * size).toFixed(2)}px`;
  }
}

export function resetTracking(ctx: CanvasRenderingContext2D): void {
  if (hasLetterSpacing) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
  }
}

function measure(ctx: CanvasRenderingContext2D, s: string): number {
  return ctx.measureText(s).width;
}

/** Greedy wrap; breaks inside a word only when the word alone is too wide. */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  allowBreakWords: boolean,
): string[] | null {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const tryLine = cur ? `${cur} ${word}` : word;
    if (measure(ctx, tryLine) <= maxW) {
      cur = tryLine;
      continue;
    }
    if (cur) lines.push(cur);
    if (measure(ctx, word) <= maxW) {
      cur = word;
      continue;
    }
    if (!allowBreakWords) return null;
    // Break the long word by graphemes.
    let piece = "";
    for (const g of graphemes(word)) {
      if (measure(ctx, piece + g) <= maxW || !piece) piece += g;
      else {
        lines.push(piece);
        piece = g;
      }
    }
    cur = piece;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** For a two-line result, choose the most balanced word break that fits. */
function balance(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  maxW: number,
): string[] {
  if (lines.length !== 2) return lines;
  const words = `${lines[0]} ${lines[1]}`.split(" ");
  if (words.length < 3) return lines;
  let best = lines;
  let bestScore = Math.max(measure(ctx, lines[0]), measure(ctx, lines[1]));
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const wa = measure(ctx, a);
    const wb = measure(ctx, b);
    if (wa > maxW || wb > maxW) continue;
    // Avoid ending the first line on a lone connector like '&' or 'and'.
    const tail = words[i - 1].toLowerCase();
    const penalty = tail === "&" || tail === "and" || tail === "the" || tail === "of" ? 1.25 : 1;
    const score = Math.max(wa, wb) * penalty;
    if (score < bestScore - 0.5) {
      best = [a, b];
      bestScore = score;
    }
  }
  return best;
}

const memo = new Map<string, FitResult>();

export interface FitOptions {
  maxW: number;
  maxH: number;
  maxSize: number;
  minSize: number;
  maxLines: number;
  /** line pitch as a multiple of size */
  lineHeight: number;
  /** balance two-line breaks (headlines) */
  balance?: boolean;
}

function inkMetrics(ctx: CanvasRenderingContext2D, lines: string[], size: number) {
  const first = ctx.measureText(lines[0] || "H");
  const last = ctx.measureText(lines[lines.length - 1] || "H");
  // Never trust a zero ascent (empty strings, odd fonts).
  const ascent = Math.max(first.actualBoundingBoxAscent || 0, size * 0.7);
  const descent = Math.max(last.actualBoundingBoxDescent || 0, size * 0.02);
  return { ascent, descent };
}

/**
 * Finds the largest size (≤ maxSize) at which `text` fits the box in
 * ≤ maxLines lines. Falls back to grapheme breaks, then — only if it still
 * cannot fit — to sizes below minSize, so the result never overflows.
 */
export function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  st: TextStyle,
  o: FitOptions,
): FitResult {
  const key = `${fontGeneration()}|${text}|${st.role}${st.weight}${st.italic ? "i" : ""}${st.tracking ?? 0}|${o.maxW.toFixed(1)}x${o.maxH.toFixed(1)}|${o.maxSize.toFixed(2)}-${o.minSize.toFixed(2)}|${o.maxLines}|${o.lineHeight}|${o.balance ? 1 : 0}|${fontString(st.role, 400, 10)}`;
  const hit = memo.get(key);
  if (hit) return hit;

  const attempt = (size: number, breakWords: boolean): FitResult | null => {
    applyFont(ctx, st, size);
    const lines = wrap(ctx, text, o.maxW, breakWords);
    if (!lines || lines.length > o.maxLines) return null;
    const pitch = size * o.lineHeight;
    const { ascent, descent } = inkMetrics(ctx, lines, size);
    const h = ascent + descent + pitch * (lines.length - 1);
    if (h > o.maxH) return null;
    const finalLines = o.balance ? balance(ctx, lines, o.maxW) : lines;
    return {
      size,
      lines: finalLines,
      widths: finalLines.map((l) => measure(ctx, l)),
      ascent,
      descent,
      lineGap: pitch,
    };
  };

  const search = (lo: number, hi: number, breakWords: boolean): FitResult | null => {
    let best = attempt(lo, breakWords);
    if (!best) return null;
    const top = attempt(hi, breakWords);
    if (top) return top;
    for (let i = 0; i < 9 && hi - lo > 0.25; i++) {
      const mid = (lo + hi) / 2;
      const r = attempt(mid, breakWords);
      if (r) {
        best = r;
        lo = mid;
      } else hi = mid;
    }
    return best;
  };

  let res =
    search(o.minSize, o.maxSize, false) ??
    search(o.minSize, o.maxSize, true);
  if (!res) {
    // Last resort: shrink below the minimum until it fits.
    let size = o.minSize;
    while (!res && size > 4) {
      size *= 0.85;
      res = attempt(size, true);
    }
    res = res ?? attempt(4, true) ?? {
      size: 4,
      lines: [text],
      widths: [0],
      ascent: 3,
      descent: 1,
      lineGap: 4,
    };
  }
  if (memo.size > 400) memo.clear();
  memo.set(key, res);
  return res;
}

export type Align = "left" | "center" | "right";
export type VAlign = "top" | "middle" | "bottom";

/**
 * Draws a fit result inside a box. The ink box of the text is aligned, not
 * the em box, so optical alignment holds for any font.
 */
export function drawFitted(
  ctx: CanvasRenderingContext2D,
  fit: FitResult,
  st: TextStyle,
  box: { x: number; y: number; w: number; h: number },
  align: Align,
  valign: VAlign,
  color: string,
): { top: number; bottom: number; left: number; right: number } {
  applyFont(ctx, st, fit.size);
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const total = fit.ascent + fit.descent + fit.lineGap * (fit.lines.length - 1);
  let top: number;
  if (valign === "top") top = box.y;
  else if (valign === "bottom") top = box.y + box.h - total;
  else top = box.y + (box.h - total) / 2;
  let left = Infinity;
  let right = -Infinity;
  // Tracking adds trailing space after the last glyph; remove it from width.
  const trail = (st.tracking ?? 0) * fit.size;
  fit.lines.forEach((line, i) => {
    const w = fit.widths[i] - (hasLetterSpacing ? trail : 0);
    let x = box.x;
    if (align === "center") x = box.x + (box.w - w) / 2;
    else if (align === "right") x = box.x + box.w - w;
    const baseline = top + fit.ascent + fit.lineGap * i;
    ctx.fillText(line, x, baseline);
    left = Math.min(left, x);
    right = Math.max(right, x + w);
  });
  resetTracking(ctx);
  return { top, bottom: top + total, left, right };
}

/** Single line, shrink-to-fit. Static copy uses this so fallback fonts never overflow. */
export function fitLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  st: TextStyle,
  size: number,
  maxW: number,
  minSize = size * 0.6,
): FitResult {
  return fitText(ctx, text, st, {
    maxW,
    maxH: size * 3,
    maxSize: size,
    minSize,
    maxLines: 1,
    lineHeight: 1.2,
  });
}
