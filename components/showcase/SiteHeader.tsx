"use client";

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import { SharedName } from "@/components/motion/PageTransition";
import { useScrollTo } from "@/components/motion/SmoothScroll";
import { track } from "@/lib/showcase/analytics";
import { getAiCopy, subscribeAiCopy } from "@/lib/showcase/aiCopy";
import s from "./site-header/SiteHeader.module.css";

/**
 * Fixed site header. It reads the ground of the section passing under its
 * bottom edge (any [data-ground], plus the ink footer) and tones itself to
 * match; the new ground wipes through the bar in the direction you scroll.
 * On the home page the links are in-page jumps and an ink hairline walks
 * left → right across them as the story scrolls toward the prices.
 * No scroll listeners: three IntersectionObservers and a CSS scroll timeline.
 */

type Tone = "ink" | "paper";
type Item = { label: string; href: string; anchor?: string; spy?: string[] };

// Page order, so the hairline travels one way on the way down to pricing.
const NAV: Item[] = [
  { label: "Process", anchor: "#seven-days", href: "/process", spy: ["seven-days"] },
  { label: "Work", anchor: "#work", href: "/work", spy: ["work"] },
  { label: "Made by AI", anchor: "#made-by-ai", href: "/#made-by-ai", spy: ["made-by-ai"] },
  { label: "Pricing", anchor: "#pricing", href: "/pricing", spy: ["pricing", "ownership"] },
  { label: "Free audit", href: "/audit", spy: ["audit"] },
];
const SPY = new Map(NAV.flatMap((it) => (it.spy ?? []).map((id) => [id, it.label] as const)));
const EMAIL = "saf@safarisaev.ai";
const GROUND = "[data-ground], footer";
const AI_LINK = "Made by AI";
const FWD = ["nav-forward"];
const plainClick = (e: MouseEvent) =>
  e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
const visible = (el: HTMLElement) => el.getClientRects().length > 0;

let wipeRegistered = false;
function registerWipe() {
  if (wipeRegistered || typeof CSS === "undefined" || !CSS.registerProperty) return;
  wipeRegistered = true;
  try {
    CSS.registerProperty({ name: "--hdr-wipe", syntax: "<percentage>", inherits: false, initialValue: "100%" });
  } catch {
    // Already registered (hot reload) — the animation still interpolates.
  }
}

