/**
 * WebGL context budget. Browsers drop the oldest context once a page holds
 * too many (Safari is the strictest), so the home page allows at most two
 * live stages: the hero and SevenDays. No three.js import here — the stage
 * component reads this before it decides to download anything.
 */
export const MAX_CONTEXTS = 2;

let live = 0;

/** Returns a release function, or null when the budget is spent. */
export function claimContextSlot(): (() => void) | null {
  if (live >= MAX_CONTEXTS) return null;
  live += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    live = Math.max(0, live - 1);
  };
}

export function liveContexts(): number {
  return live;
}
