"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";

const tiers = [
  {
    id: "starter",
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
    id: "standard",
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
    id: "identity",
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
    id: "custom",
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
] as const;

type TierId = (typeof tiers)[number]["id"];
type LoadingState = TierId | null;

export default function PricingSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [loading, setLoading] = useState<LoadingState>(null);
  const [checkoutError, setCheckoutError] = useState<TierId | null>(null);

  const handleCheckout = async (tierId: TierId) => {
    setLoading(tierId);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tierId }),
      });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        setCheckoutError(tierId);
        setLoading(null);
      }
    } catch {
      setCheckoutError(tierId);
      setLoading(null);
    }
  };

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

                {/* Error message */}
                {checkoutError === t.id && (
                  <div
                    style={{
                      fontFamily: "var(--font-dm-sans), sans-serif",
                      fontSize: 12,
                      color: "#a04020",
                      marginBottom: 10,
                      textAlign: "center",
                    }}
                  >
                    Something went wrong. Try again.
                  </div>
                )}

                {/* CTA — Custom goes to /contact, others to Stripe */}
                {t.id === "custom" ? (
                  <Link
                    href="/contact"
                    style={{
                      width: "100%",
                      padding: "11px 16px",
                      background: "transparent",
                      color: "#1a1612",
                      border: "1px solid #c8c0b6",
                      borderRadius: 4,
                      fontFamily: "var(--font-dm-sans), sans-serif",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      letterSpacing: "0.02em",
                      textDecoration: "none",
                      display: "block",
                      textAlign: "center",
                      transition: "border-color 200ms",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = "#9a9188";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = "#c8c0b6";
                    }}
                  >
                    Get in touch
                  </Link>
                ) : (
                  <button
                    onClick={() => handleCheckout(t.id as Exclude<TierId, "custom">)}
                    disabled={loading === t.id}
                    style={{
                      width: "100%",
                      padding: "11px 16px",
                      background:
                        loading === t.id
                          ? t.popular
                            ? "#c8a090"
                            : "#e8e3d8"
                          : t.popular
                          ? "#a04020"
                          : "transparent",
                      color: t.popular ? "#ffffff" : "#1a1612",
                      border: `1px solid ${t.popular ? (loading === t.id ? "#c8a090" : "#a04020") : "#c8c0b6"}`,
                      borderRadius: 4,
                      fontFamily: "var(--font-dm-sans), sans-serif",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: loading === t.id ? "not-allowed" : "pointer",
                      letterSpacing: "0.02em",
                      transition: "all 200ms",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                    onMouseEnter={(e) => {
                      if (loading !== t.id) {
                        if (t.popular) {
                          (e.currentTarget as HTMLButtonElement).style.background = "#b84a28";
                        } else {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "#9a9188";
                        }
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (loading !== t.id) {
                        if (t.popular) {
                          (e.currentTarget as HTMLButtonElement).style.background = "#a04020";
                        } else {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "#c8c0b6";
                        }
                      }
                    }}
                  >
                    {loading === t.id ? (
                      <>
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          style={{
                            animation: "spin 0.8s linear infinite",
                            flexShrink: 0,
                          }}
                        >
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                        Loading…
                      </>
                    ) : (
                      "Get started"
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
}
