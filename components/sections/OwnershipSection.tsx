"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const pillars = [
  {
    title: "No monthly fees",
    body: "We don't hold your site hostage. Pay once, own it outright.",
  },
  {
    title: "No lock-in",
    body: "Switch developers anytime. Everything is yours, always.",
  },
  {
    title: "Full ownership",
    body: "Domain, code, content. 100% transferred on delivery.",
  },
];

export default function OwnershipSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      style={{
        background: "#1a1612",
        padding: "120px 40px",
        borderTop: "1px solid #2e2820",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: "var(--font-cormorant), serif",
            fontSize: "clamp(2rem, 3.5vw, 3rem)",
            fontWeight: 300,
            lineHeight: 1.1,
            color: "#f0ece4",
            marginBottom: 56,
            letterSpacing: "-0.01em",
          }}
        >
          Your site.{" "}
          <em style={{ fontStyle: "italic", color: "#c87850" }}>Your rules.</em>
        </motion.h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 0,
          }}
        >
          {pillars.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.6,
                delay: i * 0.12,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                paddingRight: 48,
                paddingLeft: i > 0 ? 48 : 0,
                borderRight:
                  i < pillars.length - 1
                    ? "1px solid oklch(0.26 0.010 62)"
                    : "none",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase" as const,
                  color: "oklch(0.60 0.010 68)",
                  marginBottom: 12,
                }}
              >
                {p.title}
              </div>
              <p
                style={{
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  fontSize: 16,
                  lineHeight: 1.6,
                  color: "oklch(0.82 0.010 72)",
                }}
              >
                {p.body}
              </p>
            </motion.div>
          ))}
        </div>

        {/* AI copy block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            marginTop: 80,
            paddingTop: 64,
            borderTop: "1px solid oklch(0.26 0.010 62)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "clamp(32px, 6vw, 80px)",
            alignItems: "start",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
              fontWeight: 300,
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
              color: "#f0ece4",
              margin: 0,
            }}
          >
            Your site.{" "}
            <em style={{ fontStyle: "italic", color: "#c87850" }}>
              Your words.
            </em>
          </h3>
          <div>
            <p
              style={{
                fontFamily: "var(--font-dm-sans), sans-serif",
                fontSize: 16,
                lineHeight: 1.72,
                color: "oklch(0.82 0.010 72)",
                marginBottom: 20,
              }}
            >
              Every GetWebPage site comes with AI-written copy included —
              crafted from your brief, in your voice.
            </p>
            <p
              style={{
                fontFamily: "var(--font-dm-sans), sans-serif",
                fontSize: 16,
                lineHeight: 1.72,
                color: "oklch(0.65 0.010 68)",
              }}
            >
              And when you want to change something? Edit it yourself. No
              developer needed. No invoice for a paragraph.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
