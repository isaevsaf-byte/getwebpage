import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ButtonLink from "@/components/ButtonLink";

export const metadata: Metadata = {
  title: "Process — GetWebPage",
  description:
    "How we build websites in 7 days: brief, build, launch. No agency waffle, no hidden steps.",
};

const steps = [
  {
    n: "01",
    title: "Brief",
    duration: "Day 1",
    body: "Everything starts with a short form — your business, who you serve, what you want visitors to do. We read every word. If something's unclear we'll ask before we start, not halfway through.",
    details: [
      "Business overview & goals",
      "Target audience notes",
      "Competitor references (optional)",
      "Brand assets if you have them",
      "Any specific pages or features needed",
    ],
  },
  {
    n: "02",
    title: "Design",
    duration: "Days 2–3",
    body: "We build your site in our design system — warm, editorial, refined. Not a template. Not a theme. A site that looks and feels like your business, built on a system we know works.",
    details: [
      "Typography & colour selection",
      "Layout and hierarchy decisions",
      "Copy written to match your voice",
      "Mobile and desktop in parallel",
      "Preview link sent on day 3",
    ],
  },
  {
    n: "03",
    title: "Revisions",
    duration: "Day 4",
    body: "You get one round of revisions (two on Identity and above). We turn feedback around the same day. We're not here to negotiate — if something isn't right, we fix it.",
    details: [
      "One structured feedback round",
      "Same-day turnaround",
      "Change requests tracked clearly",
      "No nitpicking charges",
    ],
  },
  {
    n: "04",
    title: "Launch",
    duration: "Days 5–7",
    body: "We push your site live, connect your domain, configure hosting, and set up analytics. You get full access to everything — domain, hosting, code. Nothing stays with us.",
    details: [
      "Domain connected & DNS configured",
      "Hosting set up & deployed",
      "Google Analytics installed",
      "SSL certificate active",
      "Full credentials handed over",
    ],
  },
];

export default function ProcessPage() {
  return (
    <>
      <Nav />
      <main>
        {/* Header */}
        <section
          style={{
            background: "#f7f3ec",
            padding: "140px 40px 80px",
            borderBottom: "1px solid #e8e3d8",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div
              style={{
                fontFamily: "var(--font-dm-sans), sans-serif",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#c87850",
                marginBottom: 20,
              }}
            >
              How it works
            </div>
            <h1
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontSize: "clamp(2.8rem, 7vw, 5.5rem)",
                fontWeight: 300,
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                color: "#1a1612",
                maxWidth: 640,
                marginBottom: 28,
              }}
            >
              From brief to live in 7 days.
            </h1>
            <p
              style={{
                fontFamily: "var(--font-dm-sans), sans-serif",
                fontSize: "clamp(1rem, 1.6vw, 1.125rem)",
                lineHeight: 1.75,
                fontWeight: 300,
                color: "#6b6358",
                maxWidth: 520,
              }}
            >
              Our process is tight because it has to be. Small businesses
              can&apos;t afford to wait months. So we made a system that works
              fast and still gets it right.
            </p>
          </div>
        </section>

        {/* Steps */}
        <section
          style={{
            background: "#f7f3ec",
            padding: "100px 40px",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            {steps.map((step) => (
              <div
                key={step.n}
                style={{
                  display: "grid",
                  gridTemplateColumns: "60px 1fr 1fr",
                  gap: "0 64px",
                  borderTop: "1px solid #e8e3d8",
                  paddingTop: 56,
                  paddingBottom: 56,
                  alignItems: "start",
                }}
              >
                {/* Number */}
                <div
                  style={{
                    fontFamily: "var(--font-cormorant), serif",
                    fontSize: "3.5rem",
                    fontWeight: 300,
                    color: "#d8d0c8",
                    lineHeight: 1,
                    paddingTop: 4,
                  }}
                >
                  {step.n}
                </div>

                {/* Main */}
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-dm-sans), sans-serif",
                      fontSize: 11,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: "#c87850",
                      marginBottom: 8,
                    }}
                  >
                    {step.duration}
                  </div>
                  <h2
                    style={{
                      fontFamily: "var(--font-cormorant), serif",
                      fontSize: "clamp(1.8rem, 3vw, 2.4rem)",
                      fontWeight: 400,
                      color: "#1a1612",
                      lineHeight: 1.1,
                      marginBottom: 20,
                    }}
                  >
                    {step.title}
                  </h2>
                  <p
                    style={{
                      fontFamily: "var(--font-dm-sans), sans-serif",
                      fontSize: 15,
                      lineHeight: 1.75,
                      color: "#6b6358",
                    }}
                  >
                    {step.body}
                  </p>
                </div>

                {/* Details */}
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    paddingTop: 4,
                  }}
                >
                  {step.details.map((d) => (
                    <li
                      key={d}
                      style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#c87850"
                        strokeWidth="2"
                        strokeLinecap="round"
                        style={{ flexShrink: 0, marginTop: 3 }}
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span
                        style={{
                          fontFamily: "var(--font-dm-sans), sans-serif",
                          fontSize: 13,
                          color: "#6b6358",
                          lineHeight: 1.6,
                        }}
                      >
                        {d}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* CTA strip */}
        <section
          style={{
            background: "#f0ece4",
            padding: "80px 40px",
            borderTop: "1px solid #e8e3d8",
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 32,
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
                  fontWeight: 300,
                  color: "#1a1612",
                  lineHeight: 1.1,
                  letterSpacing: "-0.015em",
                }}
              >
                Ready to get started?
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  fontSize: 14,
                  color: "#6b6358",
                  marginTop: 8,
                }}
              >
                Fill in our brief form — takes 5 minutes, no commitment.
              </p>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <ButtonLink href="/contact" variant="primary">
                Get a quote
              </ButtonLink>
              <ButtonLink href="/pricing" variant="outline">
                See pricing
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
