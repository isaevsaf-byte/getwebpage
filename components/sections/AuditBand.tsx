"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function AuditBand() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      style={{
        background: "#14181a",
        padding: "clamp(72px, 9vw, 104px) 40px",
        borderTop: "1px solid #242a2c",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: EASE }}
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 40,
        }}
      >
        <div style={{ maxWidth: 560 }}>
          <div
            style={{
              fontFamily: "var(--font-sans), sans-serif",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#cf8794",
              marginBottom: 18,
            }}
          >
            Free · No account needed
          </div>

          <h2
            style={{
              fontFamily: "var(--font-display), Georgia, serif",
              fontSize: "clamp(1.9rem, 4.2vw, 3rem)",
              fontWeight: 300,
              lineHeight: 1.14,
              letterSpacing: "-0.02em",
              color: "#e3e6e0",
              marginBottom: 16,
              textWrap: "balance",
            }}
          >
            Not sure your site is the problem?{" "}
            <em style={{ color: "#cf8794", fontStyle: "italic" }}>Find out in 30 seconds.</em>
          </h2>

          <p
            style={{
              fontFamily: "var(--font-sans), sans-serif",
              fontSize: 15,
              fontWeight: 300,
              lineHeight: 1.72,
              color: "#c0c6c2",
              maxWidth: 480,
            }}
          >
            Paste your URL and our AI reads your site the way Google and a first-time
            visitor do — then tells you exactly what is costing you enquiries.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Link
            href="/audit"
            style={{
              fontFamily: "var(--font-sans), sans-serif",
              fontSize: 15,
              fontWeight: 500,
              background: "#7d2436",
              color: "#fff",
              borderRadius: 4,
              padding: "14px 30px",
              textDecoration: "none",
              display: "inline-block",
              letterSpacing: "0.01em",
              transition: "background 200ms",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.background = "#93293e")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.background = "#7d2436")
            }
          >
            Audit my website →
          </Link>
          <span
            style={{
              fontFamily: "var(--font-sans), sans-serif",
              fontSize: 12,
              color: "#8a918d",
              textAlign: "center",
            }}
          >
            Takes about 30 seconds
          </span>
        </div>
      </motion.div>
    </section>
  );
}
