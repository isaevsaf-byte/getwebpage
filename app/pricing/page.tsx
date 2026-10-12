import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PricingSection from "@/components/sections/PricingSection";
import OwnershipSection from "@/components/sections/OwnershipSection";
import ButtonLink from "@/components/ButtonLink";

export const metadata: Metadata = {
  title: "Pricing — GetWebPage",
  description:
    "Transparent pricing for UK small business websites. From £500. No monthly fees, no lock-in, full ownership.",
};

const faqs = [
  {
    q: "What's included in the price?",
    a: "Everything you see in the feature list — plus domain setup, hosting configuration, and SSL certificate. No hidden fees.",
  },
  {
    q: "Do I pay monthly after launch?",
    a: "No. You pay once for the build. Hosting is typically £10–20/month with providers like Vercel or Netlify — but that's paid directly to them, not us.",
  },
  {
    q: "What if I need changes after launch?",
    a: "Your site is yours — you can make changes yourself or hire anyone you like. We also offer ongoing support packages for clients who want continued help.",
  },
  {
    q: "Can I see examples first?",
    a: "Yes. Head to our Work page to see live examples of sites we've built across different industries.",
  },
  {
    q: "How do revisions work?",
    a: "Starter includes one revision round. Standard and Identity include two. We turn feedback around the same day, not the same week.",
  },
  {
    q: "What if I need something not listed?",
    a: "Get in touch. We can scope almost anything — e-commerce, booking systems, multilingual sites, animations. Custom quotes within 24 hours.",
  },
];

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main id="main">
        {/* Header */}
        <section
          style={{
            background: "#eaece7",
            padding: "140px 40px 80px",
            borderBottom: "1px solid #d5d9d2",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div
              style={{
                fontFamily: "var(--font-sans), sans-serif",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#8f3446",
                marginBottom: 20,
              }}
            >
              Pricing
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display), serif",
                fontSize: "clamp(2.8rem, 7vw, 5.5rem)",
                fontWeight: 300,
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                color: "#14181a",
                maxWidth: 640,
                marginBottom: 24,
              }}
            >
              From £500. No surprises.
            </h1>
            <p
              style={{
                fontFamily: "var(--font-sans), sans-serif",
                fontSize: "clamp(1rem, 1.6vw, 1.125rem)",
                lineHeight: 1.75,
                fontWeight: 300,
                color: "#5a6360",
                maxWidth: 480,
              }}
            >
              One fixed price per project. You own everything. No monthly
              retainers, no lock-in, no surprises on invoice day.
            </p>
          </div>
        </section>

        {/* Pricing cards */}
        <PricingSection />

        {/* Ownership */}
        <OwnershipSection />

        {/* FAQ */}
        <section
          style={{
            background: "#eaece7",
            padding: "100px 40px",
            borderTop: "1px solid #d5d9d2",
          }}
        >
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div
              style={{
                fontFamily: "var(--font-sans), sans-serif",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#8f3446",
                marginBottom: 16,
              }}
            >
              Common questions
            </div>
            <h2
              style={{
                fontFamily: "var(--font-display), serif",
                fontSize: "clamp(2rem, 4vw, 2.8rem)",
                fontWeight: 300,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "#14181a",
                marginBottom: 64,
              }}
            >
              Answers before you ask.
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {faqs.map((faq) => (
                <div
                  key={faq.q}
                  style={{
                    borderTop: "1px solid #d5d9d2",
                    padding: "28px 0",
                    display: "grid",
                    gridTemplateColumns: "1fr 1.4fr",
                    gap: 48,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display), serif",
                      fontSize: "1.15rem",
                      fontWeight: 400,
                      color: "#14181a",
                      lineHeight: 1.4,
                    }}
                  >
                    {faq.q}
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-sans), sans-serif",
                      fontSize: 14,
                      lineHeight: 1.75,
                      color: "#5a6360",
                    }}
                  >
                    {faq.a}
                  </p>
                </div>
              ))}
              <div style={{ borderTop: "1px solid #d5d9d2", height: 1 }} />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          style={{
            background: "#e3e6e0",
            padding: "80px 40px",
            borderTop: "1px solid #d5d9d2",
          }}
        >
          <div style={{ maxWidth: 580, margin: "0 auto", textAlign: "center" }}>
            <h2
              style={{
                fontFamily: "var(--font-display), serif",
                fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                fontWeight: 300,
                color: "#14181a",
                lineHeight: 1.1,
                letterSpacing: "-0.015em",
                marginBottom: 16,
              }}
            >
              Not sure which plan is right?
            </h2>
            <p
              style={{
                fontFamily: "var(--font-sans), sans-serif",
                fontSize: 14,
                color: "#5a6360",
                marginBottom: 32,
              }}
            >
              Tell us about your business and we&apos;ll recommend the right fit.
              No commitment, reply within 24 hours.
            </p>
            <ButtonLink href="/contact" variant="primary">
              Get a free quote
            </ButtonLink>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
