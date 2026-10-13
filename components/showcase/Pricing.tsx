"use client";

/**
 * Pricing (#pricing) — the decision. Fixed prices, Standard anchored, the
 * 50/50 deposit spelled out, and Stripe one click away.
 *
 * - handleCheckout is copied verbatim from components/sections/PricingSection.
 *   The buttons are plain <button type="button">s: no view-transition names,
 *   no wrappers, and prices never animate.
 * - Signature: each card's 7-cell day strip fills once as the cards enter.
 * - With a name, the visitor's own sketch heads the cards as a deck of pages
 *   that fans to the tier they point at (PersonalStrip).
 * - The H2 is the 'pricing-title' shared morph target, so it is never split
 *   or hidden.
 * - SSR / no-JS render the final state; from-states are applied by GSAP when
 *   the ScrollTrigger is created. Reduced motion: 200ms fades, strips filled.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { gsap, useGSAP, motionMedia, finishOnFocus } from "@/lib/motion/gsap";
import Reveal from "@/components/motion/Reveal";
import { SharedName } from "@/components/motion/PageTransition";
import { CUSTOM, PRICING_COPY, TIERS, type TierId } from "@/lib/showcase/content";
import { getVisitor, subscribeVisitor } from "@/lib/showcase/visitor";
import TierCard from "./pricing/TierCard";
import PersonalStrip from "./pricing/PersonalStrip";
import styles from "./pricing/Pricing.module.css";

type LoadingState = TierId | null;

const NAV_FORWARD = ["nav-forward"];
/** Mirrors the one-column grid in Pricing.module.css. */
const SINGLE_COLUMN = "(max-width: 959px)";
const RESTING_PREVIEW: TierId = "standard";

/**
 * Only whether there is a name — so typing in the hero re-renders the strip,
 * not the whole price table. False on the server and during hydration.
 */
const subscribeHasName = (onChange: () => void) => subscribeVisitor(() => onChange());
const hasNameNow = () => getVisitor().hasName;
const hasNameOnServer = () => false;

