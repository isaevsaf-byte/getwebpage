"use client";

/**
 * FinalCall (#contact) — the bookend to the hero. The visitor's own name on
 * the offer, a hand-drawn oxblood stroke under the promise, two ways in, and
 * the brief form for anything that doesn't fit a package.
 *
 * Signature: the two heading lines rise out of masks (800ms studio-out, 60ms
 * stagger), then the stroke is drawn under "built in 7 days." — the same pen
 * that underlined the visitor's name in the hero.
 *
 * The masks are rendered by React instead of SplitText: the name line changes
 * after hydration (sessionStorage) and whenever it is retyped, and React must
 * keep owning those text nodes.
 *
 * SSR / no-JS render the final state. GSAP applies the from-states when the
 * ScrollTrigger is created. Reduced motion: 200ms fades, the stroke is simply
 * there.
 */

import { useRef, type MouseEvent } from "react";
import { gsap, useGSAP, motionMedia } from "@/lib/motion/gsap";
import Reveal from "@/components/motion/Reveal";
import { useScrollTo } from "@/components/motion/SmoothScroll";
import { useVisitor } from "@/lib/showcase/visitor";
import { SITE_FACTS } from "@/lib/showcase/content";
import EnquiryForm from "./final-call/EnquiryForm";
import styles from "./final-call/FinalCall.module.css";

export default function FinalCall() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const revealed = useRef(false);
  const scrollTo = useScrollTo();
  const visitor = useVisitor();

  const n = visitor.hasName ? visitor.graphemes : 0;
  const size = n > 28 ? styles.nameXLong : n > 18 ? styles.nameLong : "";

  useGSAP(
    () => {
      const title = titleRef.current;
      if (!title) return;

      const mm = motionMedia(({ ok, desktop, fine }) => {
        // Already revealed: a breakpoint change must not hide it again.
        if (revealed.current) return;
        const lines = gsap.utils.toArray<HTMLElement>("[data-line]", title);
        const swash = title.querySelector<SVGSVGElement>("[data-swash]");
        const scrollTrigger = { trigger: title, start: "top 85%", once: true };
        // Phones and touch screens: the stroke is drawn by the scroll itself,
        // left to right as the promise rises up the screen (and back).
        const penOnScroll = ok && !(desktop && fine);
        const onComplete = () => {
          revealed.current = true;
          gsap.set(lines, { clearProps: "transform,willChange" });
          if (swash && !penOnScroll) gsap.set(swash, { clearProps: "clipPath" });
        };

        if (ok) {
          const tl = gsap.timeline({
            scrollTrigger: {
              ...scrollTrigger,
              onEnter: () => gsap.set(lines, { willChange: "transform" }),
            },
            onComplete,
          });
          tl.from(lines, { yPercent: 118, duration: 0.8, stagger: 0.06, ease: "studio-out" }, 0);
          if (swash && penOnScroll) {
            gsap.fromTo(
              swash,
              { clipPath: "inset(-40% 100% -40% 0%)" },
              {
                clipPath: "inset(-40% 0% -40% 0%)",
                ease: "none",
                scrollTrigger: { trigger: swash, start: "top 80%", end: "top 50%", scrub: true },
              },
            );
          } else if (swash) {
            tl.fromTo(
              swash,
              { clipPath: "inset(-40% 100% -40% 0%)" },
              { clipPath: "inset(-40% 0% -40% 0%)", duration: 0.6, ease: "studio-in-out" },
              0.52,
            );
          }
        } else {
          // Reduced motion: no from-state. The heading is simply there.
          revealed.current = true;
        }
      });

      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  const onPlans = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    scrollTo("#pricing");
  };

  return (
    <section
      ref={sectionRef}
      id="contact"
      data-ground="paper"
      aria-labelledby="final-title"
      className={styles.section}
    >
      <div className={styles.inner}>
        <div className={styles.offer}>
          <h2 id="final-title" ref={titleRef} className={styles.title}>
            <span className={styles.mask}>
              <span className={`${styles.name} ${size}`} data-line="">
                {visitor.hasName ? visitor.name : "Your business"},
              </span>
            </span>{" "}
            <span className={styles.accentRow}>
              <span className={styles.accent}>
                <span className={styles.mask}>
                  <span className={styles.accentLine} data-line="">
                    built in 7 days.
                  </span>
                </span>
                <svg
                  className={styles.swash}
                  data-swash=""
                  viewBox="0 0 400 24"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M2.5 13C90 9.6 240 7.4 397.5 8.2c1.5-.1 1.9 2 .4 2.4C250 12.6 110 18.6 9 21.6c-4.4.3-8.2-1.4-7.9-4.6.1-1.9.5-3.7 1.4-4z" />
                </svg>
              </span>
            </span>
          </h2>

          <Reveal selector="[data-r]" y={16} stagger={0.06}>
            <p className={styles.lede} data-r="">
              Fixed price from <strong>£500</strong>. Half to start, the rest before{" "}
              <span className={styles.nowrap}>go-live.</span>{" "}
              <span className={styles.own}>You own everything.</span>
            </p>
            <div className={styles.actions}>
              <a href="#pricing" onClick={onPlans} className={styles.primary} data-r="">
                Choose a plan
              </a>
              <a
                href={SITE_FACTS.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.secondary}
                data-r=""
              >
                Message us on WhatsApp
                <svg className={styles.out} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <path d="M5 11L11 5M6 5h5v5" />
                </svg>
                <span className={styles.srOnly}> (opens in a new tab)</span>
              </a>
            </div>
          </Reveal>
        </div>

        <hr className={styles.rule} />

        <div className={styles.brief}>
          <Reveal className={styles.briefIntro}>
            <h3 className={styles.briefTitle}>Got a complex project?</h3>
            <p className={styles.briefLede}>
              For custom builds, e-commerce, or anything that doesn&apos;t fit a standard package — tell
              us about it and we&apos;ll put together a quote.
            </p>
          </Reveal>
          <Reveal className={styles.briefForm}>
            <EnquiryForm />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
