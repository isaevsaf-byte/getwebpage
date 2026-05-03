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
      <main>
        {/* Page header */}
        <section
          style={{
            background: "#f7f3ec",
            padding: "140px 40px 0",
            borderBottom: "1px solid #e8e3d8",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 64 }}>
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
              Portfolio
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