export default function Pricing({ headingLevel = "h2" }: { headingLevel?: "h1" | "h2" } = {}) {
  const Title = headingLevel;
  const rootRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLOListElement>(null);
  const revealed = useRef(false);
  /** Slots already settled in the one-column reveal (keyed by tier id). */
  const settled = useRef(new Set<string>());

  const [loading, setLoading] = useState<LoadingState>(null);
  const [checkoutError, setCheckoutError] = useState<TierId | null>(null);
  const [preview, setPreview] = useState<TierId>(RESTING_PREVIEW);

  const hasName = useSyncExternalStore(subscribeHasName, hasNameNow, hasNameOnServer);
  const previewTier = TIERS.find((t) => t.id === preview) ?? TIERS[1];

  const handleCheckout = async (tierId: TierId) => {
    setLoading(tierId);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tierId }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.url) {
        window.location.assign(json.url);
      } else {
        setCheckoutError(tierId);
        setLoading(null);
      }
    } catch {
      setCheckoutError(tierId);
      setLoading(null);
    }
  };

  // Coming back from Stripe with the browser's Back button restores this page
  // from the back/forward cache with the button still saying "Loading…".
  // UI state only — the checkout call itself is untouched.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setLoading(null);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const onPreview = useCallback((id: TierId) => setPreview(id), []);

  // Cards enter once; each day strip fills as its card lands.
  useGSAP(
    () => {
      const grid = gridRef.current;
      if (!grid) return;

      const mm = motionMedia(({ ok }) => {
        // Already revealed: a breakpoint change must not hide it again.
        if (revealed.current) return;
        const slots = gsap.utils.toArray<HTMLElement>("[data-slot]", grid);
        if (slots.length === 0) return;

        const fills = gsap.utils.toArray<HTMLElement>("[data-fill]", grid);
        const scrollTrigger = { trigger: grid, start: "top 85%", once: true };
        const onComplete = () => {
          revealed.current = true;
          // Hand the cards back to CSS: no inline transforms left behind.
          gsap.set(slots, { clearProps: "transform,opacity,visibility" });
          gsap.set(fills, { clearProps: "transform" });
        };

        // Reduced motion: no from-state; the cards and day strips are simply there.
        if (!ok) {
          revealed.current = true;
          return;
        }

        // One column (phones, small tablets): the cards are a screen apart, so
        // one grid-wide trigger would reveal the lower two off screen. Each card
        // settles on its own as it arrives — it swings up from a slight
        // backward tilt (hinged at its top edge) — then its day strip fills.
        if (window.matchMedia(SINGLE_COLUMN).matches) {
          const offs: (() => void)[] = [];
          slots.forEach((slot) => {
            if (settled.current.has(slot.dataset.slot ?? "")) return;
            const cells = slot.querySelectorAll<HTMLElement>("[data-fill]");
            const tl = gsap.timeline({
              scrollTrigger: {
                trigger: slot,
                start: "top 90%",
                once: true,
                onEnter: () => {
                  slot.style.willChange = "transform, opacity";
                },
              },
              onComplete: () => {
                settled.current.add(slot.dataset.slot ?? "");
                slot.style.willChange = "";
                gsap.set(slot, { clearProps: "transform,opacity" });
                gsap.set(cells, { clearProps: "transform" });
                if (settled.current.size >= slots.length) revealed.current = true;
              },
            });
            tl.from(
              slot,
              {
                opacity: 0,
                y: 64,
                rotationX: 14,
                transformPerspective: 1100,
                transformOrigin: "50% 0%",
                duration: 0.95,
                ease: "studio-out",
              },
              0,
            );
            if (cells.length) {
              tl.from(cells, { scaleX: 0, duration: 0.3, ease: "studio-out", stagger: 0.05 }, 0.42);
            }
            offs.push(finishOnFocus(slot, tl));
          });
          return () => offs.forEach((f) => f());
        }

        // Opacity only (never autoAlpha): the plan buttons stay tabbable and
        // in the accessibility tree before the cards land.
        const tl = gsap.timeline({ scrollTrigger, onComplete });
        tl.from(
          slots,
          { opacity: 0, y: 24, duration: 0.65, ease: "studio-out", stagger: 0.06 },
          0,
        );
        slots.forEach((slot, i) => {
          const cells = slot.querySelectorAll("[data-fill]");
          if (cells.length === 0) return;
          tl.from(
            cells,
            { scaleX: 0, duration: 0.3, ease: "studio-out", stagger: 0.04 },
            0.32 + i * 0.06,
          );
        });
        return finishOnFocus(grid, tl);
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      id="pricing"
      data-ground="paper"
      aria-labelledby="pricing-title"
      className={styles.section}
    >
      <div className={styles.inner}>
        <header className={styles.head} data-personal={hasName ? "" : undefined}>
          <div className={styles.headText}>
            <SharedName name="pricing-title">
              <Title id="pricing-title" className={styles.title}>
                {PRICING_COPY.title}
              </Title>
            </SharedName>
            <p className={styles.lede}>{PRICING_COPY.lede}</p>
          </div>
          {hasName ? <PersonalStrip tier={previewTier} /> : null}
        </header>

        <ol
          ref={gridRef}
          className={styles.grid}
          aria-label="Plans"
        >
          {TIERS.map((tier) => (
            <li key={tier.id} className={styles.slot} data-slot={tier.id}>
              <TierCard
                tier={tier}
                loading={loading === tier.id}
                error={checkoutError === tier.id}
                onCheckout={handleCheckout}
                onPreview={onPreview}
              />
            </li>
          ))}
        </ol>

        <Reveal className={styles.custom}>
          <div className={styles.customHead}>
            <h3 className={styles.tierName}>{CUSTOM.name}</h3>
            <p className={styles.customPrice}>{CUSTOM.price}</p>
          </div>
          <div className={styles.customBody}>
            <p className={styles.customDesc}>{CUSTOM.desc}</p>
            <div className={styles.customFeaturesClip}>
              <ul className={styles.customFeatures}>
                {CUSTOM.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
          <Link href={CUSTOM.href} transitionTypes={NAV_FORWARD} className={styles.customCta}>
            {CUSTOM.cta}
          </Link>
        </Reveal>

        <Reveal className={styles.help}>
          <p className={styles.helpText}>
            <strong>{PRICING_COPY.helpTitle}</strong> {PRICING_COPY.helpBody}
          </p>
          <div className={styles.helpLinks}>
            <Link href={PRICING_COPY.helpHref} transitionTypes={NAV_FORWARD} className={styles.helpCta}>
              {PRICING_COPY.helpCta}
            </Link>
            <Link href={PRICING_COPY.auditHref} transitionTypes={NAV_FORWARD} className={styles.auditLink}>
              {PRICING_COPY.auditLink}
            </Link>
          </div>
        </Reveal>

        <p className={styles.terms}>
          {PRICING_COPY.terms}
          <Link href={PRICING_COPY.termsHref} transitionTypes={NAV_FORWARD} className={styles.termsLink}>
            {PRICING_COPY.termsLink}
          </Link>
        </p>
      </div>
    </section>
  );
}
