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
      </main>
      <Footer />
    </>
  );
}
