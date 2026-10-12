import Link from "next/link";
import type { Metadata } from "next";
import Stripe from "stripe";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ConversionEvent from "@/components/ConversionEvent";

export const metadata: Metadata = {
  title: "Deposit confirmed — GetWebPage",
  description: "Your deposit has been received. We'll be in touch within 24 hours.",
  robots: { index: false, follow: false },
};

interface VerifiedOrder {
  sessionId: string;
  amount: number;
  currency: string;
}

/**
 * Confirms the checkout actually completed. Without this the page — and the
 * conversion pixel on it — fires for anyone who opens the URL directly.
 */
async function verifySession(id: string | undefined): Promise<VerifiedOrder | null> {
  if (!id || !process.env.STRIPE_SECRET_KEY) return null;

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(id);
    if (session.payment_status !== "paid") return null;

    return {
      sessionId: session.id,
      amount: (session.amount_total ?? 0) / 100,
      currency: (session.currency ?? "gbp").toUpperCase(),
    };
  } catch {
    return null;
  }
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const order = await verifySession(session_id);

  return (
    <>
      {order && (
        <ConversionEvent
          transactionId={order.sessionId}
          value={order.amount}
          currency={order.currency}
        />
      )}
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
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          {/* Tick */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#e6f2ed",
              border: "1px solid #a9cfc0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 32px",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 13l4 4L19 7"
                stroke="#186449"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Heading */}
          <h1
            style={{
              fontFamily: "var(--font-display), Georgia, serif",
              fontSize: "clamp(2.2rem, 5.4vw, 3.4rem)",
              fontWeight: 300,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              color: "#14181a",
              marginBottom: 12,
            }}
          >
            Deposit received.
          </h1>
          <p
            style={{
              fontFamily: "var(--font-display), Georgia, serif",
              fontSize: "clamp(1.3rem, 3vw, 1.8rem)",
              fontWeight: 300,
              fontStyle: "italic",
              color: "#7d2436",
              marginBottom: 32,
            }}
          >
            You&apos;re in.
          </p>

          {/* Body */}
          <p
            style={{
              fontFamily: "var(--font-sans), sans-serif",
              fontSize: 15,
              color: "#5a6360",
              lineHeight: 1.72,
              marginBottom: 24,
            }}
          >
            {order
              ? `We've taken your £${order.amount} deposit. Check your email for confirmation.`
              : "Check your email for confirmation."}
          </p>

          {/* Brief CTA */}
          <p
            style={{
              fontFamily: "var(--font-sans), sans-serif",
              fontSize: 13,
              color: "#636b67",
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

          <p
            style={{
              fontFamily: "var(--font-sans), sans-serif",
              fontSize: 13,
              color: "#636b67",
              lineHeight: 1.72,
              marginBottom: 48,
            }}
          >
            Questions?{" "}
            <a
              href="mailto:saf@safarisaev.ai"
              style={{ color: "#7d2436", textDecoration: "none" }}
            >
              saf@safarisaev.ai
            </a>
          </p>

          {/* Back home */}
          <Link
            href="/"
            style={{
              display: "inline-block",
              fontFamily: "var(--font-sans), sans-serif",
              fontSize: 13,
              color: "#5a6360",
              textDecoration: "none",
              borderBottom: "1px solid #c3c8c0",
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
