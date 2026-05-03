"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const tiers = [
  {
    name: "Starter",
    price: "£500",
    time: "5 days",
    desc: "One-page site. Perfect for getting online fast.",
    features: [
      "Single page",
      "Mobile responsive",
      "Contact form",
      "Google Analytics",
      "Domain & hosting setup",
    ],
    popular: false,
  },
  {
    name: "Standard",
    price: "£800",
    time: "7 days",
    desc: "Up to 5 pages. For businesses that need more room.",
    features: [
      "Up to 5 pages",
      "Gallery or portfolio",
      "Blog ready",
      "SEO foundations",
      "Domain & hosting setup",
      "1 revision round",
    ],
    popular: true,
  },
  {
    name: "Identity",
    price: "£1,200",
    time: "7 days",
    desc: "Full brand + site — design, copy, photography direction.",
    features: [
      "Up to 10 pages",
      "Brand identity",
      "Custom copywriting",
      "Photography brief",
      "Booking integration",
      "2 revision rounds",
    ],
    popular: false,
  },
  {
    name: "Custom",
    price: "£1,500+",
    time: "TBC",
    desc: "Complex builds, e-commerce, bespoke integrations.",
    features: [
      "Bespoke scope",
      "E-commerce ready",
      "Custom integrations",
      "Ongoing support",
      "Dedicated project lead",
    ],
    popular: false,
  },
];

export default function PricingSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="pricing"
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
              marginBottom: 14,
            }}
          >
            Pricing
          </div>
          <h2
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontSize: "clamp(2rem, 4.5vw, 3.2rem)",
              fontWeight: 300,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "#1a1612",
            }}
          >
            From £500. No surprises.
          </h2>
        </motion.div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {tiers.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.6,
                delay: i * 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                background: "#f0ece4",
                border: `1px solid ${t.popular ? "#a04020" : "#ddd8ce"}`,
                borderRadius: 4,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Terracotta top line — only on popular */}
              <div
                style={{
                  height: 3,
                  background: t.popular ? "#a04020" : "transparent",
                }}
              />

              <div
                style={{
                  padding: "32px 28px",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Name + most popular marker */}
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-dm-sans), sans-serif",
                      fontSize: 11,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase" as const,
                      color: "#9a9188",
                      marginBottom: t.popular ? 4 : 0,
                    }}
                  >
                    {t.name}
                  </div>
                  {t.popular && (
                    <div
                      style={{
                        fontFamily: "var(--font-cormorant), Georgia, serif",
                        fontSize: 13,
                        fontStyle: "italic",
                        color: "#a04020",
                        letterSpacing: "0.02em",
                      }}
                    >
                      Most popular
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-cormorant), serif",
                      fontSize: "2.4rem",
                      fontWeight: 400,
                      color: "#1a1612",
                      lineHeight: 1,
                    }}
                  >
                    {t.price}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-dm-sans), sans-serif",
                      fontSize: 11,
                      color: "#9a9188",
                    }}
                  >
                    {t.time}
                  </span>
                </div>

                <p
                  style={{
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    fontSize: 13,
                    color: "#6b6358",
                    lineHeight: 1.65,
                    marginBottom: 24,
                  }}
                >
                  {t.desc}
                </p>

                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    marginBottom: 28,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 9,
                  }}
                >
                  {t.features.map((f) => (
                    <li
                      key={f}
                      style={{ display: "flex", gap: 9, alignItems: "flex-start" }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#9a9188"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        style={{ flexShrink: 0, marginTop: 2 }}
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span
                        style={{
                          fontFamily: "var(--font-dm-sans), sans-serif",
                          fontSize: 13,
                          color: "#6b6358",
                          lineHeight: 1.5,
                        }}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/contact"
                  style={{
                    width: "100%",
                    padding: "11px 16px",
                    background: t.popular ? "#a04020" : "transparent",
                    color: t.popular ? "#ffffff" : "#1a1612",
                    border: `1px solid ${t.popular ? "#a04020" : "#c8c0b6"}`,
                    borderRadius: 4,
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    letterSpacing: "0.02em",
                    transition: "all 200ms",
                    textDecoration: "none",
                    display: "block",
                    textAlign: "center",
                  }}
                  onMouseEnter={(e) => {
                    if (t.popular) {
                      (e.currentTarget as HTMLAnchorElement).style.background =
                        "#b84a28";
                    } else {
                      (e.currentTarget as HTMLAnchorElement).style.borderColor =
                        "#9a9188";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (t.popular) {
                      (e.currentTarget as HTMLAnchorElement).style.background =
                        "#a04020";
                    } else {
                      (e.currentTarget as HTMLAnchorElement).style.borderColor =
                        "#c8c0b6";
                    }
                  }}
                >
                  Get started
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
