/**
 * The back of the Ownership card: the visitor's sketch as real markup
 * (sketchToHtml), split into lines and highlight tokens. Pure — safe on the
 * server. Rendered as React text only, never as markup.
 */
import { SECTORS, sketchToHtml } from "@/lib/showcase/sketch";
import type { SketchCopy, SketchSector } from "@/lib/showcase/sketch";

/** p punctuation · t tag name · a attribute · s string · x text · n the visitor's name · c comment */
export type TokKind = "p" | "t" | "a" | "s" | "x" | "n" | "c";
export type Tok = readonly [TokKind, string];
export interface CodeLine {
  /** Leading spaces, for the hanging indent when a line wraps. */
  ind: number;
  toks: Tok[];
}

/** Same escaping sketchToHtml uses, so substitutions line up exactly. */
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const AI_NOTE = "<!-- Copy drafted by Claude. Yours to edit. -->";

/**
 * sketchToHtml, plus the AI copywriter's words when the visitor asked for
 * them (the foundation's sketchToHtml only knows the sector template).
 * Only the hero lines are touched, so a button label that matches a nav
 * label is never swapped by mistake.
 */
export function buildCode(display: string, sector: SketchSector, copy?: SketchCopy): string {
  const html = sketchToHtml(display, sector);
  if (!copy) return html;
  const spec = SECTORS[sector] ?? SECTORS.salon;
  const lines = html.split("\n");
  const from = lines.findIndex((l) => l.includes('class="hero"'));
  if (from < 0) return html;
  let used = false;
  const pairs: [string, string | undefined][] = [
    [spec.sub, copy.sub],
    [spec.cta, copy.cta],
    [spec.cta2, copy.cta2],
  ];
  for (const [was, now] of pairs) {
    if (!now || now === was) continue;
    for (let i = from; i < lines.length; i++) {
      const a = `>${esc(was)}<`;
      if (lines[i].includes(a)) {
        lines[i] = lines[i].replace(a, `>${esc(now)}<`);
        used = true;
        break;
      }
    }
  }
  if (used) lines.splice(from + 1, 0, `    ${AI_NOTE}`);
  return lines.join("\n");
}

// Comment · open/close bracket + tag name · attr="value" · bare attr · tag end · text
const TOKEN_RE = /(<!--.*?-->)|(<\/?)([\w-]+)|(\s+)([\w-]+)(=)("[^"]*")|(\/?>)|([^<]+)/g;

function pushText(out: Tok[], text: string, name: string) {
  if (!name || !text.includes(name)) {
    out.push(["x", text]);
    return;
  }
  const parts = text.split(name);
  parts.forEach((part, i) => {
    if (part) out.push(["x", part]);
    if (i < parts.length - 1) out.push(["n", name]);
  });
}

/** Splits markup into highlighted lines; occurrences of `display` are marked. */
export function tokenize(html: string, display: string): CodeLine[] {
  const name = esc(display.trim());
  return html.split("\n").map((line) => {
    const toks: Tok[] = [];
    let m: RegExpExecArray | null;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(line))) {
      if (m[1]) toks.push(["c", m[1]]);
      else if (m[2]) toks.push(["p", m[2]], ["t", m[3]]);
      else if (m[5]) toks.push(["x", m[4]], ["a", m[5]], ["p", m[6]], ["s", m[7]]);
      else if (m[8]) toks.push(["p", m[8]]);
      else if (m[9]) pushText(toks, m[9], name);
    }
    return { ind: line.length - line.trimStart().length, toks };
  });
}
