"use client";

/**
 * AuditBand (#audit) — for visitors who already have a site. One field, one
 * submit, and the real audit (Claude, via /api/audit) runs on /audit.
 *
 * - Submit validates with looksLikeUrl, then startAuditHandoff: sessionStorage,
 *   read once, 120s expiry, never a query string. The /api/audit call, its
 *   rate limits and SSRF guards stay in AuditTool, untouched.
 * - The input is the 'audit-field' shared morph: it flies into the /audit
 *   field. No spinner — the navigation is the feedback.
 * - Prefill: if the hero name field holds a web address, it lands here until
 *   the visitor edits this field.
 * - Signature: the reader pane (audit-band/ReaderPane), an X-ray of the HTML
 *   Claude is given, with the address bar echoing what is typed. No network
 *   until submit.
 * - The form never moves for style; only the copy reveals.
 */

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Reveal from "@/components/motion/Reveal";
import RevealHeading from "@/components/motion/RevealHeading";
import { SharedName } from "@/components/motion/PageTransition";
import { startAuditHandoff } from "@/lib/showcase/auditHandoff";
import { looksLikeUrl, useVisitor } from "@/lib/showcase/visitor";
import { track } from "@/lib/showcase/analytics";
import ReaderPane from "./audit-band/ReaderPane";
import s from "./audit-band/AuditBand.module.css";

const ERROR = "That doesn't look like a web address — try yourbusiness.co.uk";
const PLACEHOLDER_DOMAIN = "yourbusiness.co.uk";
/** Swallows a double press while the route change is in flight. */
const RESUBMIT_MS = 1500;

/** What the pane's address bar shows while the visitor is still typing. */
function addressBar(value: string, host: string | null): string {
  if (host) return host;
  const typed = value.trim().replace(/^https?:\/\//i, "").split(/[/?#\s]/, 1)[0];
  return typed ? typed.toLowerCase().slice(0, 60) : PLACEHOLDER_DOMAIN;
}

export default function AuditBand() {
  const router = useRouter();
  const visitor = useVisitor();
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSubmit = useRef(0);

  // null = untouched, so a URL typed into the hero still flows in.
  const [edited, setEdited] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const prefill = looksLikeUrl(visitor.raw) ? visitor.raw.trim() : "";
  const value = edited ?? prefill;
  const host = looksLikeUrl(value);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEdited(e.target.value);
    if (error) setError(false);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!looksLikeUrl(value)) {
      setError(true);
      inputRef.current?.focus();
      return;
    }
    const now = Date.now();
    if (now - lastSubmit.current < RESUBMIT_MS) return;
    lastSubmit.current = now;
    track("audit_handoff");
    startAuditHandoff(value.trim(), router);
  };

  return (
    <section id="audit" data-ground="surface" aria-labelledby="audit-title" className={s.section}>
      <div className={s.inner}>
        <div className={s.copy}>
          <Reveal y={12}>
            <p className={s.kicker}>Free · No account needed</p>
          </Reveal>
          <RevealHeading id="audit-title" className={s.title}>
            Not sure your site is the problem? <em className={s.em}>Find out in 30 seconds.</em>
          </RevealHeading>
          <Reveal>
            <p className={s.body}>
              Paste your URL and our AI reads your site the way Google and a first-time visitor do — then
              tells you exactly what is costing you enquiries.
            </p>
          </Reveal>

          <form className={s.form} onSubmit={onSubmit} noValidate>
            <label htmlFor="audit-band-url" className={s.srOnly}>
              Your website address
            </label>
            <div className={s.row}>
              <div className={s.field}>
                <SharedName name="audit-field">
                  <input
                    ref={inputRef}
                    id="audit-band-url"
                    className={s.input}
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="go"
                    placeholder="https://yourbusiness.co.uk"
                    value={value}
                    onChange={onChange}
                    aria-invalid={error || undefined}
                    aria-describedby="audit-band-note audit-band-error"
                  />
                </SharedName>
                <span className={s.underline} aria-hidden="true" />
              </div>
              <button type="submit" className={s.button}>
                Audit my website{" "}
                <span className={s.arrow} aria-hidden="true">
                  →
                </span>
              </button>
            </div>
            <p id="audit-band-note" className={s.note}>
              Takes about 30 seconds
            </p>
            <p id="audit-band-error" className={s.error} aria-live="polite">
              {error ? ERROR : ""}
            </p>
          </form>
        </div>

        <ReaderPane className={s.readerCol} domain={addressBar(value, host)} host={host} />
      </div>
    </section>
  );
}
