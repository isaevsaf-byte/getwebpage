"use client";

/**
 * Bottom offer bar for phones and touch screens. Mounted once on the home
 * page. It appears once the hero (#top) is less than 20% visible, steps aside
 * while #pricing or #contact is on screen and while a text field has focus
 * (the keyboard is up).
 *
 * It owns two classes on <html> that other components read:
 *   html.input-focused       a text input/textarea/select has focus
 *   html.offer-bar-visible   this bar is showing (the WhatsApp FAB hides)
 */

import { useEffect, useState, type MouseEvent } from "react";
import { useScrollTo } from "@/components/motion/SmoothScroll";
import styles from "./StickyOfferBar.module.css";

const WA_LINK = "https://wa.me/447729741116";
const ELIGIBLE = "(max-width: 767.98px), (pointer: coarse)";
const TEXT_FIELD = [
  "input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit])" +
    ":not([type=reset]):not([type=range]):not([type=color]):not([type=file]):not([type=image]):not([type=hidden])",
  "textarea",
  "select",
  "[contenteditable='']",
  "[contenteditable='true']",
].join(", ");

const isTextField = (el: EventTarget | Element | null): boolean =>
  el instanceof Element && el.matches(TEXT_FIELD);

export default function StickyOfferBar() {
  const scrollTo = useScrollTo();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia(ELIGIBLE);
    const s = {
      eligible: mq.matches,
      pastTop: false,
      input: isTextField(document.activeElement),
      blockers: new Set<Element>(),
    };

    const update = () => {
      root.classList.toggle("input-focused", s.input);
      const visible = s.eligible && s.pastTop && s.blockers.size === 0 && !s.input;
      root.classList.toggle("offer-bar-visible", visible);
      setShown(visible);
    };

    const observers: IntersectionObserver[] = [];

    const top = document.getElementById("top");
    if (top) {
      const io = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          s.pastTop = entry.intersectionRatio < 0.2;
          update();
        },
        { threshold: [0, 0.2] },
      );
      io.observe(top);
      observers.push(io);
    } else {
      s.pastTop = true;
    }

    const blockerIO = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) s.blockers.add(entry.target);
          else s.blockers.delete(entry.target);
        }
        update();
      },
      { threshold: 0 },
    );
    for (const id of ["pricing", "contact"]) {
      const el = document.getElementById(id);
      if (el) blockerIO.observe(el);
    }
    observers.push(blockerIO);

    const onFocusIn = (e: FocusEvent) => {
      s.input = isTextField(e.target);
      update();
    };
    // During focusout the next element is relatedTarget (null when focus leaves).
    const onFocusOut = (e: FocusEvent) => {
      s.input = isTextField(e.relatedTarget);
      update();
    };
    const onMq = () => {
      s.eligible = mq.matches;
      update();
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    mq.addEventListener("change", onMq);
    update();

    return () => {
      for (const io of observers) io.disconnect();
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      mq.removeEventListener("change", onMq);
      root.classList.remove("input-focused", "offer-bar-visible");
    };
  }, []);

  const onPrices = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    scrollTo("#pricing");
  };

  return (
    <>
      <div
        className={`${styles.bar} enter-up`}
        hidden={!shown}
        role="region"
        aria-label="Prices and contact"
        data-offer-bar=""
      >
        <div className={styles.offer}>
          <span className={styles.price}>From £500</span>
          <a className={styles.cta} href="#pricing" onClick={onPrices}>
            See prices
          </a>
        </div>
        <a
          className={styles.wa}
          href={WA_LINK}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Message us on WhatsApp"
        >
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path
              d="M16 2C8.268 2 2 8.268 2 16c0 2.478.658 4.799 1.806 6.8L2 30l7.374-1.782A13.93 13.93 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2Z"
              fill="#e3e6e0"
            />
            <path
              d="M16 4.2C9.482 4.2 4.2 9.482 4.2 16c0 2.27.635 4.393 1.737 6.2l.24.4-1.02 3.73 3.83-.996.38.22A11.74 11.74 0 0 0 16 27.8c6.518 0 11.8-5.282 11.8-11.8S22.518 4.2 16 4.2Zm6.88 16.54c-.29.82-1.7 1.56-2.32 1.6-.62.06-1.2.28-4.04-.84-3.38-1.36-5.54-4.8-5.7-5.02-.16-.22-1.32-1.76-1.32-3.36s1.04-2.38 1.42-2.7c.36-.32.78-.4 1.04-.4.26 0 .52 0 .74.01.24.01.56-.09.88.67.32.78 1.08 2.62 1.18 2.82.1.2.16.42.04.68-.12.26-.18.42-.36.64-.18.22-.38.5-.54.66-.18.18-.36.38-.16.74.2.36.9 1.48 1.94 2.4 1.34 1.18 2.46 1.56 2.82 1.72.36.16.58.14.8-.08.22-.22.92-1.06 1.16-1.42.24-.36.5-.3.84-.18.34.12 2.16 1.02 2.52 1.2.36.18.6.28.7.42.08.14.08.82-.22 1.64Z"
              fill="#25D366"
            />
          </svg>
        </a>
      </div>
      <div className={styles.spacer} aria-hidden="true" />
    </>
  );
}

export { StickyOfferBar };
