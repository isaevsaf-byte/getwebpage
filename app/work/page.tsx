import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import WorkSection from "@/components/sections/WorkSection";

export const metadata: Metadata = {
  title: "Work — GetWebPage",
  description:
    "Portfolio of websites built for UK small businesses — salons, DJs, honey importers, consultants, and more.",
};

export default function WorkPage() {
  return (
    <>
      <Nav />
      <main id="main">
        {/* Page header */}
        <section
          style={{
            background: "#eaece7",
            padding: "140px 40px 0",
            borderBottom: "1px solid #d5d9d2",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 64 }}>
            <div
              style={{
                fontFamily: "var(--font-sans), sans-serif",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
                color: "#8f3446",
                marginBottom: 20,
              }}
            >
              Portfolio
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
              }}
            >
              Built for real businesses.
            </h1>
          </div>
        </section>

        {/* Work grid — full portfolio */}
        <WorkSection showAll={true} />
      </main>
      <Footer />
    </>
  );
}
