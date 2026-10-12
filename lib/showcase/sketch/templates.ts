/**
 * The four hand-art-directed sector templates: copy, palette and the block
 * geometry each one is drawn on. Pure data — safe on the server.
 *
 * Every text/background pair below is ≥4.5:1 (checked with a script):
 * ink and muted on bg and tone1, onAccent on accent, accent on bg.
 * tone2 is decorative only — no text is ever set on it.
 *
 * Content rules: no reviews, ratings, prices, phone numbers or claims.
 */
import type {
  SectorSpec,
  SketchBlockId,
  SketchLayoutKind,
  SketchSector,
} from "./types";

export const SECTORS: Record<SketchSector, SectorSpec> = {
  salon: {
    id: "salon",
    label: "Salon",
    palette: {
      bg: "#f3ece8",
      ink: "#2a1d22",
      muted: "#664f57",
      accent: "#8e3f52",
      onAccent: "#f3ece8",
      tone1: "#e6d3cf",
      tone2: "#d9bfc0",
      rule: "rgba(42,29,34,0.16)",
    },
    nav: ["Treatments", "Prices", "About", "Book"],
    sub: "Book your next appointment online.",
    cta: "Book an appointment",
    cta2: "See treatments",
    cards: [
      { title: "Treatments", body: "What we offer, explained simply." },
      { title: "Booking", body: "Pick a time that suits you." },
      { title: "Find us", body: "Where we are and when we’re open." },
    ],
    footerLinks: ["Contact", "Privacy"],
    image: "ellipses",
    imageAlt: "A round mirror and folded towels in soft blush light",
  },
  cafe: {
    id: "cafe",
    label: "Café",
    palette: {
      bg: "#efe9df",
      ink: "#231c16",
      muted: "#62513f",
      accent: "#6f4322",
      onAccent: "#efe9df",
      tone1: "#e2d6c4",
      tone2: "#cdb89c",
      rule: "rgba(35,28,22,0.18)",
    },
    nav: ["Menu", "Visit", "About", "Order"],
    sub: "See today’s menu and opening hours.",
    cta: "See the menu",
    cta2: "Find us",
    cards: [
      { title: "Today’s menu", body: "What’s on the counter today." },
      { title: "Opening hours", body: "When the door is open." },
      { title: "Getting here", body: "Where we are, with a map." },
    ],
    footerLinks: ["Contact", "Privacy"],
    image: "cups",
    imageAlt: "Coffee cups on a wooden table, seen from above",
  },
  studio: {
    id: "studio",
    label: "Studio",
    palette: {
      bg: "#e9eaec",
      ink: "#16181d",
      muted: "#565c66",
      accent: "#34465f",
      onAccent: "#e9eaec",
      tone1: "#d7dade",
      tone2: "#c3c8cf",
      rule: "rgba(22,24,29,0.18)",
    },
    nav: ["Work", "Services", "About", "Contact"],
    sub: "Selected work and how to book us.",
    cta: "View the work",
    cta2: "Get in touch",
    cards: [
      { title: "Selected work", body: "Projects, start to finish." },
      { title: "Services", body: "What we make and how." },
      { title: "Booking", body: "How a project starts." },
    ],
    footerLinks: ["Contact", "Privacy"],
    image: "frames",
    imageAlt: "Three framed prints hung on a seamless backdrop",
  },
  trades: {
    id: "trades",
    label: "Trades",
    palette: {
      bg: "#e8eae6",
      ink: "#1b1f1c",
      muted: "#535b56",
      accent: "#2f5d50",
      onAccent: "#e8eae6",
      tone1: "#d4dad3",
      tone2: "#bcc6bd",
      rule: "rgba(27,31,28,0.18)",
    },
    nav: ["Services", "Projects", "Areas", "Quote"],
    sub: "Request a quote online.",
    cta: "Get a quote",
    cta2: "See projects",
    cards: [
      { title: "Services", body: "What we take on, start to finish." },
      { title: "Recent projects", body: "Finished jobs, with photos." },
      { title: "Areas we cover", body: "Check we work near you." },
    ],
    footerLinks: ["Contact", "Privacy"],
    image: "blueprint",
    imageAlt: "A technical elevation drawing with dimension lines",
  },
};

