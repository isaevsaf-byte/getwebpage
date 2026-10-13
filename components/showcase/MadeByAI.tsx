"use client";

import { useRef, type MouseEvent } from "react";
import Reveal from "@/components/motion/Reveal";
import RevealHeading from "@/components/motion/RevealHeading";
import { useScrollTo } from "@/components/motion/SmoothScroll";
import { track } from "@/lib/showcase/analytics";
import { SITE_FACTS } from "@/lib/showcase/content";
import {
  CLOSING,
  FLAGS,
  METER_COPY,
  PHASES,
  TOTALS,
  formatMeter,
  type MeterId,
} from "@/lib/showcase/buildLog";
import Graph from "./made-by-ai/Graph";
import MiniFan from "./made-by-ai/MiniFan";
import { useMadeByAIMotion } from "./made-by-ai/useMadeByAIMotion";
import s from "./made-by-ai/MadeByAI.module.css";

const METER_ORDER: MeterId[] = ["agents", "minutes", "tokens", "toolCalls"];
const pad = (n: number) => String(n).padStart(2, "0");
const TOTAL_PHASES = pad(PHASES.length);

/**
 * "Made by AI" — the new-era proof. How THIS page was built, replayed from
 * the real log: an agent graph that assembles as you scroll, a typed ledger
 * and running meters. Every number comes from lib/showcase/buildLog.ts.
 *
 * Modes (CSS decides from first paint, JS only adds motion):
 * - scene: desktop, fine pointer, motion allowed → sticky stage, scrubbed
 *   graph, replayed ledger, meters that run with the build.
 * - flow: phones, tablets, touch desktops, reduced motion and no-JS →
 *   a vertical graph (a spine and one small fan per phase), the same
 *   story, lighter.
 */
export default function MadeByAI() {
  const root = useRef<HTMLElement>(null);
  const scrollTo = useScrollTo();
  useMadeByAIMotion(root);

  const onCta = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    track("pricing_from_ai");
    scrollTo("#pricing");
  };

  return (
    <section
      id="made-by-ai"
      data-ground="ink"
      className={s.section}
      aria-labelledby="made-by-ai-title"
      ref={root}
    >
      <div className={s.intro}>
        <p className={s.kicker}>How this page was made</p>
        <RevealHeading id="made-by-ai-title" className={s.h2}>
          This page was built by a team of AI agents.
        </RevealHeading>
        <Reveal className={s.lead}>
          <p>
            Not a template. {TOTALS.agents.value} AI agents read the old code, researched,
            pitched, judged, built and tested it. One person directed them. Below, the
            build replayed step by step — every number in it is real.
          </p>
        </Reveal>
      </div>

      <div className={s.scene} data-scene="">
        <div className={s.stage} data-stage="">
          <div className={s.glow} data-glow="" aria-hidden="true" />

          {/* Scene mode: the active phase, big. Decorative duplicate of the list below. */}
          <div className={s.head} aria-hidden="true">
            {PHASES.map((p, i) => (
              <div key={p.id} className={s.headItem} data-head-item={i + 1}>
                <p className={s.headNum}>
                  <span className={s.headIdx}>{pad(i + 1)}</span> / {TOTAL_PHASES} · {p.label}
                </p>
                <p className={s.headTitle}>{p.title}</p>
                <p className={s.headSub}>{p.sub}</p>
              </div>
            ))}
          </div>

          <div className={s.graphCell}>
            <Graph />
          </div>

          {/* Scene mode: the replayed ledger. Decorative — the same lines are in the list. */}
          <div className={s.log} aria-hidden="true">
            <div className={s.logBar}>
              <span className={s.logDots}>
                <i />
                <i />
                <i />
              </span>
              <span className={s.logName}>build.log</span>
              <span className={s.logState} data-log-state="">replay</span>
            </div>
            <div className={s.logScroll} data-log-scroll="">
              <div className={s.logList} data-log-list="">
                <p className={s.logPrompt} data-log-prompt="">
                  $ replay build --facts-only
                </p>
                {PHASES.map((p, i) => (
                  <div key={p.id} className={s.logPhase} data-log-phase={i + 1}>
                    <p className={s.logSep}>
                      ── {pad(i + 1)} {p.label}
                    </p>
                    {p.lines.map((l, j) => (
                      <p key={j} className={s.entry} data-tone={l.tone} data-entry="">
                        <span className={s.who}>{l.who}</span>
                        <span className={s.msg} data-msg="">
                          {l.text}
                        </span>
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* The story itself: visible timeline in flow mode, screen-reader list in scene mode. */}
          <div className={s.timeline} data-timeline="">
            <span className={s.spine} aria-hidden="true">
              <span className={s.spineLit} data-spine="" />
              <span className={s.spineHead} data-spine-head="" />
            </span>
            <ol className={s.phases}>
              {PHASES.map((p, i) => (
                <li key={p.id} className={s.phase} data-phase-row={i + 1}>
                  <span className={s.railNode} aria-hidden="true" />
                  <div className={s.phaseHead}>
                    <p className={s.phaseNum} aria-hidden="true">
                      {pad(i + 1)} · {p.label}
                    </p>
                    <h3 className={s.phaseTitle}>{p.title}</h3>
                    <p className={s.phaseSub}>{p.sub}</p>
                    <MiniFan phase={i + 1} />
                  </div>
                  <ul className={s.lines}>
                    {p.lines.map((l, j) => (
                      <li key={j} className={s.line} data-tone={l.tone} data-key={l.key ? "" : undefined}>
                        <span className={s.srOnly}>
                          {l.who}: {l.text}
                        </span>
                        <span className={s.lineVis} aria-hidden="true">
                          <span className={s.who}>{l.who}</span>
                          <span className={s.msg} data-msg="">
                            {l.text}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>

          <dl className={s.meters} data-meters="">
            {METER_ORDER.map((id) => (
              <div key={id} className={s.meter} data-meter={id}>
                <dt className={s.meterLabel}>{METER_COPY[id].label}</dt>
                <dd className={s.meterValue}>
                  {/* The running number is decoration; the final figure is what is read out. */}
                  <span aria-hidden="true">
                    <span data-meter-num="">{formatMeter(id, TOTALS[id].value)}</span>
                    <span className={s.meterPlus} data-meter-plus="" hidden={!TOTALS[id].partial}>
                      +
                    </span>
                  </span>
                  <span className={s.srOnly}>
                    {TOTALS[id].partial ? "at least " : ""}
                    {formatMeter(id, TOTALS[id].value)}
                  </span>
                </dd>
                <dd className={s.meterScope}>{METER_COPY[id].scope}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className={s.outro}>
        <p className={s.closing} data-closing="">
          {CLOSING.line.map((line, i) => (
            <span key={line} className={s.closeMask}>
              <span className={s.closeLine} data-close-line="" data-last={i === CLOSING.line.length - 1 ? "" : undefined}>
                {line}
              </span>
            </span>
          ))}
        </p>
        <Reveal className={s.outroBody} selector="[data-reveal]" stagger={0.06}>
          <p className={s.claim} data-reveal="">
            <strong>{CLOSING.claim}</strong>
            {CLOSING.support ? ` ${CLOSING.support}` : null}
          </p>
          <div data-reveal="">
            <a href="#pricing" className={s.cta} onClick={onCta}>
              {FLAGS.aiStoryClientClaim
                ? `Get yours — from ${SITE_FACTS.priceFrom}`
                : "See what a site costs"}
              <span className={s.ctaArrow} aria-hidden="true">
                ↓
              </span>
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
