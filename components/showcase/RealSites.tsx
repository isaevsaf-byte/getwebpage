"use client";

/**
 * RealSites (#work) — proof. The same kind of pane the visitor met in the
 * hero now shows four real, live sites, and each one scrolls inside the glass
 * as its row passes the middle of the screen.
 *
 * Desktop (≥1024px, fine pointer — html.fine-desktop): rows on the left, a
 * sticky pane on the right. One row is active at a time (scroll, hover or
 * keyboard focus). Phones, tablets and no-JS: a stack of cards, each with its
 * phone capture in a 4:3 pane. Reduced motion: no scrub, instant swaps.
 */

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { gsap, ScrollTrigger, useGSAP, motionMedia } from "@/lib/motion/gsap";
import Reveal from "@/components/motion/Reveal";
import RevealHeading from "@/components/motion/RevealHeading";
import { SharedName } from "@/components/motion/PageTransition";
import { useScrollTo } from "@/components/motion/SmoothScroll";
import CssPane from "@/components/showcase/primitives/CssPane";
import { FLAGS, SITES, TESTIMONIALS, TESTIMONIALS_TITLE } from "@/lib/showcase/content";
import { useVisitor } from "@/lib/showcase/visitor";
import { track } from "@/lib/showcase/analytics";
import SiteStage from "./real-sites/SiteStage";
import NextSketch from "./real-sites/NextSketch";
import { NEXT_INDEX, PANE_TILT, isStageLayout } from "./real-sites/sites";
import styles from "./real-sites/RealSites.module.css";

const ROW_COUNT = SITES.length + 1;
/**
 * The line a row must cross to become active: the pane's optical centre
 * (sticky at 12svh, about 48svh tall with its meter), not the viewport's.
 */
const ACTIVE_LINE = "36%";
/** Where a hero "site focus" lands the row's top: just past the active line. */
const FOCUS_LANDING = 0.34;
/** Pointer hovers are ignored this long after a scroll (content moving under a still mouse). */
const SCROLL_HOVER_GRACE_MS = 220;
/** A focused row survives the browser's own scroll-into-view for this long. */
const FOCUS_SCROLL_GRACE_MS = 400;

type Hover = { i: number; src: "pointer" | "focus"; at: number } | null;

