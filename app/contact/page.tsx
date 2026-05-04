import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ContactSection from "@/components/sections/ContactSection";

export const metadata: Metadata = {
  title: "Contact — GetWebPage",
  description:
    "Got a complex project? Tell us about your custom build and we'll put together a quote.",
};

export default function ContactPage() {
  return (
    <>
      <Nav />
      <main>
        <ContactSection />

        {/* WhatsApp nudge */}
        <div
          style={{
            background: "#f0ece4",
            borderTop: "1px solid #e8e3d8",
            padding: "28px 40px",
            textAlign: "center",
          }}
        >
          <a
            href="https://wa.me/447729741116"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              fontFamily: "var(--font-dm-sans), sans-serif",
              fontSize: 14,
              color: "#1a1612",
              textDecoration: "none",
              borderBottom: "1px solid #c8c0b6",
              paddingBottom: 2,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" fill="#25D366" />
              <path
                d="M22.88 20.74c-.29.82-1.7 1.56-2.32 1.6-.62.06-1.2.28-4.04-.84-3.38-1.36-5.54-4.8-5.7-5.02-.16-.22-1.32-1.76-1.32-3.36s1.04-2.38 1.42-2.7c.36-.32.78-.4 1.04-.4.26 0 .52 0 .74.01.24.01.56-.09.88.67.32.78 1.08 2.62 1.18 2.82.1.2.16.42.04.68-.12.26-.18.42-.36.64-.18.22-.38.5-.54.66-.18.18-.36.38-.16.74.2.36.9 1.48 1.94 2.4 1.34 1.18 2.46 1.56 2.82 1.72.36.16.58.14.8-.08.22-.22.92-1.06 1.16-1.42.24-.36.5-.3.84-.18.34.12 2.16 1.02 2.52 1.2.36.18.6.28.7.42.08.14.08.82-.22 1.64Z"
                fill="white"
              />
            </svg>
            Prefer to chat? Message us on WhatsApp →
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
