import Footer from "@/components/Footer";
import SiteHeader from "@/components/showcase/SiteHeader";
import Hero from "@/components/showcase/Hero";
import SevenDays from "@/components/showcase/SevenDays";
import RealSites from "@/components/showcase/RealSites";
import MadeByAI from "@/components/showcase/MadeByAI";
import Pricing from "@/components/showcase/Pricing";
import Ownership from "@/components/showcase/Ownership";
import AuditBand from "@/components/showcase/AuditBand";
import FinalCall from "@/components/showcase/FinalCall";
import StickyOfferBar from "@/components/showcase/primitives/StickyOfferBar";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <Hero />
        <SevenDays />
        <RealSites />
        <MadeByAI />
        <Pricing />
        <Ownership />
        <AuditBand />
        <FinalCall />
      </main>
      <Footer />
      <StickyOfferBar />
    </>
  );
}
