/**
 * The sketch as real, readable markup — shown on the back of the Ownership
 * flip card. Pure — safe on the server.
 */
import { SECTORS } from "./templates";
import type { SketchSector } from "./types";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugPath(label: string): string {
  const s = label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `/${s || "page"}`;
}

/** Where each sector's two hero buttons point. */
const HREFS: Record<SketchSector, readonly [string, string]> = {
  salon: ["/book", "/treatments"],
  cafe: ["/menu", "/visit"],
  studio: ["/work", "/contact"],
  trades: ["/quote", "/projects"],
};

/**
 * About 18 prettified lines of semantic HTML for the given name and sector.
 * The name is HTML-escaped (so '&' reads '&amp;', as it would in source).
 * Render it as text (e.g. inside <pre><code>), never as markup.
 */
export function sketchToHtml(display: string, sector: SketchSector): string {
  const spec = SECTORS[sector] ?? SECTORS.salon;
  const name = esc(display.trim() || "your business");
  const [n1, n2, n3, n4] = spec.nav;
  const [ctaHref, cta2Href] = HREFS[spec.id];
  const lines = [
    `<header class="site-header">`,
    `  <a class="logo" href="/">${name}</a>`,
    `  <nav aria-label="Main">`,
    `    <a href="${slugPath(n1)}">${esc(n1)}</a>`,
    `    <a href="${slugPath(n2)}">${esc(n2)}</a>`,
    `    <a href="${slugPath(n3)}">${esc(n3)}</a>`,
    `    <a class="nav-cta" href="${slugPath(n4)}">${esc(n4)}</a>`,
    `  </nav>`,
    `</header>`,
    `<main>`,
    `  <section class="hero">`,
    `    <h1>${name}</h1>`,
    `    <p>${esc(spec.sub)}</p>`,
    `    <a class="button" href="${ctaHref}">${esc(spec.cta)}</a>`,
    `    <a class="link" href="${cta2Href}">${esc(spec.cta2)}</a>`,
    `    <img src="/hero.webp" alt="${esc(spec.imageAlt)}">`,
    `  </section>`,
    `</main>`,
    `<footer>© ${name}</footer>`,
  ];
  return lines.join("\n");
}
