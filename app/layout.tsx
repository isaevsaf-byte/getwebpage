import type { Metadata } from "next";
import { Cormorant, DM_Sans, DM_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import WhatsAppButton from "@/components/WhatsAppButton";
import "./globals.css";

const cormorant = Cormorant({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
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
    url: "https://getwebpage.co.uk",
    siteName: "GetWebPage",
    locale: "en_GB",
    type: "website",
    images: [{ url: "https://getwebpage.co.uk/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GetWebPage — Serious websites for UK small businesses",
    description: "From £500. Delivered in 7 days. Full ownership yours.",
    images: ["https://getwebpage.co.uk/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-GB"
      className={`${cormorant.variable} ${dmSans.variable} ${dmMono.variable}`}
    >
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-QDFPJCSKEY"
          strategy="afterInteractive"
        />
        <Script id="google-tags" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-QDFPJCSKEY');
            gtag('config', 'AW-18152477897');
          `}
        </Script>
      </head>
      <body
        className="min-h-full"
        style={{ fontFamily: "var(--font-dm-sans), Helvetica Neue, Arial, sans-serif" }}
      >
        {children}
        <WhatsAppButton />
        <Analytics />
      </body>
    </html>
  );
}
