import { ACESFilmicToneMapping, SRGBColorSpace, WebGLRenderer } from "three";

/** Retina screens render at most 1.75 device pixels per CSS pixel. */
export const MAX_DPR = 1.75;

export function stageDpr(): number {
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  return Math.min(dpr, MAX_DPR);
}

/**
 * The one way the site creates a WebGL renderer. Transparent clear so the
 * page's ink ground shows through; ACES tone mapping for the glass highlights.
 * Throws when the browser refuses a context (or only offers a software one) —
 * the stage catches that and stays on the CSS poster.
 */
export function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
    // A software rasteriser would run the hero at single-digit fps; the CSS
    // poster is the better experience there.
    failIfMajorPerformanceCaveat: true,
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setPixelRatio(stageDpr());
  renderer.setClearColor(0x000000, 0);
  return renderer;
}
