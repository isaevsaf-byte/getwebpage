"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

export const projects = [
  {
    label: "B2B Consulting",
    title: "safarisaev.ai",
    sub: "AI strategy & consulting presence",
    href: "https://safarisaev.ai",
    bg: "#ede8e0",
    accent: "#a04020",
  },
  {
    label: "Lingerie & Atelier",
    title: "beautasy.co.uk",
    sub: "Luxury lingerie brand & bespoke atelier",
    href: "https://beautasy.co.uk",
    bg: "#e8e3d8",
    accent: "#c87850",
  },
  {
    label: "DJ & Artist",
    title: "bektothefuture.com",
    sub: "DJ artist portfolio & booking",
    href: "https://bektothefuture.com",
    bg: "#e4dfd6",
    accent: "#6b6358",
  },
  {
    label: "Honey Import",
    title: "silkbees.co.uk",
    sub: "Premium honey import from Central Asia",
    href: "https://silkbees.co.uk",
    bg: "#eae6de",
    accent: "#b08940",
  },
];

export default function WorkSection({ showAll = false }: { showAll?: boolean }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const displayProjects = showAll ? projects : projects.slice(0, 4);

  return (
    <section
      id="work"
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
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 56,
            flexWrap: "wrap",
            gap: 20,
          }}
        >
          <div>
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
              Selected work
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
              Built for real businesses.
            </h2>
          </div>
          {!showAll && (
            <Link
              href="/work"
              style={{
                fontFamily: "var(--font-dm-sans), sans-serif",
                fontSize: 13,
                fontWeight: 500,
                color: "#1a1612",
                textDecoration: "none",
                borderBottom: "1px solid #c8c0b6",
                paddingBottom: 2,
                transition: "border-color 200ms",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.borderBottomColor =
                  "#a04020")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.borderBottomColor =
                  "#c8c0b6")
              }
            >
              View all
            </Link>
          )}
        </motion.div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {displayProjects.map((p, i) => (
            <motion.a
              key={p.title}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.6,
                delay: i * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                background: "#fff",
                border: "1px solid #e8e3d8",
                borderRadius: 6,
                overflow: "hidden",
                cursor: "pointer",
                textDecoration: "none",
                display: "block",
                transition: "box-shadow 300ms, border-color 300ms",
                boxShadow: "0 1px 4px rgba(26,22,18,0.04)",
              }}
              whileHover={{
                boxShadow: "0 8px 32px rgba(26,22,18,0.09)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor =
                  "#c8c0b6";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor =
                  "#e8e3d8";
              }}
            >
              {/* 4:3 image placeholder */}
              <div
                style={{
                  position: "relative",
                  paddingTop: "75%",
                  background: p.bg,
                  overflow: "hidden",
                }}
              >
                <div style={{ position: "absolute", inset: 0, background: p.bg }} />
              </div>
              <div style={{ padding: "22px 26px 24px" }}>
                <div
                  style={{
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    fontSize: 10,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase" as const,
                    color: "#c87850",
                    marginBottom: 6,
                  }}
                >
                  {p.label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-cormorant), serif",
                    fontSize: "1.45rem",
                    fontWeight: 400,
                    color: "#1a1612",
                  }}
                >
                  {p.title}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    fontSize: 12,
                    color: "#6b6358",
                    marginTop: 4,
                  }}
                >
                  {p.sub}
                </div>
              </div>
            </motion.a>
          ))}

          {/* Coming soon card */}
          {showAll && (
            <div
              style={{
                background: "#fff",
                border: "1px solid #e8e3d8",
                borderRadius: 6,
                overflow: "hidden",
                opacity: 0.45,
              }}
            >
              <div
                style={{
                  position: "relative",
                  paddingTop: "75%",
                  background: "#eae6de",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-dm-mono), monospace",
                      fontSize: 8,
                      color: "#9a9188",
                      letterSpacing: "0.06em",
                    }}
                  >
                    coming soon
                  </span>
                </div>
              </div>
              <div style={{ padding: "22px 26px 24px" }}>
                <div
                  style={{
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    fontSize: 10,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase" as const,
                    color: "#9a9188",
                    marginBottom: 6,
                  }}
                >
                  —
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-cormorant), serif",
                    fontSize: "1.45rem",
                    fontWeight: 400,
                    color: "#9a9188",
                  }}
                >
                  Coming soon
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    fontSize: 12,
                    color: "#9a9188",
                    marginTop: 4,
                  }}
                >
                  Next project in progress
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
