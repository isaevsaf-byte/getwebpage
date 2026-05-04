"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export const projects = [
  {
    label: "Lingerie & Atelier",
    title: "beautasy.co.uk",
    sub: "Luxury lingerie brand & bespoke atelier",
    href: "https://beautasy.co.uk",
    img: "/portfolio/beautasy.jpg",
    imgPosition: "center",
  },
  {
    label: "DJ & Artist",
    title: "bektothefuture.com",
    sub: "DJ artist portfolio & booking",
    href: "https://bektothefuture.com",
    img: "/portfolio/bektothefuture.jpg",
    imgPosition: "top",
  },
  {
    label: "Honey Import",
    title: "silkbees.co.uk",
    sub: "Premium honey import from Central Asia",
    href: "https://silkbees.co.uk",
    img: "/portfolio/silkbees.jpg",
    imgPosition: "top",
  },
  {
    label: "AI & Consulting",
    title: "safarisaev.ai",
    sub: "AI strategy & consulting presence",
    href: "https://safarisaev.ai",
    img: "/portfolio/safarisaev.jpg",
    imgPosition: "center",
  },
];

const vedovec = {
  label: "Customs Brokerage",
  title: "vedovec.vercel.app",
  sub: "B2B logistics & customs brokerage platform",
  href: "https://vedovec.vercel.app",
  img: "/portfolio/vedovec.jpg",
  imgPosition: "top",
};

export default function WorkSection({ showAll = false }: { showAll?: boolean }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const displayProjects = showAll ? [...projects, vedovec] : [...projects, vedovec];

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
                ((e.currentTarget as HTMLAnchorElement).style.borderBottomColor = "#a04020")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.borderBottomColor = "#c8c0b6")
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
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "#c8c0b6";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "#e8e3d8";
              }}
            >
              {/* 4:3 screenshot */}
              <div
                style={{
                  position: "relative",
                  paddingTop: "75%",
                  overflow: "hidden",
                  background: "#ede8e0",
                }}
              >
                <Image
                  src={p.img}
                  alt={p.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  style={{ objectFit: "cover", objectPosition: p.imgPosition ?? "top" }}
                />
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
          <div
            style={{
              background: "#fff",
              border: "1px dashed #ddd8ce",
              borderRadius: 6,
              overflow: "hidden",
              opacity: 0.5,
            }}
          >
            <div
              style={{
                position: "relative",
                paddingTop: "75%",
                background: "#f0ece4",
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
                    fontSize: 9,
                    color: "#9a9188",
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                  }}
                >
                  Coming soon
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
                Next project
              </div>
              <div
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  fontSize: "1.45rem",
                  fontWeight: 400,
                  color: "#9a9188",
                }}
              >
                In progress
              </div>
              <div
                style={{
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  fontSize: 12,
                  color: "#9a9188",
                  marginTop: 4,
                }}
              >
                Could be yours
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
