"use client";

import { useEffect, useRef } from "react";
import { readConsent } from "./ConsentBanner";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

interface Props {
  /** Stripe session id — doubles as the deduplication key for Google Ads. */
  transactionId: string;
  /** Deposit actually paid, in pounds. */
  value: number;
  currency?: string;
}

/**
 * Reports one purchase to Google Ads. Fires at most once per mount, only for a
 * verified Stripe session, and only when the visitor accepted measurement.
 */
export default function ConversionEvent({
  transactionId,
  value,
  currency = "GBP",
}: Props) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    if (readConsent() !== "granted") return;

    // gtag is injected by ConsentBanner after acceptance — it may not be ready
    // on the first tick, so poll briefly rather than dropping the conversion.
    let tries = 0;
    const timer = setInterval(() => {
      if (typeof window.gtag === "function") {
        clearInterval(timer);
        sent.current = true;
        window.gtag("event", "conversion", {
          send_to: "AW-18152477897/AdUTCNCJjKscEMmp489D",
          transaction_id: transactionId,
          value,
          currency,
        });
      } else if (++tries > 40) {
        clearInterval(timer);
      }
    }, 250);

    return () => clearInterval(timer);
  }, [transactionId, value, currency]);

  return null;
}
