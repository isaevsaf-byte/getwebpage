"use client";

import { useRef } from "react";
import CssPane from "@/components/showcase/primitives/CssPane";
import { useReaderScan } from "./useReaderScan";
import s from "./AuditBand.module.css";

/**
 * "What Claude reads": a generic small-business page in a CSS browser pane.
 * The X-ray band shows the HTML underneath — exactly the fields /api/audit
 * hands to Claude (title, meta description, viewport, canonical, og:title,
 * h1, h2s, images without alt, forms, page text). The red-pen notes are the
 * questions the audit prompt asks, phrased as questions, never as findings.
 *
 * Illustration only: nothing is fetched. The address bar echoes what the
 * visitor types into the field next to it.
 */

/** Wireframe blocks: [left, top, width, height] in % of the screen, plus a tone. */
type Block = [number, number, number, number, keyof typeof TONE];
const TONE = { h: s.tH, m: s.tM, l: s.tL, card: s.tCard, foot: s.tFoot } as const;
const BLOCKS: Block[] = [
  [4.5, 4, 12, 4.6, "m"], // logo
  [60, 5.6, 5.5, 1.4, "l"], // menu
  [68, 5.6, 5.5, 1.4, "l"],
  [76, 5.6, 5.5, 1.4, "l"],
  [84, 5.6, 5.5, 1.4, "l"],
  [5, 19, 41, 6.2, "h"], // h1
  [5, 27.5, 29, 6.2, "h"],
  [5, 38.5, 38, 2, "l"], // sub
  [5, 42.5, 31, 2, "l"],
  [5, 50, 15, 7.5, "h"], // call to action
  [5, 67, 28, 18, "card"], // reviews
  [36, 67, 28, 18, "card"],
  [67, 67, 28, 18, "card"],
  [0, 91, 100, 9, "foot"], // footer
  [5, 94.6, 17, 1.8, "m"], // phone
];

/**
 * Red-pen marks in a 160×100 viewBox (the screen is 16:10, so units match
 * the % grid ×1.6). `y` (0–100) is when the scan reaches the mark.
 */
const MARKS: { y: number; d: string; note: string; at: [number, number] }[] = [
  {
    y: 4,
    note: "title & meta?",
    at: [20.5, 3.4],
    d: "M30.6 10.2C28.2 7.4 28.6 3.6 32.6 1.2M30.2 1.1L32.6 1.2L32.4 3.6",
  },
  {
    y: 22,
    note: "clear h1?",
    at: [33, 9.2],
    d: "M70 17.2C52 13.4 18 14 7.4 20.6C-0.6 25.8 4 34.6 22 36.6C42 38.8 70 37.6 78.4 30.6C84 25.6 77.4 18.4 61 16.2",
  },
  {
    y: 56,
    note: "next step?",
    at: [22.5, 51.2],
    d: "M6.6 60.8C14 59.8 24 60 34.2 60.4M9 63C17 62.4 25 62.5 31.6 62.8",
  },
  {
    y: 34,
    note: "alt text?",
    at: [80.5, 61.4],
    d: "M81.6 21.4V15.4H87.8M147.4 15.4H153.6V21.4M153.6 54.6V60.6H147.4M87.8 60.6H81.6V54.6",
  },
  {
    y: 93,
    note: "phone?",
    at: [25.5, 92.2],
    d: "M33 92.4C24 90.9 8 91.6 5.6 94.6C3.8 97.4 14 99.4 25 98.9C34 98.4 40 96.6 37.5 94.2C36 92.8 32 92.1 27.5 92.2",
  },
];

/** What Claude is handed, top to bottom. `|n|` is a redacted value n characters wide. */
const CODE = [
  "<title>|10|</title>",
  '<meta name="description" content="|9|">',
  '<meta name="viewport" content="|6|">',
  '<link rel="canonical" href="|7|">',
  '<meta property="og:title" content="|5|">',
  "<h1>|14|</h1>",
  "<h2>|8|</h2> <h2>|6|</h2>",
  '<img src="|5|" alt="">',
  '<form action="|5|"> … </form>',
  "<p>|18|</p>",
  "<p>|12|</p>",
  '<a href="tel:|8|">',
];

function CodeLine({ line, n }: { line: string; n: number }) {
  const parts = line.split(/\|(\d+)\|/);
  return (
    <span className={s.line}>
      <i className={s.ln}>{String(n).padStart(2, "0")}</i>
      {parts.map((p, i) =>
        i % 2 ? (
          <b key={i} className={s.bar} style={{ width: `${p}ch` }} />
        ) : (
          p
        ),
      )}
    </span>
  );
}

type Props = {
  /** What the address bar shows. */
  domain: string;
  /** A valid host typed by the visitor, or null. Re-runs the scan when it changes. */
  host: string | null;
  className?: string;
};

export default function ReaderPane({ domain, host, className }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  useReaderScan(rootRef, stageRef, host);

  return (
    <figure ref={rootRef} className={`${s.reader} ${className ?? ""}`}>
      <div aria-hidden="true">
        <CssPane domain={domain} secure tone="paper" label="Claude">
          <div ref={stageRef} className={s.stage}>
            {BLOCKS.map(([l, t, w, h, tone], i) => (
              <span
                key={i}
                className={`${s.block} ${TONE[tone]}`}
                style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%` }}
              />
            ))}
            <span className={s.img}>
              <i className={s.sun} />
              <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 100V72L22 44L40 64L62 30L100 78V100Z" />
              </svg>
            </span>

            <svg className={s.marks} viewBox="0 0 160 100">
              {MARKS.map((m) => (
                <path key={m.note} data-mark data-y={m.y} d={m.d} />
              ))}
            </svg>
            {MARKS.map((m) => (
              <span
                key={m.note}
                data-note
                className={s.pen}
                style={{ left: `${m.at[0]}%`, top: `${m.at[1]}%` }}
              >
                {m.note}
              </span>
            ))}

            <div data-band className={s.band}>
              <div data-code className={s.code}>
                {CODE.map((line, i) => (
                  <CodeLine key={i} line={line} n={i + 1} />
                ))}
              </div>
            </div>
            <i data-beam className={s.beam} />
          </div>
        </CssPane>
      </div>
      <figcaption className={s.caption}>
        {host
          ? `Claude will read ${host}: your page's code and text — what Google reads first.`
          : "Claude reads your page's code and text — what Google reads first."}
      </figcaption>
    </figure>
  );
}
