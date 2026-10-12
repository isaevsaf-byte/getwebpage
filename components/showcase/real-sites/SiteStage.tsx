"use client";

/**
 * The desktop stage: one sticky glass pane whose screen holds every site as
 * a stacked layer. The active layer is on top; switching crossfades in CSS
 * (350ms studio-out) while RealSites plays the yaw nudge and the light sweep.
 *
 * Each site layer is a 1280-wide tall capture inside an overflow:hidden
 * screen. RealSites scrubs its `[data-shot]` wrapper upward with the row's
 * scroll, so the visitor watches the real site scroll inside the glass. The
 * wrapper carries the capture's aspect ratio, so its height is known before
 * the image arrives and ScrollTrigger never measures a zero.
 *
 * Decorative: the whole stage is aria-hidden. Every link lives in the rows.
 */

import { memo, useEffect, useRef, useState, type Ref } from "react";
import CssPane from "@/components/showcase/primitives/CssPane";
import { SITES } from "@/lib/showcase/content";
import NextSketch from "./NextSketch";
import { NEXT_INDEX, PANE_TILT, TALL_HEIGHT, TALL_WIDTH, visibleFraction } from "./sites";
import styles from "./RealSites.module.css";

export interface SiteStageProps {
  active: number;
  /** Which layers may fetch their image (active + next, via the rows' observer). */
  loaded: readonly boolean[];
  /** Save-Data: the light 1024 capture instead of the tall scroll-through. */
  lite: boolean;
  nextDomain: string;
  paneRef: Ref<HTMLDivElement>;
}

/** Types `target` into the address bar, padded so the centred text never jitters. */
function useAddressBar(target: string): string {
  const [shown, setShown] = useState(target);
  const last = useRef(target);

  useEffect(() => {
    if (last.current === target) return;
    last.current = target;
    const motion =
      document.documentElement.classList.contains("motion-ok") &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chars = Array.from(target);
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const n = motion ? Math.min(chars.length, 1 + Math.floor((t - start) / 24)) : chars.length;
      // DM Mono: a no-break space is exactly one glyph wide.
      setShown(chars.slice(0, n).join("") + " ".repeat(chars.length - n));
      if (n < chars.length) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return shown;
}

function SiteStage({ active, loaded, lite, nextDomain, paneRef }: SiteStageProps) {
  const isNext = active === NEXT_INDEX;
  const domain = useAddressBar(isNext ? nextDomain : (SITES[active]?.domain ?? ""));
  const count = isNext ? "Next" : `0${active + 1} / 0${SITES.length}`;

  return (
    <div className={styles.stage} aria-hidden="true">
      <div className={styles.sticky}>
        <CssPane
          domain={domain}
          secure={!isNext}
          tone="ink"
          aspect="16/10"
          tilt={PANE_TILT}
          label={isNext ? "Sketch" : undefined}
          paneRef={paneRef}
          className={styles.pane}
        >
          <div className={styles.screenInner}>
            {SITES.map((site, i) => {
              const h = lite ? 640 : TALL_HEIGHT[site.slug];
              const w = lite ? 1024 : TALL_WIDTH;
              const frac = lite ? 1 : visibleFraction(h);
              return (
                <div
                  key={site.slug}
                  className={styles.layer}
                  data-layer={i}
                  data-on={active === i ? "" : undefined}
                >
                  <div className={styles.shot} data-shot={i} style={{ aspectRatio: `${w} / ${h}` }}>
                    {loaded[i] ? (
                      // A 1280-wide capture scrubbed as one compositor layer —
                      // next/image would re-encode a 4096px-tall file per request.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={lite ? site.pane : site.tall}
                        alt=""
                        width={w}
                        height={h}
                        decoding="async"
                        draggable={false}
                      />
                    ) : null}
                  </div>
                  {frac < 1 ? (
                    <span className={styles.scrollbar}>
                      <span
                        className={styles.scrollThumb}
                        data-bar={i}
                        data-frac={frac.toFixed(4)}
                        style={{ height: `${(frac * 100).toFixed(2)}%` }}
                      />
                    </span>
                  ) : null}
                </div>
              );
            })}
            <div
              className={`${styles.layer} ${styles.layerSketch}`}
              data-layer={NEXT_INDEX}
              data-on={isNext ? "" : undefined}
            >
              {loaded[NEXT_INDEX] ? <NextSketch layout="desktop" /> : null}
            </div>
            <span className={styles.sweep}>
              <span className={styles.sweepBar} data-sweep="" />
            </span>
          </div>
        </CssPane>

        <div className={styles.meter}>
          <span className={styles.segs}>
            {SITES.map((site, i) => (
              <span
                key={site.slug}
                className={styles.seg}
                data-state={i < active ? "done" : i === active ? "on" : undefined}
              >
                <span className={styles.segFill} data-seg={i} />
              </span>
            ))}
          </span>
          <span className={styles.count}>{count}</span>
        </div>
      </div>
    </div>
  );
}

export default memo(SiteStage);
