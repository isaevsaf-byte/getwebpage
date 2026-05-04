import type { Metadata } from "next";
import { Cormorant, DM_Sans, DM_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
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
