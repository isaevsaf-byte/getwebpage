/**
 * Font resolution for the canvas. The page loads Literata / DM Sans / DM Mono
 * through next/font, which exposes the real family lists as CSS variables.
 * The canvas cannot read CSS variables, so we resolve them once and append
 * safe system fallbacks.
 */

export type FontRole = "display" | "sans" | "mono";

const VARS: Record<FontRole, string> = {
  display: "--font-display",
  sans: "--font-sans",
  mono: "--font-mono",
};

const FALLBACK: Record<FontRole, string> = {
  display: "Georgia, 'Times New Roman', serif",
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  mono: "ui-monospace, Menlo, Consolas, monospace",
};

let families: Record<FontRole, string> | null = null;
let generation = 0;
let watching = false;

/**
 * Bumps whenever a font finishes loading, so cached measurements and cached
 * imagery made with fallback metrics are thrown away.
 */
export function fontGeneration(): number {
  if (!watching && typeof document !== "undefined" && document.fonts) {
    watching = true;
    try {
      document.fonts.addEventListener("loadingdone", () => {
        generation++;
        families = null;
      });
    } catch {
      /* ignore */
    }
  }
  return generation;
}

function resolve(): Record<FontRole, string> {
  const out = { ...FALLBACK };
  if (typeof document === "undefined") return out;
  try {
    const cs = getComputedStyle(document.documentElement);
    (Object.keys(VARS) as FontRole[]).forEach((role) => {
      const v = cs.getPropertyValue(VARS[role]).trim();
      if (v) out[role] = `${v}, ${FALLBACK[role]}`;
    });
  } catch {
    /* keep fallbacks */
  }
  return out;
}

/** Family lists for ctx.font. Resolved once, lazily. */
export function fontFamilies(): Record<FontRole, string> {
  if (!families) {
    families = resolve();
    // If the CSS variables were not there yet (very early call), retry later.
    if (families.display === FALLBACK.display) {
      const f = families;
      families = null;
      return f;
    }
  }
  return families;
}

/** Builds a ctx.font string. */
export function fontString(
  role: FontRole,
  weight: number,
  sizePx: number,
  italic = false,
): string {
  const fam = fontFamilies()[role];
  return `${italic ? "italic " : ""}${weight} ${Math.max(1, sizePx).toFixed(2)}px ${fam}`;
}

let ready: Promise<void> | null = null;

/** True when the text has glyphs outside Latin + general punctuation. */
function needsExtraSubset(text: string): boolean {
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0;
    if (c > 0x24f && (c < 0x2000 || c > 0x206f)) return true;
  }
  return false;
}

/**
 * Loads every face the sketch draws with (Literata 560/300/400 + italic,
 * DM Sans 400/500/600, DM Mono 400) and resolves when they are usable.
 * Pass `sample` (e.g. the visitor's name) to also pull in the unicode-range
 * subset it needs — Cyrillic, Greek or Vietnamese — before the next draw.
 * Never rejects; on failure the canvas falls back to Georgia / system-ui.
 */
export async function ensureSketchFonts(sample?: string): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  families = null;
  const f = fontFamilies();
  const base = ready;
  const loads = [
    `560 1em ${f.display}`,
    `300 1em ${f.display}`,
    `400 1em ${f.display}`,
    `italic 400 1em ${f.display}`,
    `400 1em ${f.sans}`,
    `500 1em ${f.sans}`,
    `600 1em ${f.sans}`,
    `400 1em ${f.mono}`,
  ];
  const job = (async () => {
    if (base) await base;
    try {
      await Promise.all(
        loads.map((l) => document.fonts.load(l).catch(() => [])),
      );
      if (sample && needsExtraSubset(sample)) {
        await Promise.all(
          [`560 1em ${f.display}`, `italic 400 1em ${f.display}`, `600 1em ${f.sans}`].map((l) =>
            document.fonts.load(l, sample).catch(() => []),
          ),
        );
      }
      await document.fonts.ready;
    } catch {
      /* fall back silently */
    }
    families = resolve();
    generation++;
  })();
  if (!sample) ready = job;
  return job;
}
