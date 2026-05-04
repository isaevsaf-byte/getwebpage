import Link from "next/link";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Deposit confirmed — GetWebPage",
  description: "Your deposit has been received. We'll be in touch within 24 hours.",
};

export default function SuccessPage() {
  return (
    <>
      <Nav />
      <main
        style={{
          background: "#f7f3ec",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 40px",
        }}
      >
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          {/* Tick */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#f0f5f2",
              border: "1px solid #b0d0c0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 32px",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13l4 4L19 7"
                stroke="#2a5040"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Heading */}
          <h1
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontSize: "clamp(2.4rem, 6vw, 3.8rem)",
              fontWeight: 300,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "#1a1612",
              marginBottom: 12,
            }}
          >
            Deposit received.
          </h1>
          <p
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontSize: "clamp(1.4rem, 3vw, 2rem)",
              fontWeight: 300,
              fontStyle: "italic",
              color: "#a04020",
              marginBottom: 32,
            }}
          >
            You&apos;re in.
          </p>

          {/* Body */}
          <p
            style={{
              fontFamily: "var(--font-dm-sans), sans-serif",
              fontSize: 15,
              color: "#6b6358",
              lineHeight: 1.72,
              marginBottom: 24,
            }}
          >
            Check your email for confirmation.
          </p>

          {/* Brief CTA */}
          <p
            style={{
              fontFamily: "var(--font-dm-sans), sans-serif",
              fontSize: 13,
              color: "#9a9188",
              marginBottom: 12,
            }}
          >
            Or fill in your brief right now:
          </p>
          <a
            href="https://tally.so/r/lbV7Zo"
            target="_blank"
            rel="noopener noreferrer"
            className="brief-btn"
          >
            Fill in the brief →
          </a>
          <style>{`
            .brief-btn {
              display: inline-block;
              font-family: var(--font-dm-sans), sans-serif;
              font-size: 14px;
              font-weight: 500;
              color: #1a1612;
              border: 1px solid #c8c0b6;
              border-radius: 4px;
              padding: 11px 28px;
              text-decoration: none;
              margin-bottom: 40px;
              transition: border-color 200ms;
            }
            .brief-btn:hover { border-color: #a04020; }
          `}</style>

          <p
            style={{
              fontFamily: "var(--font-dm-sans), sans-serif",
              fontSize: 13,
              color: "#9a9188",
              lineHeight: 1.72,
              marginBottom: 48,
            }}
          >
            Questions?{" "}
            <a
              href="mailto:saf@safarisaev.ai"
              style={{ color: "#a04020", textDecoration: "none" }}
            >
              saf@safarisaev.ai
            </a>
          </p>

          {/* Back home */}
          <Link
            href="/"
            style={{
              display: "inline-block",
              fontFamily: "var(--font-dm-sans), sans-serif",
              fontSize: 13,
              color: "#6b6358",
              textDecoration: "none",
              borderBottom: "1px solid #c8c0b6",
              paddingBottom: 2,
            }}
          >
            ← Back to homepage
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
