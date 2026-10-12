/**
 * Shared types for the sketch renderer. Pure — safe to import on the server.
 *
 * SketchSector is declared here on purpose (not imported from the visitor
 * store) so the renderer has no runtime dependency on it. It is structurally
 * identical to visitor.ts's `Sector`, so the two are interchangeable.
 */

export type SketchSector = "salon" | "cafe" | "studio" | "trades";

/** 0 brief, 1 wireframe, 2 type, 3 colour + imagery, 4 live. */
export type SketchStage = 0 | 1 | 2 | 3 | 4;

export type SketchLayoutKind = "desktop" | "mobile";

export type SketchBlockId =
  | "nav"
  | "logo"
  | "headline"
  | "sub"
  | "cta"
  | "cta2"
  | "image"
  | "card1"
  | "card2"
  | "card3"
  | "footer"
  | "chrome";

export interface SketchBlock {
  id: SketchBlockId;
  role: string;
  /** Normalised 0..1 of the whole sketch canvas (chrome included). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Extrusion depth used by the lamination scene (sketch-width units). */
  depth: number;
  isText: boolean;
  isImage: boolean;
  hoverLabel: string;
}

export interface SketchInput {
  /** Sanitised name (may be empty). */
  name: string;
  /** What to print: the name, or 'your business'. */
  display: string;
  /** e.g. 'bellahair.co.uk' */
  domain: string;
  sector: SketchSector;
  stage: SketchStage;
  layout: SketchLayoutKind;
  /**
   * 0..1. Stage 0: how much of the brief is typed. Stage 4: how much of the
   * domain is typed in the address bar. Omitted = fully typed.
   */
  progress?: number;
  /**
   * Optional copy written for this visitor (e.g. by the AI copywriter). Any
   * field left out falls back to the sector template. Plain text only.
   */
  copy?: SketchCopy;
}

export interface SketchCopy {
  sub?: string;
  cta?: string;
  cta2?: string;
  cards?: readonly [SectorCard, SectorCard, SectorCard];
}

export interface SectorPalette {
  bg: string;
  ink: string;
  /** Secondary text, ≥4.5:1 on bg and on tone1. */
  muted: string;
  accent: string;
  /** Text on accent fills. */
  onAccent: string;
  tone1: string;
  tone2: string;
  /** Hairline rules (decorative, not text). */
  rule: string;
}

export interface SectorCard {
  title: string;
  body: string;
}

export interface SectorSpec {
  id: SketchSector;
  /** Chip label, also used in the brief ('Type: …'). */
  label: string;
  palette: SectorPalette;
  nav: readonly [string, string, string, string];
  sub: string;
  cta: string;
  cta2: string;
  cards: readonly [SectorCard, SectorCard, SectorCard];
  footerLinks: readonly [string, string];
  /** Procedural imagery used at stages 3–4. */
  image: "ellipses" | "cups" | "frames" | "blueprint";
  /** Plain-words description of the image (alt text in sketchToHtml). */
  imageAlt: string;
}
