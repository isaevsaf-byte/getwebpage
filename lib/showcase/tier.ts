/**
 * Rendering tier: how much motion hardware this visitor gets.
 *
 *   'webgl'  — desktop, fine pointer, WebGL2, ≥4 cores, no Save-Data
 *   'css3d'  — everyone else with motion allowed (phones, tablets, weak GPUs)
 *   'static' — reduced motion, no JS, and the server render
 *
 * MOTION_GATE_SCRIPT runs inline in <head> before first paint and puts the
 * same facts on <html> as classes, so CSS can size sticky stages and gate
 * load-time keyframes without waiting for React.
 *
 * This module is imported by the root layout (a Server Component) for the
 * gate string, so it must not import client-only React hooks by name — the
 * RSC compiler rejects that. The hook goes through the React namespace and
 * only ever runs on the client.
 */
import * as React from "react";

export type Tier = "webgl" | "css3d" | "static";

const DOWNGRADE_KEY = "gwp:tier-downgrade";
const TIER_EVENT = "gwp:tier";
const Q_REDUCE = "(prefers-reduced-motion: reduce)";
const Q_FINE_DESKTOP = "(min-width:1024px) and (hover:hover) and (pointer:fine)";

/**
 * Inline <head> script (hand-minified ES5, no dependencies):
 * - html.js always
 * - html.motion-ok unless prefers-reduced-motion: reduce
 * - html.fine-desktop at ≥1024px with hover + fine pointer
 * - html.save-data when the browser reports Save-Data
 * - html.fonts-ready once Literata 560 has loaded, or after 2.5s regardless.
 *   React hoists the stylesheet above this script, and a parser-inserted
 *   script waits for pending stylesheets, so the @font-face rules exist when
 *   fonts.load() runs. If they somehow do not (empty result), it retries on
 *   DOMContentLoaded and the timeout still guarantees the class.
 */
export const MOTION_GATE_SCRIPT: string =
  '(function(){var d=document.documentElement,c=d.classList,m=function(q){try{return matchMedia(q).matches}catch(e){return!1}};' +
  'c.add("js");' +
  `m("${Q_REDUCE}")||c.add("motion-ok");` +
  `m("${Q_FINE_DESKTOP}")&&c.add("fine-desktop");` +
  'try{var n=navigator.connection;n&&n.saveData&&c.add("save-data")}catch(e){}' +
  'var k=0,r=function(){k||(k=1,c.add("fonts-ready"))};setTimeout(r,2500);' +
  'try{var f=document.fonts,l=function(){return f.load("560 1em Literata")};' +
  'l().then(function(a){a&&a.length?r():document.addEventListener("DOMContentLoaded",function(){l().then(function(b){b&&b.length&&r()},r)})},r)' +
  "}catch(e){r()}})();";

let memo: Tier | null = null;

function matches(query: string): boolean {
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

function saveData(): boolean {
  try {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    return nav.connection?.saveData === true;
  } catch {
    return false;
  }
}

function downgraded(): boolean {
  try {
    return sessionStorage.getItem(DOWNGRADE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Creates a throwaway WebGL2 context and releases it straight away. */
function hasWebGL2(): boolean {
  try {
    const canvas = document.createElement("canvas");
    // Software rasterisers (SwiftShader, llvmpipe) refuse here, which is what
    // we want: they cannot hold 60fps on the hero scene.
    const gl = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function computeTier(): Tier {
  if (matches(Q_REDUCE)) return "static";
  const webgl =
    matches(Q_FINE_DESKTOP) &&
    !saveData() &&
    (navigator.hardwareConcurrency ?? 0) >= 4 &&
    !downgraded() &&
    hasWebGL2();
  return webgl ? "webgl" : "css3d";
}

/**
 * The visitor's tier, computed once per page life and memoised.
 * Never uses navigator.deviceMemory (missing on Safari) or detect-gpu
 * (fetches a benchmark table from a CDN). 'static' on the server.
 */
export function getTier(): Tier {
  if (typeof window === "undefined") return "static";
  if (memo === null) memo = computeTier();
  return memo;
}

/**
 * Called by a WebGL scene that lost its context or failed the frame-rate
 * probe. Sticks for the session, and tells every useTier() to re-render.
 */
export function downgradeTier(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DOWNGRADE_KEY, "1");
  } catch {
    // Private mode — the in-memory memo below still holds for this page.
  }
  memo = getTier() === "static" ? "static" : "css3d";
  window.dispatchEvent(new CustomEvent<Tier>(TIER_EVENT, { detail: "css3d" }));
}

function subscribe(onChange: () => void): () => void {
  const onTier = () => onChange();
  // Reduced motion toggled mid-visit: recompute so scenes can step down.
  let mql: MediaQueryList | null = null;
  const onMotion = () => {
    memo = null;
    onChange();
  };
  window.addEventListener(TIER_EVENT, onTier);
  try {
    mql = window.matchMedia(Q_REDUCE);
    mql.addEventListener("change", onMotion);
  } catch {
    mql = null;
  }
  return () => {
    window.removeEventListener(TIER_EVENT, onTier);
    mql?.removeEventListener("change", onMotion);
  };
}

const serverTier = (): Tier => "static";

/**
 * 'static' on the server and during hydration (so markup always matches),
 * then the real tier. Re-renders when downgradeTier() fires 'gwp:tier'.
 */
export function useTier(): Tier {
  return React.useSyncExternalStore(subscribe, getTier, serverTier);
}
