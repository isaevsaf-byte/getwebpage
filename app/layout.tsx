import type { Metadata, Viewport } from "next";
import { Literata, DM_Sans, DM_Mono } from "next/font/google";
import WhatsAppButton from "@/components/WhatsAppButton";
import ConsentBanner from "@/components/ConsentBanner";
import SiteAnalytics from "@/components/SiteAnalytics";
import SmoothScroll from "@/components/motion/SmoothScroll";
import PageTransition from "@/components/motion/PageTransition";
import { MOTION_GATE_SCRIPT } from "@/lib/showcase/tier";
import "./globals.css";

// One variable file (wght 200–900 + optical size) instead of four static
// weights, so display weights can animate smoothly. Upright only: the
// italic file doubled the preload (+180 KB measured) for a style the
// showcase does not use.
const literata = Literata({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  weight: "variable",
  axes: ["opsz"],
  style: ["normal"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const SITE = "https://getwebpage.co.uk";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "GetWebPage — Serious websites for UK small businesses",
  description:
    "A UK web studio building fast, beautiful websites for salons, studios, hospitality and trades. From £500, delivered in 7 days. Full ownership guaranteed.",
  keywords: "web design, website, UK, small business, affordable, fast",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "GetWebPage — Serious websites for UK small businesses",
    description: "From £500. Delivered in 7 days. Full ownership yours.",
    url: SITE,
    siteName: "GetWebPage",
    locale: "en_GB",
    type: "website",
    images: [{ url: `${SITE}/og-image.jpg`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GetWebPage — Serious websites for UK small businesses",
    description: "From £500. Delivered in 7 days. Full ownership yours.",
    images: [`${SITE}/og-image.jpg`],
  },
};

export const viewport: Viewport = {
  themeColor: "#14181a",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

// Structured data — helps Google understand what the business is and
// what it sells, which plain marketing copy cannot communicate.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ProfessionalService",
      "@id": `${SITE}/#business`,
      name: "GetWebPage",
      description:
        "UK web studio building websites for salons, studios, hospitality and trades. From £500, delivered in 7 days.",
      url: SITE,
      email: "saf@safarisaev.ai",
      telephone: "+447729741116",
      image: `${SITE}/og-image.jpg`,
      priceRange: "££",
      areaServed: { "@type": "Country", name: "United Kingdom" },
      parentOrganization: {
        "@type": "Organization",
        name: "OPTIFLOW LABS LTD",
      },
    },
    {
      "@type": "Service",
      "@id": `${SITE}/#service`,
      serviceType: "Website design and build",
      provider: { "@id": `${SITE}/#business` },
      areaServed: { "@type": "Country", name: "United Kingdom" },
      offers: [
        { "@type": "Offer", name: "Starter", price: "500", priceCurrency: "GBP" },
        { "@type": "Offer", name: "Standard", price: "800", priceCurrency: "GBP" },
        { "@type": "Offer", name: "Identity", price: "1200", priceCurrency: "GBP" },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-GB"
      className={`${literata.variable} ${dmSans.variable} ${dmMono.variable}`}
      // The motion gate adds classes to <html> before React hydrates.
      suppressHydrationWarning
      // Next 16 keeps CSS smooth scrolling during route changes unless told
      // otherwise; this makes a new page start at the top instantly.
      data-scroll-behavior="smooth"
    >
      <head>
        {/* Runs before first paint: html.js / motion-ok / fine-desktop /
            save-data / fonts-ready. The only script this layout adds. */}
        <script
          id="motion-gate"
          dangerouslySetInnerHTML={{ __html: MOTION_GATE_SCRIPT }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SmoothScroll>
          <PageTransition>
            {children}
          </PageTransition>
        </SmoothScroll>
        <WhatsAppButton />
        {/* Google Analytics and Google Ads load only after the visitor
            accepts — see ConsentBanner. Vercel Analytics is cookieless. */}
        <ConsentBanner />
        <SiteAnalytics />
      </body>
    </html>
  );
}
