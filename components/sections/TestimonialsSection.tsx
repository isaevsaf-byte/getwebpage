"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const quotes = [
  {
    quote:
      "Genuinely couldn't believe how fast it was. The site looks better than anything I've seen from agencies charging triple.",
    name: "Beautasy studio owner",
    role: "Southampton, UK",
  },
  {
    quote:
      "We had zero online presence. Now we get bookings every day through the site. It paid for itself in the first week.",
    name: "DJ & music artist",
    role: "",
  },
];

export default function TestimonialsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      style={{
        background: "#efeae0",
        padding: "120px 40px",
        borderTop: "1px solid #e0dbd0",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: 64, textAlign: "center" }}
        >
          <div
            style={{
              fontFamily: "var(--font-dm-sans), sans-serif",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              color: "#9a9188",
              marginBottom: 14,
            }}
          >
            What clients say
          </div>
          <h2
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 300,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "#1a1612",
            }}
          >
            The site is the salesperson.
          </h2>
        </motion.div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {quotes.map((q, i) => (
            <motion.div
              key={q.name}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.6,
                delay: i * 0.12,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                background: "#ffffff",
                border: "1px solid #e0dbd0",
                borderRadius: 6,
                padding: "36px 32px",
                boxShadow: "0 1px 8px rgba(26,22,18,0.05)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  fontSize: "1.2rem",
                  fontWeight: 400,
                  fontStyle: "italic",
                  color: "#2a2420",
                  lineHeight: 1.7,
                  marginBottom: 28,
                }}
              >
                &ldquo;{q.quote}&rdquo;
              </div>
              <div
                style={{
                  borderTop: "1px solid #ece8e0",
                  paddingTop: 18,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#1a1612",
                  }}
                >
                  {q.name}
                </div>
                {q.role && (
                  <div
                    style={{
                      fontFamily: "var(--font-dm-sans), sans-serif",
                      fontSize: 12,
                      color: "#6b6358",
                      marginTop: 2,
                    }}
                  >
                    {q.role}
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {/* CTA card */}
          <motion.a
            href="/pricing"
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: "#1a1612",
              border: "1px solid #2e2820",
              borderRadius: 6,
              padding: "36px 32px",
              textDecoration: "none",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              cursor: "pointer",
              transition: "background 200ms",
            }}
            whileHover={{ background: "#241e18" } as never}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  fontSize: "1.55rem",
                  fontWeight: 300,
                  fontStyle: "italic",
                  color: "#f0ece4",
                  lineHeight: 1.4,
                  marginBottom: 28,
                }}
              >
                Want to see your business here?
                <br />
                We&apos;re taking new clients now.
              </div>
            </div>
            <div
              style={{
                borderTop: "1px solid #2e2820",
                paddingTop: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#c87850",
                  letterSpacing: "0.02em",
                }}
              >
                See pricing →
              </span>
            </div>
          </motion.a>
        </div>
      </div>
    </section>
  );
}
