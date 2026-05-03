import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service — GetWebPage",
  description: "GetWebPage terms of service — deposits, revisions, timelines, ownership and hosting.",
};

const section: React.CSSProperties = {
  marginBottom: 40,
};

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

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li style={itemStyle}>
      <span style={bullet} />
      {children}
    </li>
  );
}

export default function TermsPage() {
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
              Terms of Service
            </h1>
            <p
              style={{
                fontFamily: "var(--font-dm-sans), sans-serif",
                fontSize: 13,
                color: "#9a9188",
                lineHeight: 1.7,
              }}
            >
              Plain English. No surprises. Last updated May 2026.
            </p>
          </div>

          <div
            style={{
              borderTop: "1px solid #e8e3d8",
              paddingTop: 48,
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >

            {/* 1 */}
            <div style={section}>
              <h2 style={h2Style}>1. The Deposit</h2>
              <ul style={listStyle}>
                <Item>50% deposit is required to begin work.</Item>
                <Item>Deposit is non-refundable once work has started.</Item>
                <Item>If we cannot complete your project, the deposit is refunded in full.</Item>
              </ul>
            </div>

            {/* 2 */}
            <div style={section}>
              <h2 style={h2Style}>2. The Brief</h2>
              <ul style={listStyle}>
                <Item>Client must complete the brief form within 5 days of payment.</Item>
                <Item>If the brief is not received within 5 days, the project is paused.</Item>
                <Item>Work begins only after the brief is received.</Item>
              </ul>
            </div>

            {/* 3 */}
            <div style={section}>
              <h2 style={h2Style}>3. Revisions</h2>
              <ul style={listStyle}>
                <Item>Starter: 1 round of revisions.</Item>
                <Item>Standard: 2 rounds of revisions.</Item>
                <Item>Identity: 3 rounds of revisions.</Item>
                <Item>Revisions beyond the included rounds are charged at £75/hour.</Item>
              </ul>
            </div>

            {/* 4 */}
            <div style={section}>
              <h2 style={h2Style}>4. Timeline</h2>
              <ul style={listStyle}>
                <Item>Starter: 5 working days from brief received.</Item>
                <Item>Standard & Identity: 7 working days from brief received.</Item>
                <Item>Custom projects: timeline agreed separately.</Item>
                <Item>Timeline may extend if client delays feedback.</Item>
              </ul>
            </div>

            {/* 5 */}
            <div style={section}>
              <h2 style={h2Style}>5. Final Payment</h2>
              <ul style={listStyle}>
                <Item>The remaining 50% is due before the site goes live.</Item>
                <Item>The site is not transferred until full payment is received.</Item>
              </ul>
            </div>

            {/* 6 */}
            <div style={section}>
              <h2 style={h2Style}>6. Ownership</h2>
              <ul style={listStyle}>
                <Item>
                  Upon full payment: all code, domain setup, and content belongs to the client.
                </Item>
                <Item>
                  GetWebPage retains the right to show the completed project in our portfolio.
                </Item>
              </ul>
            </div>

            {/* 7 */}
            <div style={section}>
              <h2 style={h2Style}>7. Hosting</h2>
              <ul style={listStyle}>
                <Item>First year of hosting is included with every package.</Item>
                <Item>
                  After year one: client arranges their own hosting, or pays £15/month for
                  ongoing maintenance.
                </Item>
              </ul>
            </div>

            {/* 8 */}
            <div style={section}>
              <h2 style={h2Style}>8. Contact</h2>
              <ul style={listStyle}>
                <Item>
                  All communication via{" "}
                  <a
                    href="mailto:saf@safarisaev.ai"
                    style={{ color: "#a04020", textDecoration: "none" }}
                  >
                    saf@safarisaev.ai
                  </a>
                </Item>
                <Item>We respond within 24 hours on working days.</Item>
              </ul>
            </div>

            {/* Legal footer */}
            <div
              style={{
                borderTop: "1px solid #e8e3d8",
                paddingTop: 32,
                marginTop: 8,
              }}
            >
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