/** Typographic apostrophes for display-size quotes (same words, proper glyph). */
function curly(text: string): string {
  return text.replace(/'/g, "\u2019");
}

function initialLoaded(): boolean[] {
  return Array.from({ length: ROW_COUNT }, () => false);
}

export default function RealSites() {
  const rootRef = useRef<HTMLElement>(null);
  const worksRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const tilt = useRef({ px: 0, py: 0, n: 0 });
  const stageMotion = useRef(false);
  const lastScroll = useRef(0);
  const hoverRef = useRef<Hover>(null);

  const [scrollIdx, setScrollIdx] = useState(0);
  const [hover, setHoverState] = useState<Hover>(null);
  const [loaded, setLoaded] = useState<{ on: boolean[]; lite: boolean }>(() => ({
    on: initialLoaded(),
    lite: false,
  }));

  const visitor = useVisitor();
  const scrollTo = useScrollTo();
  const active = hover?.i ?? scrollIdx;

  const setHover = useCallback((next: Hover) => {
    hoverRef.current = next;
    setHoverState(next);
  }, []);

  /** Lets layer i (and the one after it) fetch its capture. */
  const allowLoad = useCallback((i: number) => {
    setLoaded((prev) => {
      const want = [i, i + 1].filter((n) => n < ROW_COUNT && !prev.on[n]);
      if (want.length === 0) return prev;
      const on = prev.on.slice();
      for (const n of want) on[n] = true;
      const lite = document.documentElement.classList.contains("save-data");
      return { on, lite };
    });
  }, []);

  const applyTilt = useCallback(() => {
    const el = paneRef.current;
    if (!el) return;
    const t = tilt.current;
    el.style.setProperty("--rx", (PANE_TILT.x + t.px).toFixed(2));
    el.style.setProperty("--ry", (PANE_TILT.y + t.py + t.n).toFixed(2));
  }, []);

  /* ── Scroll choreography ─────────────────────────────────────────── */

  const { contextSafe } = useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const mm = motionMedia(({ ok, desktop, fine }) => {
        const stage = desktop && fine && isStageLayout();
        if (!stage) return;
        const rows = rowRefs.current.slice(0, ROW_COUNT);
        const screen = root.querySelector<HTMLElement>(`.${styles.screenInner}`);

        // Active row: one at a time, whichever row straddles the middle.
        rows.forEach((row, i) => {
          if (!row) return;
          ScrollTrigger.create({
            trigger: row,
            start: `top ${ACTIVE_LINE}`,
            end: `bottom ${ACTIVE_LINE}`,
            onToggle: (self) => {
              if (!self.isActive) return;
              setScrollIdx(i);
              if (hoverRef.current?.src === "pointer") setHover(null);
            },
          });
        });

        if (!ok) return; // Reduced motion: instant swaps, the capture stays at the top.

        stageMotion.current = true;
        const lite = document.documentElement.classList.contains("save-data");

        // SIGNATURE — the real site scrolls inside the glass, 1:1 with the page.
        SITES.forEach((_, i) => {
          const row = rows[i];
          const shot = root.querySelector<HTMLElement>(`[data-shot="${i}"]`);
          const bar = root.querySelector<HTMLElement>(`[data-bar="${i}"]`);
          const seg = root.querySelector<HTMLElement>(`[data-seg="${i}"]`);
          if (!row || !shot || !screen) return;
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: row,
              start: `top ${ACTIVE_LINE}`,
              end: `bottom ${ACTIVE_LINE}`,
              scrub: true,
              invalidateOnRefresh: true,
              onToggle: (self) => {
                shot.style.willChange = self.isActive ? "transform" : "";
              },
            },
          });
          if (!lite) {
            tl.fromTo(
              shot,
              { y: 0 },
              { y: () => -Math.max(0, shot.offsetHeight - screen.clientHeight), ease: "none" },
              0,
            );
            if (bar) {
              const frac = Number(bar.dataset.frac) || 1;
              tl.fromTo(bar, { yPercent: 0 }, { yPercent: (1 / frac - 1) * 100, ease: "none" }, 0);
            }
          }
          if (seg) tl.fromTo(seg, { scaleX: 0 }, { scaleX: 1, ease: "none" }, 0);
        });

        // The pane leans a few degrees toward the pointer — glass you could touch.
        const works = worksRef.current;
        let detach: (() => void) | undefined;
        if (fine && works) {
          const toX = gsap.quickTo(tilt.current, "px", {
            duration: 0.8,
            ease: "studio-out",
            onUpdate: applyTilt,
          });
          const toY = gsap.quickTo(tilt.current, "py", {
            duration: 0.8,
            ease: "studio-out",
            onUpdate: applyTilt,
          });
          const onMove = (e: PointerEvent) => {
            const pane = paneRef.current;
            if (!pane || e.pointerType !== "mouse") return;
            const r = pane.getBoundingClientRect();
            const nx = Math.max(
              -1,
              Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)),
            );
            const ny = Math.max(
              -1,
              Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)),
            );
            toY(nx * 3.2);
            toX(-ny * 2.2);
          };
          const onLeave = () => {
            toX(0);
            toY(0);
          };
          works.addEventListener("pointermove", onMove, { passive: true });
          works.addEventListener("pointerleave", onLeave);
          detach = () => {
            works.removeEventListener("pointermove", onMove);
            works.removeEventListener("pointerleave", onLeave);
          };
        }

        return () => {
          stageMotion.current = false;
          detach?.();
          gsap.killTweensOf(tilt.current);
          tilt.current = { px: 0, py: 0, n: 0 };
          applyTilt();
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  /** Site switch: the pane yaws −8° → −4° → −8° and a bar of light crosses the glass. */
  const prevActive = useRef(active);
  useEffect(() => {
    if (prevActive.current === active) return;
    prevActive.current = active;
    const playSwitch = contextSafe(() => {
      if (!stageMotion.current) return;
      gsap.to(tilt.current, {
        keyframes: [
          { n: 4, duration: 0.18, ease: "studio-out" },
          { n: 0, duration: 0.32, ease: "studio-out" },
        ],
        overwrite: "auto",
        onUpdate: applyTilt,
      });
      const sweep = rootRef.current?.querySelector<HTMLElement>("[data-sweep]");
      if (!sweep) return;
      gsap.fromTo(
        sweep,
        { xPercent: -100, autoAlpha: 1 },
        {
          xPercent: 240,
          duration: 0.62,
          ease: "studio-in-out",
          overwrite: true,
          onStart: () => {
            sweep.style.willChange = "transform";
          },
          onComplete: () => {
            sweep.style.willChange = "";
            gsap.set(sweep, { autoAlpha: 0 });
          },
        },
      );
    });
    playSwitch();
  }, [active, contextSafe, applyTilt]);

  // Hovered or focused rows load at once; the active one always has its
  // capture — but only once the section has come near the viewport, so the
  // tall captures never download on a load at the top of the page.
  const nearRef = useRef(false);
  useEffect(() => {
    if (!isStageLayout() || !nearRef.current) return;
    const id = requestAnimationFrame(() => allowLoad(active));
    return () => cancelAnimationFrame(id);
  }, [active, allowLoad]);

  /* ── Lazy captures: the row in view and the next one ─────────────── */

  useEffect(() => {
    if (!isStageLayout() || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          nearRef.current = true;
          const i = Number((e.target as HTMLElement).dataset.row);
          if (Number.isFinite(i)) allowLoad(i);
        }
      },
      { rootMargin: "50% 0px" },
    );
    for (const row of rowRefs.current) if (row) io.observe(row);
    return () => io.disconnect();
  }, [allowLoad]);

  /* ── Scroll clears a mouse hover (the page moved, not the pointer) ── */

  useEffect(() => {
    const onScroll = () => {
      const now = performance.now();
      lastScroll.current = now;
      const h = hoverRef.current;
      if (!h) return;
      // The page moved, not the pointer: scroll position decides again.
      if (h.src === "pointer") {
        setHover(null);
        return;
      }
      // A keyboard-focused row holds while it is on screen (it survives its
      // own scroll-into-view); once it scrolls away, scroll decides again.
      if (now - h.at < FOCUS_SCROLL_GRACE_MS) return;
      const r = rowRefs.current[h.i]?.getBoundingClientRect();
      if (!r || r.bottom < 0 || r.top > window.innerHeight) setHover(null);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [setHover]);

  /* ── Hero → "show me this site" ──────────────────────────────────── */

  useEffect(() => {
    let timer = 0;
    const onSiteFocus = (e: Event) => {
      const detail = (e as CustomEvent<unknown>).detail;
      const slug =
        typeof detail === "string"
          ? detail
          : detail && typeof detail === "object" && "slug" in detail
            ? String((detail as { slug: unknown }).slug)
            : "";
      const i = SITES.findIndex((s) => s.slug === slug);
      const target =
        i >= 0 ? rowRefs.current[i]?.querySelector<HTMLElement>("[data-landing]") : null;
      if (!target) return;
      allowLoad(i);
      // Next task, so this wins over any "scroll to #work" the hero starts first.
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const offset = isStageLayout() ? -Math.round(window.innerHeight * FOCUS_LANDING) : -72;
        scrollTo(target, { offset });
      }, 0);
    };
    window.addEventListener("gwp:site-focus", onSiteFocus);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("gwp:site-focus", onSiteFocus);
    };
  }, [scrollTo, allowLoad]);

  /* ── Row interactions ────────────────────────────────────────────── */

  const rowOf = (el: Element): number => {
    const n = Number((el.closest("[data-row]") as HTMLElement | null)?.dataset.row);
    return Number.isFinite(n) ? n : -1;
  };
  const onRowPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const i = rowOf(e.currentTarget);
    if (i < 0 || e.pointerType !== "mouse" || hoverRef.current?.i === i) return;
    if (performance.now() - lastScroll.current < SCROLL_HOVER_GRACE_MS) return;
    if (!isStageLayout()) return;
    setHover({ i, src: "pointer", at: performance.now() });
  };
  const onRowsLeave = () => {
    if (hoverRef.current?.src === "pointer") setHover(null);
  };
  const onRowFocus = (e: ReactFocusEvent<HTMLElement>) => {
    const i = rowOf(e.currentTarget);
    if (i >= 0 && isStageLayout()) setHover({ i, src: "focus", at: performance.now() });
  };
  const onRowBlur = () => {
    if (hoverRef.current?.src === "focus") setHover(null);
  };

  const toPricing = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    if (!document.querySelector("#pricing")) return;
    e.preventDefault();
    scrollTo("#pricing");
  };

  const quotes = FLAGS.testimonial1 ? TESTIMONIALS.filter((t) => FLAGS[t.flag]) : [];
  const nextLine = visitor.hasName ? `Next: ${visitor.name}?` : "Next project — could be yours";

  return (
    <section
      ref={rootRef}
      id="work"
      data-ground="paper"
      aria-labelledby="work-title"
      className={styles.section}
    >
      <div className={styles.inner}>
        <div ref={worksRef} className={styles.works}>
          <div className={styles.left}>
            <header className={styles.intro}>
              <SharedName name="work-title">
                <RevealHeading as="h2" id="work-title" className={styles.title}>
                  Built for real businesses.
                </RevealHeading>
              </SharedName>
              <Reveal as="p" className={styles.lede}>
                4 live sites — open any of them.
              </Reveal>
            </header>

            <ol className={styles.rows} onPointerLeave={onRowsLeave}>
              {SITES.map((site, i) => (
                <li
                  key={site.slug}
                  ref={(el) => {
                    rowRefs.current[i] = el;
                  }}
                  data-row={i}
                  data-active={active === i ? "" : undefined}
                  className={styles.row}
                  onPointerMove={onRowPointerMove}
                >
                  <span className={styles.landing} data-landing="" tabIndex={-1} />
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener"
                    aria-label={`Open ${site.domain} (opens in a new tab)`}
                    className={styles.link}
                    onClick={() => track("site_opened", { slug: site.slug })}
                    onAuxClick={() => track("site_opened", { slug: site.slug })}
                    onFocus={onRowFocus}
                    onBlur={onRowBlur}
                  >
                    <div className={`${styles.cardPane} sd-clip-reveal`}>
                      <CssPane
                        domain={site.domain}
                        secure
                        tone="ink"
                        aspect="4/3"
                        className={styles.cardPaneInner}
                      >
                        <div className={styles.phoneShot}>
                          <Image
                            src={site.mobile}
                            alt=""
                            width={780}
                            height={1688}
                            sizes="92vw"
                            className={styles.phoneImg}
                          />
                        </div>
                      </CssPane>
                    </div>
                    <Reveal className={styles.caption} selector="[data-rv]" stagger={0.05}>
                      <span className={styles.label} data-rv="">
                        <span className={styles.num} aria-hidden="true">
                          0{i + 1}
                        </span>
                        {site.label}
                      </span>
                      <h3 className={styles.domain} data-rv="">
                        {site.domain}
                      </h3>
                      <p className={styles.sub} data-rv="">
                        {site.sub}
                      </p>
                      <span className={styles.foot} data-rv="">
                        <span className={styles.thumb}>
                          <SharedName name={`work-${site.slug}`}>
                            <Image
                              src={site.pane}
                              alt=""
                              width={96}
                              height={72}
                              sizes="96px"
                              className={styles.thumbImg}
                            />
                          </SharedName>
                        </span>
                        <span className={styles.open}>
                          <span className={styles.openText}>Open {site.domain}</span>
                          <span aria-hidden="true">↗</span>
                        </span>
                      </span>
                    </Reveal>
                  </a>
                </li>
              ))}

              <li
                ref={(el) => {
                  rowRefs.current[NEXT_INDEX] = el;
                }}
                data-row={NEXT_INDEX}
                data-active={active === NEXT_INDEX ? "" : undefined}
                className={`${styles.row} ${styles.rowNext}`}
                onPointerMove={onRowPointerMove}
              >
                <span className={styles.landing} data-landing="" tabIndex={-1} />
                <div className={styles.nextCard}>
                  <div className={`${styles.cardPane} sd-clip-reveal`} aria-hidden="true">
                    <CssPane
                      domain={visitor.domain}
                      tone="ink"
                      aspect="4/3"
                      label="Sketch"
                      className={styles.cardPaneInner}
                    >
                      <NextSketch layout="mobile" />
                    </CssPane>
                  </div>
                  <Reveal className={styles.caption} selector="[data-rv]" stagger={0.05}>
                    <span className={styles.label} data-rv="">
                      <span className={styles.num} aria-hidden="true">
                        0{NEXT_INDEX + 1}
                      </span>
                    </span>
                    <h3 className={`${styles.domain} ${styles.nextLine}`} data-rv="">
                      {nextLine}
                    </h3>
                    <span className={styles.foot} data-rv="">
                      <span className={`${styles.thumb} ${styles.thumbEmpty}`} aria-hidden="true" />
                      <a
                        href="#pricing"
                        className={styles.open}
                        onClick={toPricing}
                        onFocus={onRowFocus}
                        onBlur={onRowBlur}
                      >
                        <span className={styles.openText}>See prices</span>
                      </a>
                    </span>
                  </Reveal>
                </div>
              </li>
            </ol>

            <div className={styles.ctaLine}>
              <Link href="/work" transitionTypes={["nav-forward"]} className={styles.textLink}>
                See all work →
              </Link>
              <a href="#pricing" className={styles.button} onClick={toPricing}>
                Choose a plan →
              </a>
            </div>
          </div>

          <SiteStage
            active={active}
            loaded={loaded.on}
            lite={loaded.lite}
            nextDomain={visitor.domain}
            paneRef={paneRef}
          />
        </div>

        {quotes.length > 0 ? (
          <div className={styles.voice}>
            <div className={styles.voiceInner}>
              <h3 className={styles.voiceTitle}>{TESTIMONIALS_TITLE}</h3>
              <div className={styles.voiceBody}>
                {quotes.map((t) => (
                  <Reveal key={t.flag} as="figure" className={styles.figure}>
                    <blockquote className={styles.quote}>
                      <p>
                        <span className={styles.qOpen} aria-hidden="true">
                          “
                        </span>
                        {curly(t.quote)}
                        <span aria-hidden="true">”</span>
                      </p>
                    </blockquote>
                    <figcaption className={styles.credit}>
                      <Image
                        src={SITES.find((s) => s.slug === t.slug)?.pane ?? SITES[0].pane}
                        alt=""
                        width={48}
                        height={30}
                        sizes="48px"
                        className={styles.creditThumb}
                      />
                      <span>
                        {t.name}
                        {t.role ? ` · ${t.role}` : ""}
                      </span>
                    </figcaption>
                  </Reveal>
                ))}
                <a href="#pricing" className={styles.textLink} onClick={toPricing}>
                  See prices →
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
