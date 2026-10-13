/**
 * The single source of facts and verbatim copy for the showcase home page.
 *
 * Everything here is copied from the live components (PricingSection,
 * WorkSection, TestimonialsSection, app/pricing/page.tsx) or from the approved
 * spec copy. Section components import from here and never retype a fact.
 *
 * Deliberate changes from the old components (spec, honesty pass):
 * - Standard's "Most popular" badge is now "Recommended".
 * - safarisaev.ai's sub says it is the founder's own practice.
 * - Testimonials are behind FLAGS (owner decisions, UK DMCC Act 2024).
 * - Site labels live in FLAGS.siteLabels so the owner can edit them in one place.
 *
 * 🚨 OWNER DECISIONS before launch — see FLAGS below.
 */

/* ------------------------------------------------------------------ */
/* Owner flags                                                         */
/* ------------------------------------------------------------------ */

export const FLAGS = {
  /**
   * Quote 1 is from Beautasy, a family business of the founder — a connected
   * party, not an arm's-length client. Off until there is an independent
   * quote (CAP Code 3.45/3.47). If the owner switches it back on, the credit
   * below already discloses the connection.
   */
  testimonial1: false,
  /** Quote 2's outcome claims cannot be verified, so it is off by default. */
  testimonial2: false,
  /**
   * The small label above each portfolio domain. Edit freely.
   * silkbees: the live site's <title> is "Tian Shan Queens — Mountain
   * Beekeeping from Uzbekistan", so the label and sub follow that wording
   * until the owner confirms a better one (it was "Honey Import").
   */
  siteLabels: {
    beautasy: "Lingerie & Atelier",
    bektothefuture: "DJ & Artist",
    silkbees: "Beekeeping",
    safarisaev: "AI & Consulting",
  } as Record<SiteSlug, string>,
};

/* ------------------------------------------------------------------ */
/* Contact facts                                                       */
/* ------------------------------------------------------------------ */

export const SITE_FACTS = {
  email: "saf@safarisaev.ai",
  whatsapp: "https://wa.me/447729741116",
  priceFrom: "£500",
} as const;

/* ------------------------------------------------------------------ */
/* Pricing                                                             */
/* ------------------------------------------------------------------ */

/** Matches the tier ids accepted by POST /api/checkout. */
export type TierId = "starter" | "standard" | "identity";

export interface Tier {
  id: TierId;
  name: string;
  /** Display price, never animated. */
  price: string;
  /** Working days from the brief (Terms). */
  days: number;
  /** Verbatim time label from the old cards. */
  time: string;
  /** The 50% deposit taken at checkout. */
  deposit: string;
  /** "£250 today · £250 before go-live" */
  depositLine: string;
  desc: string;
  features: readonly string[];
  recommended: boolean;
  /** "Recommended" on Standard, otherwise null. */
  badge: string | null;
}

export const TIERS: readonly Tier[] = [
  {
    id: "starter",
    name: "Starter",
    price: "£500",
    days: 5,
    time: "5 working days",
    deposit: "£250",
    depositLine: "£250 today · £250 before go-live",
    desc: "One-page site. Perfect for getting online fast.",
    features: [
      "Single page",
      "Copy written for your brand, included",
      "Mobile responsive",
      "Contact form",
      "Basic SEO setup",
      "Google Analytics",
      "Domain & hosting setup",
      "1 revision round",
    ],
    recommended: false,
    badge: null,
  },
  {
    id: "standard",
    name: "Standard",
    price: "£800",
    days: 7,
    time: "7 working days",
    deposit: "£400",
    depositLine: "£400 today · £400 before go-live",
    desc: "Up to 5 pages. For businesses that need more room.",
    features: [
      "Up to 5 pages",
      "Copy written for your brand, included",
      "Gallery or portfolio",
      "Blog ready",
      "SEO foundations",
      "Domain & hosting setup",
      "2 revision rounds",
    ],
    recommended: true,
    badge: "Recommended",
  },
  {
    id: "identity",
    name: "Identity",
    price: "£1,200",
    days: 7,
    time: "7 working days",
    deposit: "£600",
    depositLine: "£600 today · £600 before go-live",
    desc: "Full brand + site — design, copy, photography direction.",
    features: [
      "Up to 10 pages",
      "Copy written for your brand, included",
      "Brand identity",
      "Photography brief",
      "Booking integration",
      "3 revision rounds",
    ],
    recommended: false,
    badge: null,
  },
];

