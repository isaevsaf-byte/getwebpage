"use client";

import Link from "next/link";

export default function Footer() {
  const navLinks = [
    { label: "Work", href: "/work" },
    { label: "Process", href: "/process" },
    { label: "Pricing", href: "/pricing" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <footer
      style={{
        background: "#1a1612",
        padding: "80px 40px 52px",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Manifest statement */}
        <div
          style={{
            borderBottom: "1px solid #2e2820",
            paddingBottom: 48,
            marginBottom: 48,
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontSize: "clamp(1.8rem, 4vw, 3rem)",
              fontWeight: 300,
              lineHeight: 1.2,
              letterSpacing: "-0.015em",
              color: "#f0ece4",
              maxWidth: 700,
              fontStyle: "italic",
            }}
          >
            A real website, built with care,
            <br />
            delivered in a week. That&apos;s the whole idea.
          </p>
        </div>

        {/* Nav row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 32,
            marginBottom: 48,
          }}
        >
          <Link
            href="/"
            style={{ textDecoration: "none" }}
          >
            <span
              style={{
                fontFamily: "var(--font-cormorant), Georgia, serif",
                fontSize: 18,
                fontWeight: 400,
                color: "#f0ece4",
                letterSpacing: "-0.02em",
              }}
            >
              GetWebPage
            </span>
          </Link>

          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  fontSize: 13,
                  color: "#6b6358",
                  textDecoration: "none",
                  transition: "color 200ms",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.color =
                    "#9a9188")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.color =
                    "#6b6358")
                }
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Legal */}
        <div
          style={{
            borderTop: "1px solid #2e2820",
            paddingTop: 24,
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-dm-sans), sans-serif",
              fontSize: 11,
              color: "#3a3430",
              lineHeight: 1.7,
            }}
          >
            GetWebPage is a trading name of OPTIFLOW LABS LTD, Registered in
            England and Wales
            <br />© 2026 OPTIFLOW LABS LTD. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