/** Light text pair used on the trades hero band (≥5:1 on the accent). */
export const TRADES_BAND = { text: "#e8eae6", soft: "#d9e3de" } as const;

/** Design space each template is drawn in, before scaling to the canvas. */
export const DESIGN: Record<SketchLayoutKind, { w: number; h: number }> = {
  desktop: { w: 1024, h: 640 },
  mobile: { w: 512, h: 1108 },
};

export type Rect = readonly [x: number, y: number, w: number, h: number];

/** Layout order = extrusion order in the lamination scene. */
export const BLOCK_ORDER: readonly SketchBlockId[] = [
  "chrome",
  "logo",
  "nav",
  "headline",
  "sub",
  "cta",
  "cta2",
  "image",
  "card1",
  "card2",
  "card3",
  "footer",
];

/**
 * Block geometry in design px. Blocks never overlap, every piece of content is
 * drawn inside its block, and cta/cta2 are the same height so the revision
 * beat can swap them.
 */
export const RECTS: Record<
  SketchSector,
  Record<SketchLayoutKind, Record<SketchBlockId, Rect>>
> = {
  // Boutique: centred two-tier header, type left, tall arch right,
  // details tucked under the buttons.
  salon: {
    desktop: {
      chrome: [0, 0, 1024, 34],
      logo: [312, 50, 400, 40],
      nav: [272, 96, 480, 22],
      headline: [64, 150, 476, 158],
      sub: [64, 318, 420, 50],
      cta: [64, 388, 200, 46],
      cta2: [276, 388, 172, 46],
      image: [588, 148, 372, 446],
      card1: [64, 478, 148, 116],
      card2: [228, 478, 148, 116],
      card3: [392, 478, 148, 116],
      footer: [64, 608, 896, 24],
    },
    mobile: {
      chrome: [0, 0, 512, 56],
      logo: [56, 74, 400, 40],
      nav: [40, 122, 432, 22],
      image: [28, 162, 456, 372],
      headline: [28, 548, 456, 124],
      sub: [28, 680, 456, 46],
      cta: [28, 742, 456, 50],
      cta2: [28, 802, 456, 50],
      card1: [28, 874, 456, 58],
      card2: [28, 934, 456, 58],
      card3: [28, 994, 456, 58],
      footer: [28, 1066, 456, 28],
    },
  },
  // Neighbourhood café: big top-down table photo on the left,
  // name on the right, details as a menu-board list.
  cafe: {
    desktop: {
      chrome: [0, 0, 1024, 34],
      logo: [64, 50, 380, 40],
      nav: [560, 54, 400, 32],
      image: [64, 122, 456, 472],
      headline: [560, 128, 400, 168],
      sub: [560, 306, 380, 48],
      cta: [560, 370, 172, 46],
      cta2: [744, 370, 128, 46],
      card1: [560, 446, 400, 48],
      card2: [560, 496, 400, 48],
      card3: [560, 546, 400, 48],
      footer: [64, 608, 896, 24],
    },
    mobile: {
      chrome: [0, 0, 512, 56],
      logo: [28, 72, 300, 42],
      nav: [340, 76, 144, 34],
      image: [0, 126, 512, 424],
      headline: [28, 570, 456, 124],
      sub: [28, 702, 456, 46],
      cta: [28, 764, 222, 50],
      cta2: [262, 764, 222, 50],
      card1: [28, 840, 456, 70],
      card2: [28, 912, 456, 70],
      card3: [28, 984, 456, 70],
      footer: [28, 1066, 456, 28],
    },
  },
  // Creative studio: oversized name, intro and buttons in a narrow right
  // column, a gallery wall across the page, numbered index underneath.
  studio: {
    desktop: {
      chrome: [0, 0, 1024, 34],
      logo: [64, 52, 360, 30],
      nav: [600, 54, 360, 26],
      headline: [64, 92, 604, 200],
      sub: [712, 168, 248, 48],
      cta: [712, 234, 120, 42],
      cta2: [840, 234, 120, 42],
      image: [64, 308, 896, 222],
      card1: [64, 542, 288, 56],
      card2: [368, 542, 288, 56],
      card3: [672, 542, 288, 56],
      footer: [64, 608, 896, 24],
    },
    mobile: {
      chrome: [0, 0, 512, 56],
      logo: [28, 76, 300, 32],
      nav: [340, 76, 144, 32],
      headline: [28, 126, 456, 196],
      sub: [28, 334, 400, 46],
      cta: [28, 396, 222, 48],
      cta2: [262, 396, 222, 48],
      image: [0, 466, 512, 368],
      card1: [28, 852, 456, 64],
      card2: [28, 920, 456, 64],
      card3: [28, 988, 456, 64],
      footer: [28, 1066, 456, 28],
    },
  },
  // Trades: sturdy header with a monogram, a deep green hero band with a
  // technical drawing, service tiles below.
  trades: {
    desktop: {
      chrome: [0, 0, 1024, 34],
      logo: [64, 48, 380, 40],
      nav: [540, 52, 420, 32],
      headline: [64, 126, 480, 162],
      sub: [64, 298, 420, 48],
      cta: [64, 366, 164, 46],
      cta2: [240, 366, 156, 46],
      image: [588, 124, 372, 304],
      card1: [64, 478, 288, 116],
      card2: [368, 478, 288, 116],
      card3: [672, 478, 288, 116],
      footer: [64, 608, 896, 24],
    },
    mobile: {
      chrome: [0, 0, 512, 56],
      logo: [28, 72, 300, 42],
      nav: [340, 76, 144, 34],
      headline: [28, 152, 456, 124],
      sub: [28, 282, 456, 46],
      cta: [28, 344, 456, 50],
      cta2: [28, 402, 456, 50],
      image: [28, 476, 456, 254],
      card1: [28, 780, 456, 88],
      card2: [28, 874, 456, 88],
      card3: [28, 968, 456, 88],
      footer: [28, 1068, 456, 28],
    },
  },
};

