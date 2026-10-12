"use client";

/**
 * The brief form for custom projects. handleSubmit is copied verbatim from
 * components/sections/ContactSection (POST /api/contact with name, email,
 * businessType, brief and the `company` honeypot; the rate limit lives in the
 * route and is untouched).
 *
 * Prefill: only "Type of business", from the sector the visitor picked for
 * their sketch, and only while they have not typed their own answer. The
 * business name is never prefilled: it stays on the device unless the
 * visitor types it into this form themselves.
 *
 * Fields never move for style. On success the form is hidden with [hidden]
 * and the confirmation enters with the global .enter-up (CSS only).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useScrollTo } from "@/components/motion/SmoothScroll";
import { useVisitor } from "@/lib/showcase/visitor";
import { SECTORS as SKETCH_SECTORS } from "@/lib/showcase/sketch";
import styles from "./FinalCall.module.css";

type Status = "idle" | "loading" | "success" | "error";

export default function EnquiryForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const typeRef = useRef<HTMLInputElement>(null);
  const prefill = useRef("");
  const successRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // The confirmation takes the form's footprint, so nothing below it jumps.
  const [footprint, setFootprint] = useState(0);

  // A sector counts as chosen once it was changed from the default or the
  // sketch was committed with it.
  const visitor = useVisitor();
  const chosen = visitor.hasName && (visitor.committed || visitor.sector !== "salon");
  const sectorLabel = chosen ? SKETCH_SECTORS[visitor.sector].label : "";

  useEffect(() => {
    const el = typeRef.current;
    if (!el) return;
    if (el.value === "" || el.value === prefill.current) {
      el.value = sectorLabel;
      prefill.current = sectorLabel;
    }
  }, [sectorLabel]);

  // Measured while the form is still showing ("Sending…").
  useEffect(() => {
    if (status === "loading" && formRef.current) setFootprint(formRef.current.offsetHeight);
  }, [status]);

  // Screen readers land on the confirmation. The page only scrolls when the
  // message would sit off screen (a short phone scrolled down to the button).
  const scrollTo = useScrollTo();
  useEffect(() => {
    if (status !== "success") return;
    const el = successRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const mid = r.top + r.height / 2;
    if (mid < 96 || mid > window.innerHeight - 48) scrollTo(el);
    else el.focus({ preventScroll: true });
  }, [status, scrollTo]);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      businessType: (form.elements.namedItem("businessType") as HTMLInputElement).value,
      brief: (form.elements.namedItem("brief") as HTMLTextAreaElement).value,
      company: (form.elements.namedItem("company") as HTMLInputElement).value,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        const json = await res.json().catch(() => ({}));
        setErrorMsg(json.error || "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  }, []);

  const loading = status === "loading";

  return (
    <>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={styles.form}
        hidden={status === "success"}
        aria-busy={loading || undefined}
      >
        <div className={styles.field}>
          <label className={styles.label} htmlFor="fc-name">
            Your name
          </label>
          <input
            id="fc-name"
            name="name"
            type="text"
            placeholder="Jane Smith"
            autoComplete="name"
            required
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="fc-email">
            Email address
          </label>
          <input
            id="fc-email"
            name="email"
            type="email"
            placeholder="jane@yourbusiness.co.uk"
            autoComplete="email"
            spellCheck={false}
            required
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="fc-type">
            Type of business
          </label>
          <input
            ref={typeRef}
            id="fc-type"
            name="businessType"
            type="text"
            placeholder="e.g. beauty salon, café, joinery"
            required
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="fc-brief">
            Your brief
          </label>
          <textarea
            id="fc-brief"
            name="brief"
            rows={4}
            placeholder="Tell us what you need..."
            required
            className={`${styles.input} ${styles.textarea}`}
          />
        </div>

        {/* Honeypot — hidden from people, irresistible to bots */}
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: "absolute", left: -9999, width: 1, height: 1 }}
        />

        {status === "error" && (
          <p className={styles.error} role="alert">
            {errorMsg}
          </p>
        )}

        <div className={styles.submitRow}>
          <button type="submit" disabled={loading} className={styles.submit}>
            {loading ? "Sending…" : "Send brief"}
          </button>
        </div>
      </form>

      {status === "success" && (
        <div
          ref={successRef}
          className={`enter-up ${styles.success}`}
          role="status"
          tabIndex={-1}
          style={footprint ? { minHeight: footprint } : undefined}
        >
          <svg className={styles.check} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
            <circle cx="20" cy="20" r="18.5" pathLength={1} />
            <path d="M12.5 20.5l5.2 5.2L28 14.6" pathLength={1} />
          </svg>
          <p className={styles.successTitle}>We&apos;ve got your brief.</p>
          <p className={styles.successBody}>Expect a reply within 24 hours.</p>
        </div>
      )}
    </>
  );
}
