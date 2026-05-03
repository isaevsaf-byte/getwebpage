import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ContactSection from "@/components/sections/ContactSection";

export const metadata: Metadata = {
  title: "Contact — GetWebPage",
  description:
    "Get a quote for your website. Fill in our short brief and we'll reply within 24 hours.",
};

export default function ContactPage() {
  return (
    <>
      <Nav />
      <main>
        {/* Header */}
        <section
          style={{
            background: "#f7f3ec",
            padding: "140px 40px 60px",
            borderBottom: "1px solid #e8e3d8",
          }}
        >
          <div style={{ maxWidth: 580, margin: "0 auto", textAlign: "center" }}>
            <div
              style={{
                fontFamily: "var(--font-dm-sans), sans-serif",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
                color: "#c87850",
                marginBottom: 20,
              }}
            >
              Contact
            </div>
            <h1
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontSize: "clamp(2.8rem, 7vw, 5rem)",
                fontWeight: 300,
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                color: "#1a1612",
                marginBottom: 20,
              }}
            >
              Tell us about your business.
            </h1>
            <p
              style={{
                fontFamily: "var(--font-dm-sans), sans-serif",
                fontSize: "clamp(1rem, 1.6vw, 1.05rem)",
                lineHeight: 1.75,
                fontWeight: 300,
                color: "#6b6358",
              }}
            >
              Fill in the brief below — 5 minutes, no commitment. We&apos;ll come
              back within 24 hours with a clear quote.
            </p>
          </div>
        </section>

        {/* Contact form */}
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