/** Trades hero band (background, not a block), in design px: [y, h]. */
export const TRADES_BAND_Y: Record<SketchLayoutKind, readonly [number, number]> = {
  desktop: [104, 348],
  mobile: [124, 628],
};

export const BLOCK_META: Record<
  SketchBlockId,
  { role: string; depth: number; isText: boolean; isImage: boolean; hoverLabel: string }
> = {
  headline: { role: "Headline", depth: 0.14, isText: true, isImage: false, hoverLabel: "Headline · tallest — it matters most" },
  image: { role: "Photo", depth: 0.1, isText: false, isImage: true, hoverLabel: "Photo · it sells the feeling" },
  cta: { role: "Primary button", depth: 0.06, isText: true, isImage: false, hoverLabel: "Button · what you want visitors to do" },
  cta2: { role: "Secondary button", depth: 0.05, isText: true, isImage: false, hoverLabel: "Second button · a softer next step" },
  card1: { role: "Detail", depth: 0.05, isText: true, isImage: false, hoverLabel: "Details · what people check before booking" },
  card2: { role: "Detail", depth: 0.05, isText: true, isImage: false, hoverLabel: "Details · what people check before booking" },
  card3: { role: "Detail", depth: 0.05, isText: true, isImage: false, hoverLabel: "Details · what people check before booking" },
  sub: { role: "Subline", depth: 0.04, isText: true, isImage: false, hoverLabel: "Subline · one clear sentence" },
  nav: { role: "Navigation", depth: 0.03, isText: true, isImage: false, hoverLabel: "Navigation · always within reach" },
  logo: { role: "Logo", depth: 0.03, isText: true, isImage: false, hoverLabel: "Logo · your name, set properly" },
  footer: { role: "Footer", depth: 0.02, isText: true, isImage: false, hoverLabel: "Footer · contact and the small print" },
  chrome: { role: "Address bar", depth: 0.01, isText: false, isImage: false, hoverLabel: "Address bar · your own domain" },
};
