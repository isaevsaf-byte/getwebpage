import type { Metadata } from "next";
import SiteHeader from "@/components/showcase/SiteHeader";
import Footer from "@/components/Footer";
import Pricing from "@/components/showcase/Pricing";
import Ownership from "@/components/showcase/Ownership";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./pricing.module.css";

export const metadata: Metadata = {
  title: "Pricing — GetWebPage",
  description:
    "Transparent pricing for UK small business websites. From £500. No monthly fees, no lock-in, full ownership.",
};

const faqs: { q: string; a: ReactNode }[] = [
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
    a: (
      <>
        Yes. Head to our{" "}
        <Link href="/work" className={styles.link}>
          Work page
        </Link>{" "}
        to see live examples of sites we&apos;ve built across different industries.
      </>
    ),
  },
  {
    q: "How do revisions work?",
    a: "Starter includes one revision round, Standard two and Identity three. We turn feedback around the same day, not the same week.",
  },
  {
    q: "What if I need something not listed?",
    a: "Get in touch. We can scope almost anything — e-commerce, booking systems, multilingual sites, animations. Custom quotes within 24 hours.",
  },
];

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" data-ground="paper">
        {/* Pricing cards — the showcase section owns the page H1 (pricing-title morph) */}
        <Pricing headingLevel="h1" />

        {/* Ownership — the code-flip card */}
        <Ownership />

        {/* FAQ */}
        <section className={styles.faq}>
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
                <div key={faq.q} className={styles.row}>
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
      </main>
      <Footer />
    </>
  );
}
