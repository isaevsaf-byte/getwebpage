"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay, ease: EASE },
  }),
};

export default function Hero() {
  return (
    <section
      style={{
        minHeight: "100vh",
        background: "#f7f3ec",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "120px 40px 80px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Paper grain */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.03,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "200px",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
          position: "relative",
        }}
      >
        {/* Eyebrow */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={0}
          variants={fadeUp}
          style={{
            fontFamily: "var(--font-dm-sans), sans-serif",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            color: "#c87850",
            marginBottom: 28,
          }}
        >
          UK web studio — from £500
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial="hidden"
          animate="visible"
          custom={0.1}
          variants={fadeUp}
          style={{
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontSize: "clamp(3.4rem, 8vw, 7.5rem)",
            fontWeight: 300,
            lineHeight: 0.97,
            letterSpacing: "-0.025em",
            color: "#1a1612",
            margin: 0,
          }}
        >
          A serious website.
        </motion.h1>
        <motion.h1
          initial="hidden"
          animate="visible"
          custom={0.18}
          variants={fadeUp}
          style={{
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontSize: "clamp(3.4rem, 8vw, 7.5rem)",
            fontWeight: 300,
            lineHeight: 0.97,
            letterSpacing: "-0.025em",
            color: "#1a1612",
            marginBottom: 44,
            marginTop: 8,
          }}
        >
          Built in{" "}
          <span style={{ color: "#a04020" }}>7 days.</span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial="hidden"
          animate="visible"
          custom={0.28}
          variants={fadeUp}
          style={{
            fontFamily: "var(--font-dm-sans), sans-serif",
            fontSize: "clamp(1rem, 1.8vw, 1.125rem)",
            lineHeight: 1.72,
            fontWeight: 300,
            color: "#6b6358",
            maxWidth: 460,
            marginBottom: 48,
          }}
        >
          For salons, studios, hospitality and trades. We handle everything —
          design, copy, build, launch. You just approve it.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={0.38}
          variants={fadeUp}
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/pricing"
            style={{
              fontFamily: "var(--font-dm-sans), sans-serif",
              fontSize: 15,
              fontWeight: 500,
              background: "#a04020",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "13px 28px",
              cursor: "pointer",
              letterSpacing: "0.01em",
              textDecoration: "none",
              display: "inline-block",
              transition: "all 220ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                "#b84a28";
              (e.currentTarget as HTMLAnchorElement).style.transform =
                "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                "#a04020";
              (e.currentTarget as HTMLAnchorElement).style.transform = "none";
            }}
          >
            See pricing
          </Link>
          <Link
            href="/work"
            style={{
              fontFamily: "var(--font-dm-sans), sans-serif",
              fontSize: 14,
              fontWeight: 500,
              color: "#1a1612",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "color 200ms",
              borderBottom: "1px solid #c8c0b6",
              paddingBottom: "1px",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = "#a04020";
              (e.currentTarget as HTMLAnchorElement).style.borderBottomColor =
                "#a04020";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = "#1a1612";
              (e.currentTarget as HTMLAnchorElement).style.borderBottomColor =
                "#c8c0b6";
            }}
          >
            See our work
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={0.48}
          variants={fadeUp}
          style={{
            display: "flex",
            gap: "clamp(24px, 5vw, 56px)",
            marginTop: 80,
            borderTop: "1px solid #e8e3d8",
            paddingTop: 36,
            flexWrap: "wrap",
          }}
        >
          {[
            ["7 days", "average delivery"],
            ["£500", "starting from"],
            ["Full ownership", "yours to keep"],
          ].map(([val, label]) => (
            <div key={val}>
              <div
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  fontSize: "2.1rem",
                  fontWeight: 400,
                  color: "#1a1612",
                  lineHeight: 1,
                }}
              >
                {val}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase" as const,
                  color: "#9a9188",
                  marginTop: 6,
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
