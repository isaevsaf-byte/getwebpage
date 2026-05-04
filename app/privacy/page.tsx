import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy — GetWebPage",
  description: "How GetWebPage collects, uses and protects your personal data.",
};

const section: React.CSSProperties = { marginBottom: 40 };

const h2Style: React.CSSProperties = {
  fontFamily: "var(--font-cormorant), Georgia, serif",
  fontSize: "1.4rem",
  fontWeight: 400,
  color: "#1a1612",
  marginBottom: 16,
  letterSpacing: "-0.01em",
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const itemStyle: React.CSSProperties = {
  fontFamily: "var(--font-dm-sans), sans-serif",
  fontSize: 14,
  color: "#4a443e",
  lineHeight: 1.72,
  paddingLeft: 20,
  position: "relative",
};

const bullet: React.CSSProperties = {
  position: "absolute",
  left: 0,
  top: "0.55em",
  width: 4,
  height: 4,
  borderRadius: "50%",
  background: "#c87850",
};

const para: React.CSSProperties = {
  fontFamily: "var(--font-dm-sans), sans-serif",
  fontSize: 14,
  color: "#4a443e",
  lineHeight: 1.72,
  marginBottom: 12,
};

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li style={itemStyle}>
      <span style={bullet} />
      {children}
    </li>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main style={{ background: "#f7f3ec", minHeight: "100vh", padding: "100px 40px 120px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ marginBottom: 64 }}>
            <div
              style={{
                fontFamily: "var(--font-dm-sans), sans-serif",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#c87850",
                marginBottom: 16,
              }}
            >
              Legal
            </div>
            <h1
              style={{
                fontFamily: "var(--font-cormorant), Georgia, serif",
                fontSize: "clamp(2.2rem, 5vw, 3.2rem)",
                fontWeight: 300,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "#1a1612",
                marginBottom: 16,
              }}
            >
              Privacy Policy
            </h1>
            <p
              style={{
                fontFamily: "var(--font-dm-sans), sans-serif",
                fontSize: 13,
                color: "#9a9188",
                lineHeight: 1.7,
              }}
            >
              Plain English. GDPR compliant. Last updated May 2026.
            </p>
          </div>

          <div style={{ borderTop: "1px solid #e8e3d8", paddingTop: 48 }}>

            {/* 1 */}
            <div style={section}>
              <h2 style={h2Style}>1. Who we are</h2>
              <p style={para}>
                GetWebPage is a trading name of OPTIFLOW LABS LTD, registered in England and Wales.
                We build websites for UK small businesses.
              </p>
              <p style={para}>
                We are the data controller for any personal information you provide to us.
                Questions? Contact us at{" "}
                <a href="mailto:saf@safarisaev.ai" style={{ color: "#a04020", textDecoration: "none" }}>
                  saf@safarisaev.ai
                </a>
              </p>
            </div>

            {/* 2 */}
            <div style={section}>
              <h2 style={h2Style}>2. What data we collect</h2>
              <ul style={listStyle}>
                <Item><strong>Name and email address</strong> — when you fill in our contact form or purchase a package.</Item>
                <Item><strong>Business information</strong> — type of business and project brief, to deliver your website.</Item>
                <Item><strong>Payment information</strong> — handled entirely by Stripe. We never see or store your card details.</Item>
                <Item><strong>Billing address</strong> — collected by Stripe at checkout for fraud prevention.</Item>
                <Item><strong>Usage data</strong> — anonymous analytics via Vercel Analytics (no cookies, no cross-site tracking).</Item>
              </ul>
            </div>

            {/* 3 */}
            <div style={section}>
              <h2 style={h2Style}>3. Why we collect it</h2>
              <ul style={listStyle}>
                <Item>To deliver the website you've commissioned.</Item>
                <Item>To communicate about your project and send your brief form.</Item>
                <Item>To process your deposit payment securely.</Item>
                <Item>To send order confirmation and project updates by email.</Item>
                <Item>To comply with legal and financial obligations.</Item>
              </ul>
            </div>

            {/* 4 */}
            <div style={section}>
              <h2 style={h2Style}>4. How we store and protect your data</h2>
              <ul style={listStyle}>
                <Item>
                  <strong>Stripe</strong> — payment processing and billing data. Stripe is PCI DSS Level 1 certified.{" "}
                  <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#a04020", textDecoration: "none" }}>stripe.com/privacy</a>
                </Item>
                <Item>
                  <strong>Resend</strong> — transactional email delivery. Emails are sent securely and not stored beyond delivery logs.{" "}
                  <a href="https://resend.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#a04020", textDecoration: "none" }}>resend.com/privacy</a>
                </Item>
                <Item>
                  <strong>Tally</strong> — project brief form submissions. Data is stored securely in Tally and used only to manage your project.
                </Item>
                <Item>We do not sell, rent or share your personal data with any third parties for marketing purposes.</Item>
                <Item>We retain your data for as long as necessary to fulfil your project and comply with legal obligations (typically 6 years for financial records).</Item>
              </ul>
            </div>

            {/* 5 */}
            <div style={section}>
              <h2 style={h2Style}>5. Your rights (GDPR)</h2>
              <p style={para}>Under UK GDPR you have the right to:</p>
              <ul style={listStyle}>
                <Item><strong>Access</strong> — request a copy of the personal data we hold about you.</Item>
                <Item><strong>Correction</strong> — ask us to correct inaccurate or incomplete data.</Item>
                <Item><strong>Deletion</strong> — request that we delete your data ("right to be forgotten").</Item>
                <Item><strong>Restriction</strong> — ask us to limit how we use your data.</Item>
                <Item><strong>Portability</strong> — receive your data in a structured, machine-readable format.</Item>
                <Item><strong>Objection</strong> — object to processing based on legitimate interests.</Item>
              </ul>
              <p style={{ ...para, marginTop: 16 }}>
                To exercise any of these rights, email{" "}
                <a href="mailto:saf@safarisaev.ai" style={{ color: "#a04020", textDecoration: "none" }}>
                  saf@safarisaev.ai
                </a>
                . We will respond within 30 days.
              </p>
            </div>

            {/* 6 */}
            <div style={section}>
              <h2 style={h2Style}>6. Cookies</h2>
              <p style={para}>
                We use Vercel Analytics which does not use cookies or track you across sites.
                Our website does not set any marketing or tracking cookies.
              </p>
            </div>

            {/* 7 */}
            <div style={section}>
              <h2 style={h2Style}>7. Complaints</h2>
              <p style={para}>
                If you believe we have mishandled your data, you have the right to complain to the
                Information Commissioner&apos;s Office (ICO) at{" "}
                <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" style={{ color: "#a04020", textDecoration: "none" }}>
                  ico.org.uk
                </a>
              </p>
              <p style={para}>
                ICO Registration: <em>[to be added upon registration]</em>
              </p>
            </div>

            {/* Legal footer */}
            <div style={{ borderTop: "1px solid #e8e3d8", paddingTop: 32, marginTop: 8 }}>
              <p
                style={{
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  fontSize: 12,
                  color: "#9a9188",
                  lineHeight: 1.7,
                }}
              >
                GetWebPage is a trading name of OPTIFLOW LABS LTD
                <br />
                Registered in England and Wales
              </p>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
