"use client";

import Link from "next/link";

// STUB — replaced by the site-header section agent.
export default function SiteHeader() {
  return (
    <header style={{ position: "fixed", inset: "0 0 auto 0", zIndex: 100, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px clamp(16px,5vw,64px)", color: "#e3e6e0", mixBlendMode: "difference" }}>
      <Link href="/" style={{ color: "inherit", textDecoration: "none", fontFamily: "var(--font-display), Georgia, serif", fontSize: 20 }}>GetWebPage</Link>
      <Link href="/#pricing" style={{ color: "inherit", fontSize: 14 }}>See prices</Link>
    </header>
  );
}
