import type { Metadata } from "next";
import Image from "next/image";
import SiteHeader from "@/components/showcase/SiteHeader";
import Footer from "@/components/Footer";
import ButtonLink from "@/components/ButtonLink";

export const metadata: Metadata = {
  title: "About — GetWebPage",
  description:
    "GetWebPage is a UK web studio building serious websites for small businesses. Fast, honest, and yours to keep.",
};

const values = [
  {
    title: "We build for businesses, not portfolios",
    body: "Every site we make has to work — attract customers, build trust, drive action. Beautiful is a given. Useful is the job.",
  },
  {
    title: "Fast doesn't mean careless",
    body: "7 days is tight. We do it by having a strong system, not by cutting corners. Every site is built properly, tested, and launched with care.",
  },
  {
    title: "You own everything",
    body: "Domain, code, content — all of it transfers to you on delivery. We don't believe in subscriptions for things you've already paid to build.",
  },
  {
    title: "Plain talk",
    body: "No agency jargon, no project bloat. We say what we mean, charge what we quote, and deliver when we say we will.",
  },
];

const industries = [
  "Beauty salons & spas",
  "Hair & lash studios",
  "Cafés & restaurants",
  "Hotels & B&Bs",
  "Joiners & builders",
  "Electricians & plumbers",
  "Personal trainers",
  "Photographers",
  "DJs & musicians",
  "Consultants",
  "Retailers",
  "Importers & distributors",
];

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main data-ground="paper" id="main">
        {/* Header */}
        <section
          style={{
            background: "#eaece7",
            padding: "140px 40px 80px",
            borderBottom: "1px solid #d5d9d2",
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 80,
              alignItems: "center",
            }}
          >
            <div>
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
                About
              </div>
              <h1
                style={{
                  fontFamily: "var(--font-display), serif",
                  fontSize: "clamp(2.8rem, 7vw, 5.5rem)",
                  fontWeight: 300,
                  lineHeight: 1.05,
                  letterSpacing: "-0.025em",
                  color: "#14181a",
                  marginBottom: 28,
                }}
              >
                A studio that
                <br />
                gets it done.
              </h1>
              <p
                style={{
                  fontFamily: "var(--font-sans), sans-serif",
                  fontSize: "clamp(1rem, 1.6vw, 1.125rem)",
                  lineHeight: 1.75,
                  fontWeight: 300,
                  color: "#5a6360",
                  maxWidth: 440,
                }}
              >
                GetWebPage builds websites for UK small businesses. Not
                templates, not themes — real sites, built with care, delivered
                in a week, owned by you.
              </p>
            </div>
            <div
              style={{
                position: "relative",
                borderRadius: 4,
                aspectRatio: "4/3",
                overflow: "hidden",
              }}
            >
              <Image
                src="/about-hero.jpg"
                alt="GetWebPage studio workspace"
                fill
                sizes="(max-width: 900px) 100vw, 50vw"
                style={{ objectFit: "cover", objectPosition: "center" }}
                priority
              />
            </div>
          </div>
        </section>

        {/* What we do */}
        <section
          style={{
            background: "#eaece7",
            padding: "100px 40px",
            borderTop: "1px solid #d5d9d2",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "48px 100px",
                alignItems: "start",
              }}
            >
              <div>
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
                  What we do
                </div>
                <h2
                  style={{
                    fontFamily: "var(--font-display), serif",
                    fontSize: "clamp(2rem, 4vw, 3rem)",
                    fontWeight: 300,
                    lineHeight: 1.1,
                    letterSpacing: "-0.02em",
                    color: "#14181a",
                    marginBottom: 32,
                  }}
                >
                  Web design & build for
                  <br />
                  UK small businesses.
                </h2>
                <p
                  style={{
                    fontFamily: "var(--font-sans), sans-serif",
                    fontSize: 15,
                    lineHeight: 1.75,
                    color: "#5a6360",
                    marginBottom: 24,
                  }}
                >
                  We work with businesses across the UK that need a serious
                  website without a serious wait. Our clients are beauty
                  professionals, hospitality owners, skilled tradespeople,
                  creative freelancers, and anyone who needs a real online
                  presence.
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-sans), sans-serif",
                    fontSize: 15,
                    lineHeight: 1.75,
                    color: "#5a6360",
                  }}
                >
                  We handle everything from design to copy to code to launch. You
                  brief us, approve the preview, and take full ownership on
                  delivery.
                </p>
              </div>
              <div>
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
                  Industries we serve
                </div>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px 24px",
                  }}
                >
                  {industries.map((ind) => (
                    <li
                      key={ind}
                      style={{ display: "flex", gap: 8, alignItems: "flex-start" }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-sans), sans-serif",
                          fontSize: 13,
                          color: "#8f3446",
                          flexShrink: 0,
                          lineHeight: 1.6,
                        }}
                      >
                        —
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-sans), sans-serif",
                          fontSize: 13,
                          color: "#5a6360",
                          lineHeight: 1.6,
                        }}
                      >
                        {ind}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section
          style={{
            background: "#e0e3dd",
            padding: "100px 40px",
            borderTop: "1px solid #d5d9d2",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div
              style={{
                fontFamily: "var(--font-sans), sans-serif",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#636b67",
                marginBottom: 16,
              }}
            >
              How we work
            </div>
            <h2
              style={{
                fontFamily: "var(--font-display), serif",
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: 300,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "#14181a",
                marginBottom: 64,
              }}
            >
              Four things we believe in.
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 32,
              }}
            >
              {values.map((v, i) => (
                <div key={v.title}>
                  <div
                    style={{
                      fontFamily: "var(--font-display), serif",
                      fontSize: "1rem",
                      color: "#c3c8c0",
                      marginBottom: 16,
                    }}
                  >
                    0{i + 1}
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--font-display), serif",
                      fontSize: "1.3rem",
                      fontWeight: 400,
                      color: "#14181a",
                      lineHeight: 1.3,
                      marginBottom: 12,
                    }}
                  >
                    {v.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "var(--font-sans), sans-serif",
                      fontSize: 13,
                      lineHeight: 1.75,
                      color: "#5a6360",
                    }}
                  >
                    {v.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          style={{
            background: "#eaece7",
            padding: "80px 40px",
            borderTop: "1px solid #d5d9d2",
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
            <h2
              style={{
                fontFamily: "var(--font-display), serif",
                fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
                fontWeight: 300,
                color: "#14181a",
                lineHeight: 1.1,
                letterSpacing: "-0.015em",
              }}
            >
              Ready to work with us?
            </h2>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <ButtonLink href="/contact" variant="primary">
                Get a quote
              </ButtonLink>
              <ButtonLink href="/work" variant="outline">
                See our work
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
