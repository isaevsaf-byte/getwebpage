"use client";

import { useRef } from "react";
import Reveal from "@/components/motion/Reveal";
import { gsap, useGSAP, motionMedia } from "@/lib/motion/gsap";
import FlipCard from "./ownership/FlipCard";
import s from "./ownership/Ownership.module.css";

const PROMISES = [
  { title: "Full ownership", body: "Domain, code, content. 100% transferred on delivery." },
  { title: "No lock-in", body: "Switch developers anytime. Everything is yours, always." },
  { title: "No retainer", body: "We don't hold your site hostage. Pay once, own it outright." },
] as const;

/**
 * Ownership — right after the price, the "held hostage" fear goes. The
 * visitor's own sketch turns over to show its code: ownership made visible.
 * Signature: the scrubbed flip (FlipCard). 'Your rules.' gains weight on a
 * CSS view() timeline (.sd-ink-weight). Promises use the quiet Reveal; their
 * rules draw in alongside.
 */
export default function Ownership() {
  const listRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const list = listRef.current;
      if (!list) return;
      const mm = motionMedia(({ ok }) => {
        if (!ok) return;
        gsap.from(list.querySelectorAll("[data-rule]"), {
          scaleX: 0,
          duration: 0.9,
          ease: "studio-out",
          stagger: 0.06,
          scrollTrigger: { trigger: list, start: "top 85%", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: listRef },
  );

  return (
    <section id="ownership" data-ground="ink" aria-labelledby="own-title" className={s.section}>
      <div className={s.inner}>
        <h2 id="own-title" className={s.h2}>
          Your site. <span className={`sd-ink-weight ${s.rules}`}>Your rules.</span>
        </h2>

        <FlipCard />

        <div ref={listRef} className={s.listWrap}>
          <Reveal as="ul" selector="[data-promise]" y={20} stagger={0.06} className={s.list}>
            {PROMISES.map((p) => (
              <li key={p.title} className={s.promise} data-promise="">
                <span className={s.rule} data-rule="" aria-hidden="true" />
                <h3 className={s.h3}>{p.title}</h3>
                <p className={s.body}>{p.body}</p>
              </li>
            ))}
          </Reveal>
          <span className={`${s.rule} ${s.ruleEnd}`} data-rule="" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
