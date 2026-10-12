import { Fragment, memo, type CSSProperties } from "react";
import type { CodeLine, TokKind } from "./code";
import s from "./Ownership.module.css";

const TOK: Record<Exclude<TokKind, "x">, string> = {
  p: s.tp,
  t: s.tt,
  a: s.ta,
  s: s.ts,
  n: s.tn,
  c: s.tc,
};

/**
 * Selectable, copyable code. Line numbers come from a pseudo-element, so a
 * copy never picks them up. `wrap` soft-wraps with a hanging indent (phone
 * pane); otherwise long lines run off under a fade, like an editor.
 */
function CodeBlock({ lines, wrap = false }: { lines: CodeLine[]; wrap?: boolean }) {
  return (
    <div
      className={`${s.code} ${wrap ? s.wrap : ""}`}
      role="figure"
      aria-label="Example code for your sketch"
    >
      <pre className={s.pre} style={{ "--span": lines.length + 3 } as CSSProperties}>
        <code>
          {lines.map((ln, i) => (
            <span
              key={i}
              className={s.line}
              data-n={i + 1}
              style={{ "--i": i, "--h": ln.ind + 2 } as CSSProperties}
            >
              {ln.toks.map(([k, v], j) =>
                k === "x" ? (
                  v
                ) : (
                  <Fragment key={j}>
                    {/* Wrap between tags and text, never inside a word. */}
                    {k === "p" && v.startsWith("</") ? <wbr /> : null}
                    <span className={TOK[k]}>{v}</span>
                    {k === "p" && v.endsWith(">") ? <wbr /> : null}
                  </Fragment>
                ),
              )}
              {"\n"}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

export default memo(CodeBlock);
