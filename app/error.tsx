"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled page error:", error);
  }, [error]);

  return (
    <main
      id="main"
      style={{
        background: "#eaece7",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 40px",
      }}
    >
      <div style={{ maxWidth: 520 }}>
        <div
          style={{
            fontFamily: "var(--font-sans), sans-serif",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#8f3446",
            marginBottom: 18,
          }}
        >
          Something broke
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display), Georgia, serif",
            fontSize: "clamp(2.2rem, 5.4vw, 3.4rem)",
            fontWeight: 300,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: "#14181a",
            marginBottom: 16,
          }}
        >
          That didn&apos;t load.
        </h1>
        <p
          style={{
            fontFamily: "var(--font-sans), sans-serif",
            fontSize: 15,
            fontWeight: 300,
            color: "#5a6360",
            lineHeight: 1.72,
            marginBottom: 32,
            maxWidth: 440,
          }}
        >
          Our end, not yours. Try again — and if it keeps happening, email{" "}
          <a href="mailto:saf@safarisaev.ai" style={{ color: "#7d2436" }}>
            saf@safarisaev.ai
          </a>{" "}
          and we&apos;ll sort it.
        </p>
        <button
          onClick={reset}
          style={{
            fontFamily: "var(--font-sans), sans-serif",
            fontSize: 14,
            fontWeight: 500,
            background: "#7d2436",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            padding: "13px 28px",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </div>
    </main>
  );
}
