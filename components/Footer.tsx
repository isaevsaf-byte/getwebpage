import Link from "next/link";

export default function Footer() {
  const navLinks = [
    { label: "Work", href: "/work" },
    { label: "Process", href: "/process" },
    { label: "Pricing", href: "/pricing" },
    { label: "Free audit", href: "/audit" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <footer
      style={{
        background: "#14181a",
        padding: "80px 40px 52px",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Manifest statement */}
        <div
          style={{
            borderBottom: "1px solid #242a2c",
            paddingBottom: 48,
            marginBottom: 48,
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-display), Georgia, serif",
              fontSize: "clamp(1.8rem, 4vw, 3rem)",
              fontWeight: 300,
              lineHeight: 1.2,
              letterSpacing: "-0.015em",
              color: "#e3e6e0",
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
                fontFamily: "var(--font-display), Georgia, serif",
                fontSize: 18,
                fontWeight: 400,
                color: "#e3e6e0",
                letterSpacing: "-0.02em",
              }}
            >
              GetWebPage
            </span>
          </Link>

          <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "center" }}>
            <a href="mailto:saf@safarisaev.ai" className="footer-link">
              saf@safarisaev.ai
            </a>
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} className="footer-link">
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Legal */}
        <div
          style={{
            borderTop: "1px solid #242a2c",
            paddingTop: 24,
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-sans), sans-serif",
              fontSize: 11,
              color: "#8a918d",
              lineHeight: 1.7,
            }}
          >
            GetWebPage is a trading name of OPTIFLOW LABS LTD, Registered in
            England and Wales
            <br />© {new Date().getFullYear()} OPTIFLOW LABS LTD. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
