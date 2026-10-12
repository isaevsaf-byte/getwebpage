import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Hero from "@/components/sections/Hero";
import ProcessSection from "@/components/sections/ProcessSection";
import WorkSection from "@/components/sections/WorkSection";
import AuditBand from "@/components/sections/AuditBand";
import PricingSection from "@/components/sections/PricingSection";
import OwnershipSection from "@/components/sections/OwnershipSection";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import ContactSection from "@/components/sections/ContactSection";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <ProcessSection />
        <WorkSection showAll={false} />
        <AuditBand />
        <PricingSection />
        <OwnershipSection />
        <TestimonialsSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
