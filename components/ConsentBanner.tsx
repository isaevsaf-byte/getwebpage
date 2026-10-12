"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Script from "next/script";

const STORAGE_KEY = "gwp-consent";

export type Consent = "granted" | "denied";

/** Reads the stored choice. Returns null when the visitor has not chosen yet. */
export function readConsent(): Consent | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

/** Reads storage once and caches, so getSnapshot stays referentially stable. */
let cached: Consent | null | undefined;
function snapshot(): Consent | null {
  if (cached === undefined) cached = readConsent();
  return cached;
}
const subscribe = () => () => {};
/** On the server there is no storage — render nothing until hydrated. */
const serverSnapshot = () => undefined;

export default function ConsentBanner() {
  const pathname = usePathname();
  const stored = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [choice, setChoice] = useState<Consent | null>(null);

  // undefined = not hydrated yet, so nothing flashes on first paint
  const consent = stored === undefined ? undefined : choice ?? stored;

  function choose(value: Consent) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Private mode — honour the choice for this page view only.
    }
    cached = value;
    setChoice(value);
    window.dispatchEvent(new CustomEvent("gwp-consent", { detail: value }));
  }

  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      {/* Measurement tags load only once the visitor has accepted. */}
      {consent === "granted" && (
        <>
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-QDFPJCSKEY"
            strategy="afterInteractive"
          />
          <Script id="google-tags" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-QDFPJCSKEY');
              gtag('config', 'AW-18152477897');
            `}
          </Script>
        </>
      )}

      {consent === null && (
        <div className="consent" role="dialog" aria-label="Cookie choices">
          <div className="consent-inner">
            <p className="consent-text">
              We&apos;d like to set analytics and advertising cookies to see how
              people find us. They are off until you say yes — the site works
              either way.{" "}
              <Link href="/privacy" className="consent-link">
                Privacy policy
              </Link>
            </p>
            <div className="consent-actions">
              <button
                type="button"
                onClick={() => choose("denied")}
                className="consent-btn consent-btn-ghost"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => choose("granted")}
                className="consent-btn consent-btn-solid"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