export const CUSTOM = {
  id: "custom",
  name: "Custom",
  price: "£1,500+",
  time: "TBC",
  desc: "Complex builds, e-commerce, bespoke integrations.",
  features: [
    "Bespoke scope",
    "E-commerce ready",
    "Custom integrations",
    "Ongoing support",
    "Dedicated project lead",
  ],
  cta: "Get in touch",
  href: "/contact",
} as const;

/** Verbatim strings around the pricing cards (PricingSection, app/pricing/page.tsx, spec). */
export const PRICING_COPY = {
  title: "From £500. No surprises.",
  lede: "One fixed price per project. You own everything. No monthly retainers, no lock-in, no surprises on invoice day.",
  cta: "Get started",
  loading: "Loading…",
  error: "Something went wrong. Try again.",
  helpTitle: "Not sure which plan is right?",
  helpBody:
    "Tell us about your business and we'll recommend the right fit. No commitment, reply within 24 hours.",
  helpCta: "Get a free quote",
  helpHref: "/contact",
  auditLink: "Already have a site? Audit it free →",
  auditHref: "/audit",
  terms: "Fixed prices. 50% deposit to start, the balance before go-live. ",
  termsLink: "Read the terms",
  termsHref: "/terms",
} as const;

/* ------------------------------------------------------------------ */
/* Portfolio                                                           */
/* ------------------------------------------------------------------ */

export type SiteSlug = "beautasy" | "bektothefuture" | "silkbees" | "safarisaev";

export const SITE_SLUGS: readonly SiteSlug[] = ["beautasy", "bektothefuture", "silkbees", "safarisaev"];

export interface Site {
  slug: SiteSlug;
  /** Bare domain, e.g. "beautasy.co.uk" (WorkSection's `title`). */
  domain: string;
  /** Live URL; links open in a new tab. */
  url: string;
  /** Small label above the domain (FLAGS.siteLabels). */
  label: string;
  sub: string;
  /** Original 1280×960 JPEG (fallback). */
  image: string;
  /** WorkSection's objectPosition for `image`. */
  imgPosition: "center" | "top";
  /** 1280-wide, up to 4096 tall scroll-through capture. */
  tall: string;
  /** 780×1688 phone capture (390×844 at 2x). */
  mobile: string;
  /** 1024×640 desktop viewport capture (hero panes, RealSites thumbnails). */
  pane: string;
  /** 2560×1600 desktop viewport capture (/work morph targets). */
  large: string;
  /** Shown in the hero fan. False for BEK pending a logo IP check. */
  heroFan: boolean;
}

function site(
  slug: SiteSlug,
  domain: string,
  sub: string,
  imgPosition: Site["imgPosition"],
  heroFan: boolean,
): Site {
  return {
    slug,
    domain,
    url: `https://${domain}`,
    label: FLAGS.siteLabels[slug],
    sub,
    image: `/portfolio/${slug}.jpg`,
    imgPosition,
    tall: `/showcase/sites/${slug}-tall.webp`,
    mobile: `/showcase/sites/${slug}-mobile.webp`,
    pane: `/showcase/sites/${slug}-1024.webp`,
    large: `/showcase/sites/${slug}-2x.webp`,
    heroFan,
  };
}

/** The 4 real, live portfolio sites, in WorkSection order. Captures: scripts/capture-showcase.js. */
export const SITES: readonly Site[] = [
  site(
    "beautasy",
    "beautasy.co.uk",
    "Luxury lingerie brand & bespoke atelier — a family business of our founder",
    "center",
    true,
  ),
  site("bektothefuture", "bektothefuture.com", "DJ artist portfolio & booking", "top", false),
  site(
    "silkbees",
    "silkbees.co.uk",
    "Tian Shan Queens — mountain beekeeping from Uzbekistan",
    "top",
    true,
  ),
  site(
    "safarisaev",
    "safarisaev.ai",
    "AI strategy & consulting presence — our founder's own practice",
    "center",
    true,
  ),
];