export default function SiteHeader({ home: homeProp }: { home?: boolean }) {
  const pathname = usePathname();
  const home = homeProp ?? pathname === "/";
  const scrollTo = useScrollTo();
  const lenis = useLenis();

  const rootRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const inkRef = useRef<HTMLSpanElement>(null);
  const inkPlaced = useRef(false);
  const dirRef = useRef<"up" | "down">("down");
  const scrolledRef = useRef(false);

  const [tone, setTone] = useState<Tone>("ink");
  const [scrolled, setScrolled] = useState(false);
  const [spy, setSpy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const prevTone = useRef(tone);
  const active = home ? spy : null;

  // Close the sheet on navigation (adjusting state during render, not in an effect).
  const [menuPath, setMenuPath] = useState(pathname);
  if (pathname !== menuPath) {
    setMenuPath(pathname);
    setOpen(false);
  }

  // Scrolled more than 8px: an 8px sentinel at the top of the document leaves view.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      scrolledRef.current = !e.isIntersecting;
      setScrolled(!e.isIntersecting);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Ground under the header's bottom edge: a 1px probe line, rebuilt on resize.
  // A MutationObserver picks up grounds that mount late or flip their value.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const hits = new Set<Element>();
    let io: IntersectionObserver | undefined;
    let raf = 0;

    const evaluate = () => {
      let pick: HTMLElement | null = null;
      for (const el of hits) if (!pick || pick.contains(el)) pick = el as HTMLElement; // innermost wins
      const g = pick?.dataset.ground;
      if (pick) setTone(g === "paper" || g === "surface" ? "paper" : "ink");
    };
    const onHit: IntersectionObserverCallback = (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) {
          hits.delete(e.target);
          continue;
        }
        hits.add(e.target);
        const line = e.rootBounds?.top ?? 0;
        const r = e.boundingClientRect;
        // Entered from below (scrolling down) when its top is nearer the line.
        dirRef.current = line - r.top < r.bottom - line ? "down" : "up";
      }
      evaluate();
    };
    const build = () => {
      io?.disconnect();
      hits.clear();
      const h = Math.round(root.getBoundingClientRect().height);
      io = new IntersectionObserver(onHit, {
        rootMargin: `-${h}px 0px -${Math.max(0, window.innerHeight - h - 1)}px 0px`,
      });
      document.querySelectorAll(GROUND).forEach((el) => io!.observe(el));
    };
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(build);
    };
    const mo = new MutationObserver((recs) => {
      for (const r of recs) {
        if (r.type === "attributes") {
          if (hits.has(r.target as Element)) evaluate();
          continue;
        }
        r.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches(GROUND)) io?.observe(n);
          n.querySelectorAll(GROUND).forEach((el) => io?.observe(el));
        });
      }
    });
    build();
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-ground"] });
    window.addEventListener("resize", onResize);
    return () => {
      io?.disconnect();
      mo.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [pathname]);

  // While Claude is really writing the visitor's copy in the hero, a dot by
  // "Made by AI" breathes; once it has written, the dot stays lit. Set as an
  // attribute (no re-render per streamed token).
  useEffect(() => {
    const apply = () => {
      const st = getAiCopy().status;
      rootRef.current?.setAttribute("data-ai", st === "writing" || st === "done" ? st : "idle");
    };
    apply();
    return subscribeAiCopy(apply);
  }, []);

  // Home: which chapter of the story sits at 40% of the viewport.
  useEffect(() => {
    if (!home) return;
    const on = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) on.add(e.target.id);
          else on.delete(e.target.id);
        }
        const id = [...on].pop();
        setSpy(id ? SPY.get(id) ?? null : null);
      },
      { rootMargin: "-40% 0px -59% 0px" },
    );
    for (const id of SPY.keys()) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [home]);

  // Ink hairline: glides (transform only) to the hovered or focused link, else
  // to the current one; fades out in place when there is neither.
  useEffect(() => {
    const nav = navRef.current;
    const ink = inkRef.current;
    if (!nav || !ink) return;
    let lead: HTMLElement | null = null;
    const place = (instant = false) => {
      const t = lead ?? nav.querySelector<HTMLElement>("a[aria-current]");
      if (!t) {
        ink.style.opacity = "0";
        return;
      }
      const jump = instant || !inkPlaced.current;
      if (jump) ink.style.transition = "none";
      ink.style.transform = `translate3d(${t.offsetLeft}px,0,0) scaleX(${t.offsetWidth})`;
      ink.style.opacity = "1";
      if (jump) {
        void ink.offsetWidth;
        ink.style.transition = "";
      }
      inkPlaced.current = true;
    };
    const enter = (e: Event) => {
      const a = (e.target as Element).closest?.("a");
      if (a && (e.type === "focusin" || (e as PointerEvent).pointerType === "mouse")) {
        lead = a;
        place();
      }
    };
    const leave = () => {
      lead = null;
      place();
    };
    const ro = new ResizeObserver(() => place(true));
    place();
    ro.observe(nav);
    nav.addEventListener("pointerover", enter);
    nav.addEventListener("focusin", enter);
    nav.addEventListener("pointerleave", leave);
    nav.addEventListener("focusout", leave);
    return () => {
      ro.disconnect();
      nav.removeEventListener("pointerover", enter);
      nav.removeEventListener("focusin", enter);
      nav.removeEventListener("pointerleave", leave);
      nav.removeEventListener("focusout", leave);
    };
  }, [active, pathname]);

  // Tone wipe: the new ground sweeps through the bar in the scroll direction.
  useLayoutEffect(() => {
    const from = prevTone.current;
    prevTone.current = tone;
    const bg = bgRef.current;
    if (from === tone || !bg?.animate || !scrolledRef.current) return;
    if (!document.documentElement.classList.contains("motion-ok")) return;
    registerWipe();
    bg.style.setProperty("--bg-old", `var(--c-${from})`);
    bg.style.setProperty("--wipe-dir", dirRef.current === "down" ? "to top" : "to bottom");
    const a = bg.animate({ "--hdr-wipe": ["0%", "100%"] } as unknown as Keyframe[], {
      duration: 420,
      easing: "cubic-bezier(.16,1,.3,1)",
    });
    const done = () => {
      bg.style.removeProperty("--bg-old");
      bg.style.removeProperty("--wipe-dir");
    };
    a.onfinish = done;
    return () => {
      a.cancel();
      done();
    };
  }, [tone]);

  // Sheet open (a disclosure: the header button stays its only control):
  // stop Lenis, focus the first link, keep Tab inside header + sheet, Escape closes.
  useEffect(() => {
    if (!open) return;
    lenis?.stop();
    const sheet = sheetRef.current;
    const raf = requestAnimationFrame(() => sheet?.querySelector<HTMLElement>("a[href]")?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuBtnRef.current?.focus();
      } else if (e.key === "Tab" && sheet && rootRef.current) {
        const f = [
          ...rootRef.current.querySelectorAll<HTMLElement>("a[href], button"),
          ...sheet.querySelectorAll<HTMLElement>("a[href]"),
        ].filter(visible);
        const i = f.indexOf(document.activeElement as HTMLElement);
        const n = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : i === f.length - 1 ? 0 : i + 1;
        e.preventDefault();
        f[n]?.focus();
      }
    };
    const mq = window.matchMedia("(min-width: 1024px)");
    const onMq = () => mq.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    // The full-screen sheet covers the page: take the page out of the
    // accessibility tree too, so swipe navigation cannot wander behind it.
    // The header (and its close button) stays live.
    const behind = Array.from(
      document.querySelectorAll<HTMLElement>("main, footer, .wa-btn, [aria-label='Prices and contact']"),
    ).filter((el) => !el.inert && !el.contains(sheet));
    for (const el of behind) el.inert = true;
    return () => {
      for (const el of behind) el.inert = false;
      lenis?.start();
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
  }, [open, lenis]);

  const jump = (e: MouseEvent<HTMLAnchorElement>, hash: string, pricing = false) => {
    if (!plainClick(e)) return;
    e.preventDefault();
    if (pricing && window.scrollY < window.innerHeight) track("pricing_from_hero");
    setOpen(false);
    lenis?.start();
    scrollTo(hash);
  };

  const link = (it: Item, cls: string) => {
    const current = active === it.label ? "location" : !home && pathname === it.href ? "page" : undefined;
    return home && it.anchor ? (
      <a href={it.anchor} className={cls} aria-current={current} onClick={(e) => jump(e, it.anchor!)}>
        {it.label}
        {it.label === AI_LINK && <span className={s.aiDot} aria-hidden />}
      </a>
    ) : (
      <Link href={it.href} className={cls} aria-current={current} transitionTypes={FWD} onClick={() => setOpen(false)}>
        {it.label}
        {it.label === AI_LINK && <span className={s.aiDot} aria-hidden />}
      </Link>
    );
  };

  const label = (
    <span className={s.face}>
      <span className={s.full}>See prices</span>
      <span className={s.short}>Prices</span>
    </span>
  );
  const close = () => {
    setOpen(false);
    menuBtnRef.current?.focus();
  };

  return (
    <>
      <div ref={sentinelRef} className={s.sentinel} aria-hidden />
      <SharedName name="site-header">
        <header
          ref={rootRef}
          className={s.root}
          data-tone={tone}
          data-scrolled={scrolled}
          data-open={open}
        >
          <div ref={bgRef} className={s.bg} aria-hidden>
            <span className={s.progress} />
          </div>
          <div className={s.bar}>
            {home ? (
              <a href="#top" className={s.mark} onClick={(e) => jump(e, "#top")}>
                GetWebPage
              </a>
            ) : (
              <Link href="/" className={s.mark} transitionTypes={["nav-back"]} onClick={() => setOpen(false)}>
                GetWebPage
              </Link>
            )}
            <nav ref={navRef} aria-label="Main" className={s.nav}>
              <ul className={s.links}>
                {NAV.map((it) => (
                  <li key={it.label}>{link(it, s.link)}</li>
                ))}
              </ul>
              <span ref={inkRef} className={s.ink} aria-hidden />
            </nav>
            {home ? (
              <a href="#pricing" className={s.cta} onClick={(e) => jump(e, "#pricing", true)}>
                {label}
              </a>
            ) : (
              <Link href="/pricing" className={s.cta} transitionTypes={FWD}>
                {label}
              </Link>
            )}
            <button
              ref={menuBtnRef}
              type="button"
              className={s.menuBtn}
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((o) => !o)}
            >
              <span className={s.burger} aria-hidden>
                <i />
                <i />
              </span>
            </button>
          </div>
        </header>
      </SharedName>

      <div className={s.layer} hidden={!open}>
        <div className={s.backdrop} onClick={close} aria-hidden />
        <div ref={sheetRef} id="site-menu" className={s.sheet} data-lenis-prevent>
          <nav aria-label="Menu">
            <ul className={s.sheetLinks}>
              {NAV.map((it, i) => (
                <li key={it.label} style={{ "--i": i } as React.CSSProperties}>
                  {link(it, s.sheetLink)}
                </li>
              ))}
              <li style={{ "--i": NAV.length } as React.CSSProperties}>
                <Link
                  href="/contact"
                  className={s.sheetLink}
                  aria-current={pathname === "/contact" ? "page" : undefined}
                  transitionTypes={FWD}
                  onClick={() => setOpen(false)}
                >
                  Contact
                </Link>
              </li>
            </ul>
          </nav>
          <a className={s.mail} href={`mailto:${EMAIL}`}>
            {EMAIL}
          </a>
        </div>
      </div>
    </>
  );
}
