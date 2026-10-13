import type { Metadata } from "next";
import SiteHeader from "@/components/showcase/SiteHeader";
import Footer from "@/components/Footer";
import AuditTool from "./AuditTool";

export const metadata: Metadata = {
  title: "Free AI website audit — GetWebPage",
  description:
    "Paste your URL and get a free AI audit of your website in about 30 seconds. See the SEO, trust and conversion problems costing you customers, and exactly how to fix them.",
  alternates: { canonical: "/audit" },
  openGraph: {
    title: "Free AI website audit — GetWebPage",
    description:
      "See what's costing you customers. A free AI audit of your site in about 30 seconds.",
    url: "https://getwebpage.co.uk/audit",
    type: "website",
    images: [{ url: "https://getwebpage.co.uk/og-v2.jpg", width: 1200, height: 630, alt: "GetWebPage — a serious website for your business, built in 7 days. From £500." }],
  },
};

export default function AuditPage() {
  return (
    <>
      <SiteHeader />
      <AuditTool />
      <Footer />
    </>
  );
}