export function getSite(slug: string): Site | undefined {
  return SITES.find((s) => s.slug === slug);
}

/* ------------------------------------------------------------------ */
/* Seven days                                                          */
/* ------------------------------------------------------------------ */

export interface ProcessBeat {
  id: "brief" | "design" | "revisions" | "launch";
  /** Days covered, inclusive. */
  days: readonly number[];
  /** "Day 1 — Brief" */
  title: string;
  /** "Brief" */
  short: string;
  body: string;
  /** Chip shown during the beat, if any. */
  chip?: string;
  /** Mono note under the body, if any. */
  note?: string;
  /** Launch checklist, if any. */
  checklist?: readonly string[];
}

export const PROCESS_BEATS: readonly ProcessBeat[] = [
  {
    id: "brief",
    days: [1],
    title: "Day 1 — Brief",
    short: "Brief",
    body: "Everything starts with a short form — your business, who you serve, what you want visitors to do. We read every word. If something's unclear we'll ask before we start, not halfway through.",
  },
  {
    id: "design",
    days: [2, 3],
    title: "Days 2–3 — Design",
    short: "Design",
    body: "Not a template. Not a theme. Layout and hierarchy first — the thing that matters most stands tallest. Then type, colour and copy written to match your voice, on mobile and desktop in parallel.",
    chip: "Preview link sent · day 3",
  },
  {
    id: "revisions",
    days: [4],
    title: "Day 4 — Revisions",
    short: "Revisions",
    body: "Tell us what to change. We turn it around the same day.",
    note: "Revision rounds depend on your plan — see pricing.",
  },
  {
    id: "launch",
    days: [5, 6, 7],
    title: "Days 5–7 — Launch",
    short: "Launch",
    body: "We push your site live, connect your domain and configure hosting. You get full access to everything — domain, hosting, code. Nothing stays with us.",
    checklist: [
      "Domain connected & DNS configured",
      "Hosting set up & deployed",
      "SSL certificate active",
      "Full credentials handed over",
    ],
    chip: "Live",
  },
];

/** DayRail ticks, D1–D7. */
export const DAY_TICKS: readonly { day: number; label: string }[] = [
  { day: 1, label: "Brief" },
  { day: 2, label: "Design" },
  { day: 3, label: "Design" },
  { day: 4, label: "Revisions" },
  { day: 5, label: "Launch" },
  { day: 6, label: "Launch" },
  { day: 7, label: "Live" },
];

export const SEVEN_DAYS_COPY = {
  kicker: "Your sketch, built the way we build every site.",
  /** Replace {name}. */
  kickerWithName: "Your sketch for {name}.",
  title: "From brief to live in 7 days.",
  endLine: "That was a sketch. Yours gets the real thing.",
  endPrimary: "Start yours — from £500",
  endSecondary: "See sites we've built ↓",
  footnote: "Working days, counted from your brief. Starter sites take 5.",
  skip: "Skip the week ↓",
} as const;

/* ------------------------------------------------------------------ */
/* Testimonials                                                        */
/* ------------------------------------------------------------------ */

export interface Testimonial {
  /** The FLAGS key that switches this quote on. */
  flag: "testimonial1" | "testimonial2";
  quote: string;
  name: string;
  /** Empty when there is none. */
  role: string;
  /** The portfolio site the quote relates to. */
  slug: SiteSlug;
}

/** Verbatim from TestimonialsSection. Render only `TESTIMONIALS.filter(t => FLAGS[t.flag])`. */
export const TESTIMONIALS: readonly Testimonial[] = [
  {
    flag: "testimonial1",
    quote:
      "Genuinely couldn't believe how fast it was. The site looks better than anything I've seen from agencies charging triple.",
    name: "Beautasy studio owner",
    role: "Southampton, UK — a family business of our founder",
    slug: "beautasy",
  },
  {
    flag: "testimonial2",
    quote:
      "We had zero online presence. Now we get bookings every day through the site. It paid for itself in the first week.",
    name: "DJ & music artist",
    role: "",
    slug: "bektothefuture",
  },
];

export const TESTIMONIALS_TITLE = "The site is the salesperson.";
