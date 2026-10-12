"use client";

/**
 * One price card. Prices, features and the Stripe button never move for
 * style. The only motion here is:
 *  - the 7-cell day strip filling once when the cards enter (driven by
 *    Pricing's timeline through [data-fill]);
 *  - the cursor spotlight ring (fine pointers only, rAF-throttled CSS vars);
 *  - the button's :active press and hover colour (CSS).
 */

import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { Tier, TierId } from "@/lib/showcase/content";
import { PRICING_COPY } from "@/lib/showcase/content";
import styles from "./Pricing.module.css";

const DAYS_IN_STRIP = 7;

type Props = {
  tier: Tier;
  loading: boolean;
  error: boolean;
  onCheckout: (id: TierId) => void;
  onPreview: (id: TierId) => void;
};

function Check() {
  return (
    <svg className={styles.check} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M3.2 8.4l3 3 6.6-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className={styles.spinner} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.8" />
      <path d="M14 8a6 6 0 0 0-6-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function TierCard({ tier, loading, error, onCheckout, onPreview }: Props) {
  const cardRef = useRef<HTMLElement>(null);
  const point = useRef({ x: 0, y: 0 });
  const raf = useRef(0);

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    },
    [],
  );

  // Spotlight: remember the latest pointer, write the vars at most once a frame.
  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    point.current.x = e.clientX;
    point.current.y = e.clientY;
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const el = cardRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${(point.current.x - r.left).toFixed(1)}px`);
      el.style.setProperty("--my", `${(point.current.y - r.top).toFixed(1)}px`);
    });
  }, []);

  const onPointerEnter = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse") onPreview(tier.id);
    },
    [onPreview, tier.id],
  );

  const [today, ...rest] = tier.depositLine.split(" · ");
  const nameId = `tier-${tier.id}-name`;
  const errId = `tier-${tier.id}-error`;

  return (
    <article
      ref={cardRef}
      className={styles.card}
      data-tier={tier.id}
      data-recommended={tier.recommended ? "" : undefined}
      aria-labelledby={nameId}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onFocus={() => onPreview(tier.id)}
    >
      <div className={styles.cardHead}>
        <h3 id={nameId} className={styles.tierName}>
          {tier.name}
        </h3>
        {tier.badge ? <span className={styles.badge}>{tier.badge}</span> : null}
      </div>

      <p className={styles.price}>{tier.price}</p>

      <div className={styles.timeRow}>
        <span className={styles.time}>{tier.time}</span>
        <span className={styles.days} aria-hidden="true">
          {Array.from({ length: DAYS_IN_STRIP }, (_, i) => (
            <i key={i} className={styles.cell}>
              {i < tier.days ? <b className={styles.fill} data-fill="" /> : null}
            </i>
          ))}
        </span>
      </div>

      <p className={styles.deposit}>
        <span className={styles.depositToday}>{today}</span>
        {rest.length ? (
          <>
            {" · "}
            <span className={styles.depositRest}>{rest.join(" · ")}</span>
          </>
        ) : null}
      </p>

      <p className={styles.desc}>{tier.desc}</p>

      <ul className={styles.features}>
        {tier.features.map((f) => (
          <li key={f} className={styles.feature}>
            <Check />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className={styles.foot}>
        <button
          type="button"
          className={styles.cta}
          data-primary={tier.recommended ? "" : undefined}
          onClick={() => onCheckout(tier.id)}
          disabled={loading}
          aria-busy={loading || undefined}
          aria-describedby={error ? errId : undefined}
        >
          {loading ? (
            <>
              <Spinner />
              {PRICING_COPY.loading}
            </>
          ) : (
            <>
              {PRICING_COPY.cta}
              <span className={styles.srOnly}>
                {" "}
                — {tier.name}, {tier.price}
              </span>
            </>
          )}
        </button>
        {error ? (
          <p id={errId} className={styles.error} role="alert">
            {PRICING_COPY.error}
          </p>
        ) : null}
      </div>
    </article>
  );
}
