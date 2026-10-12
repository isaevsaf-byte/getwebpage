import Link from "next/link";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Page not found — GetWebPage",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <>
      <Nav />
      <main
        id="main"
        style={{
          background: "#eaece7",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 40px",
        }}
      >
        <div style={{ maxWidth: 520 }}>
          <div
            style={{
              fontFamily: "var(--font-sans), sans-serif",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#8f3446",
              marginBottom: 18,
            }}
          >
            Error 404
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display), Georgia, serif",
              fontSize: "clamp(2.2rem, 5.4vw, 3.4rem)",
              fontWeight: 300,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "#14181a",
              marginBottom: 16,
            }}
          >
            That page isn&apos;t here.
          </h1>
          <p
            style={{
              fontFamily: "var(--font-sans), sans-serif",
              fontSize: 15,
              fontWeight: 300,
              color: "#5a6360",
              lineHeight: 1.72,
              marginBottom: 32,
              maxWidth: 440,
            }}
          >
            The link may be old, or the address slightly off. Everything we build
            is still one click away.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link
              href="/"
              style={{
                fontFamily: "var(--font-sans), sans-serif",
                fontSize: 14,
                fontWeight: 500,
                background: "#7d2436",
                color: "#fff",
                borderRadius: 4,
                padding: "13px 28px",
                textDecoration: "none",
              }}
            >
              Back to homepage
            </Link>
            <Link
              href="/audit"
              style={{
                fontFamily: "var(--font-sans), sans-serif",
                fontSize: 14,
                fontWeight: 500,
                color: "#14181a",
                border: "1px solid #c3c8c0",
                borderRadius: 4,
                padding: "13px 28px",
                textDecoration: "none",
              }}
            >
              Free site audit
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
