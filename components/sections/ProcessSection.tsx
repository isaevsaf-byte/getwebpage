"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const steps = [
  {
    n: "01",
    title: "Brief",
    body: "Fill in our short form — your business, your goals, what you love. Takes 5 minutes.",
  },
  {
    n: "02",
    title: "Build",
    body: "We design and build your site over 5 days. You get a preview link on day 3.",
  },
  {
    n: "03",
    title: "Launch",
    body: "One round of revisions, then we push it live. Domain, hosting, everything sorted.",
  },
];

export default function ProcessSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="process"
      ref={ref}
      style={{
        background: "#f7f3ec",
        padding: "120px 40px",
        borderTop: "1px solid #e8e3d8",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: 64 }}
        >
          <div
            style={{
              fontFamily: "var(--font-dm-sans), sans-serif",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              color: "#c87850",
              marginBottom: 16,
            }}
          >
            How it works
          </div>
          <h2
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontSize: "clamp(2.2rem, 5vw, 3.8rem)",
              fontWeight: 300,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "#1a1612",
              maxWidth: 500,
            }}
          >
            Simple, fast, no surprises.
          </h2>
        </motion.div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 0,
          }}
        >
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.6,
                delay: i * 0.12,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                padding: "48px 40px",
                background: "transparent",
                borderTop: "1px solid #e8e3d8",
                borderBottom: "1px solid #e8e3d8",
                borderLeft: "1px solid #e8e3d8",
                borderRight: i === steps.length - 1 ? "1px solid #e8e3d8" : "none",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  fontSize: "3.5rem",
                  fontWeight: 300,
                  color: "#b8a898",
                  lineHeight: 1,
                  marginBottom: 28,
                }}
              >
                {s.n}
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  fontSize: "1.6rem",
                  fontWeight: 400,
                  color: "#1a1612",
                  marginBottom: 12,
                }}
              >
                {s.title}
              </h3>
              <p
                style={{
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  fontSize: 16,
                  lineHeight: 1.75,
                  color: "#6b6358",
                }}
              >
                {s.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
