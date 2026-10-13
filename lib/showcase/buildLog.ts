/**
 * How THIS page was made — the single source of truth for every number and
 * log line in the "Made by AI" section (components/showcase/MadeByAI.tsx).
 *
 * Everything here is a real fact of this build. Edit numbers here and the
 * section, its counters and its replayed log all follow.
 *
 * Numbers still being tallied are `null`. The section renders them
 * gracefully: totals that are missing a part get a "+" ("at least"), and a
 * log line whose numbers are all missing is simply left out.
 *
 * 🚨 OWNER: the audit lines below are worded as neutral hardening on purpose
 * ("audit fetcher hardened", "analytics wait for consent"). The full truth is
 * sharper — the old site had a request-forgery hole and fired analytics
 * before consent. Say it more plainly only if you are comfortable admitting
 * it in public.
 */

/* ------------------------------------------------------------------ */
/* Owner flags                                                         */
/* ------------------------------------------------------------------ */

export const FLAGS = {
  /**
   * true  → "We build your site the same way." + the speed/QA support line.
   * false → "That's how this page was made." — a claim about this page only.
   * Only switch on once client sites really are built with this pipeline.
   */
  aiStoryClientClaim: false,
};

/* ------------------------------------------------------------------ */
/* Still being tallied — the orchestrator fills these in               */
/* ------------------------------------------------------------------ */

/** Agents used in the sections phase (planned: 12 builders + 1 assembler). */
export const SECTIONS_AGENTS: number | null = 13; // 12 section builders + 1 assembler
/** Wall-clock minutes for the sections phase. */
export const SECTIONS_MINUTES: number | null = 78; // wall clock, 4,653,719 ms
/** Tokens read and written in the sections phase. */
export const SECTIONS_TOKENS: number | null = 4_884_860;
/** Tool calls in the sections phase. */
export const SECTIONS_TOOL_CALLS: number | null = 1_445;
/** Tool calls in the design workflow (not recorded yet). */
export const DESIGN_TOOL_CALLS: number | null = null;

/* ------------------------------------------------------------------ */
/* Known facts                                                         */
/* ------------------------------------------------------------------ */

export const AUDIT = {
  agents: 1,
  filesRead: 27,
  issues: 22,
  critical: 3,
  criticals: [
    "audit fetcher hardened",
    "analytics wait for consent",
    "AI spend capped per day",
  ],
  attackUrlsBlocked: 17,
  attackUrlsTried: 17,
  nextFrom: "16.2.4",
  nextTo: "16.3.8",
} as const;

export const DESIGN = {
  researchers: 4,
  directors: 3,
  judges: 2,
  synthesisers: 1,
  /** researchers + directors + judges + synthesiser */
  agents: 10,
  minutes: 27,
  tokens: 1_100_000,
  toolCalls: DESIGN_TOOL_CALLS,
} as const;

export const FOUNDATION = {
  builders: 4,
  integrators: 1,
  agents: 5,
  minutes: 22,
  tokens: 1_080_000,
  toolCalls: 259,
} as const;

export const SECTIONS = {
  builders: 12,
  assemblers: 1,
  /** The planned structure, used when SECTIONS_AGENTS is still null. */
  plannedAgents: 13,
  agents: SECTIONS_AGENTS,
  minutes: SECTIONS_MINUTES,
  tokens: SECTIONS_TOKENS,
  toolCalls: SECTIONS_TOOL_CALLS,
} as const;

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

/** 1_100_000 → "1.1M", 2_180_000 → "2.18M", 640_000 → "640K". */
export function formatTokens(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m >= 10 ? m.toFixed(1) : +m.toFixed(2)}M`;
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

/* ------------------------------------------------------------------ */
/* The replayed log, phase by phase                                    */
/* ------------------------------------------------------------------ */

export interface LogLine {
  /** Who wrote it — an agent role, "check" or "person". */
  who: string;
  text: string;
  /** Draw it as a warning-coloured line (the three critical findings). */
  tone?: "critical" | "live";
  /** One of the few lines phones show (the full log is on wider screens). */
  key?: boolean;
}

export type PhaseId =
  | "audit"
  | "research"
  | "pitch"
  | "judge"
  | "spec"
  | "foundation"
  | "sections"
  | "check";

export interface Phase {
  id: PhaseId;
  /** Short mono label (graph column header). */
  label: string;
  /** One display line. */
  title: string;
  /** One plain-English sentence for a non-technical reader. */
  sub: string;
  lines: LogLine[];
}

function sectionsNumbersLine(): LogLine | null {
  const parts: string[] = [];
  if (SECTIONS.minutes !== null) parts.push(`~${SECTIONS.minutes} min`);
  if (SECTIONS.tokens !== null) parts.push(`~${formatTokens(SECTIONS.tokens)} tokens`);
  if (SECTIONS.toolCalls !== null) parts.push(`${SECTIONS.toolCalls.toLocaleString("en-GB")} tool calls`);
  return parts.length ? { who: "sections", text: parts.join(" · ") } : null;
}

function designNumbersLine(): LogLine {
  const parts = [
    `${DESIGN.agents} agents`,
    `~${DESIGN.minutes} min`,
    `~${formatTokens(DESIGN.tokens)} tokens`,
  ];
  if (DESIGN.toolCalls !== null) parts.push(`${DESIGN.toolCalls} tool calls`);
  return { who: "design", text: parts.join(" · ") };
}

const sectionsAgentsText =
  SECTIONS.agents !== null && SECTIONS.agents !== SECTIONS.plannedAgents
    ? `${SECTIONS.agents} agents: ${SECTIONS.builders} builders + ${SECTIONS.assemblers} assembler, in parallel`
    : `${SECTIONS.builders} builders + ${SECTIONS.assemblers} assembler, in parallel`;

export const PHASES: Phase[] = [
  {
    id: "audit",
    label: "audit",
    title: "Read every file first.",
    sub: "Before anything new, one agent read the old site’s code. Its critical findings were fixed first.",
    lines: [
      { who: "audit", text: `read all ${AUDIT.filesRead} files` },
      { who: "audit", text: `${AUDIT.issues} issues found · ${AUDIT.critical} critical`, key: true },
      ...AUDIT.criticals.map((text) => ({ who: "critical", text, tone: "critical" as const })),
      {
        who: "security",
        text: `${AUDIT.attackUrlsBlocked} of ${AUDIT.attackUrlsTried} attack URLs now blocked`,
        key: true,
      },
      {
        who: "security",
        text: `Next.js ${AUDIT.nextFrom} → ${AUDIT.nextTo} · latest security patches`,
      },
    ],
  },
  {
    id: "research",
    label: "research",
    title: "Four researchers, at once.",
    sub: "Content, web technology, award-winning sites and motion — researched in parallel.",
    lines: [
      { who: "research:content", text: "listed every real price, fact and site we can stand behind" },
      { who: "research:tech", text: "checked each technique against the installed libraries’ source", key: true },
      { who: "research:awards", text: "studied award-winning sites for references" },
      { who: "research:motion", text: "wrote the motion rules: no ease-in, no bounce without a gesture" },
    ],
  },
  {
    id: "pitch",
    label: "pitch",
    title: "Three directors pitched.",
    sub: "Three AI creative directors each pitched a different homepage.",
    lines: [
      { who: "director:A", text: "pitched “The Making Of”" },
      { who: "director:B", text: "pitched “Light Table”", key: true },
      { who: "director:C", text: "pitched “Your Name, Set in Glass”", key: true },
    ],
  },
  {
    id: "judge",
    label: "judge",
    title: "Two judges disagreed.",
    sub: "One scored impact, one scored engineering. They picked different winners.",
    lines: [
      { who: "judge:impact", text: "chose “Light Table” · the wow lands on screen one", key: true },
      {
        who: "judge:engineering",
        text: "chose “Your Name, Set in Glass” · phones get a lighter version so they stay fast",
        key: true,
      },
      { who: "judge:engineering", text: "measured three.js: 134 KB vanilla vs up to 328 KB with R3F + drei" },
    ],
  },
  {
    id: "spec",
    label: "spec",
    title: "One spec, best of all three.",
    sub: "A synthesiser merged the strongest ideas into a single build plan.",
    lines: [
      { who: "synthesiser", text: "judges split → hybrid: C as the chassis, grafts from A and B", key: true },
      { who: "synthesiser", text: "rule: no scroll pins anywhere — sticky stages instead" },
      designNumbersLine(),
    ],
  },
  {
    id: "foundation",
    label: "foundation",
    title: "The foundation, in parallel.",
    sub: "Four builders made the shared parts; an integrator made sure they fit.",
    lines: [
      {
        who: "foundation",
        text: `${FOUNDATION.builders} builders + ${FOUNDATION.integrators} integrator, in parallel`,
      },
      { who: "foundation", text: "motion core · sketch renderer · 3D stage · section contracts" },
      {
        who: "foundation",
        text: `~${formatTokens(FOUNDATION.tokens)} tokens · ${FOUNDATION.toolCalls.toLocaleString("en-GB")} tool calls · ~${FOUNDATION.minutes} min`,
        key: true,
      },
    ],
  },
  {
    id: "sections",
    label: "sections",
    title: "Every section at once.",
    sub: "Twelve builders worked at once — sections, 3D scenes and the AI copywriter.",
    lines: [
      { who: "sections", text: sectionsAgentsText },
      ...(sectionsNumbersLine() ? [sectionsNumbersLine() as LogLine] : []),
      { who: "builder:made-by-ai", text: "built this section — the one you’re reading", key: true },
    ],
  },
  {
    id: "check",
    label: "check",
    title: "Checked, frame by frame.",
    sub: "Every section was tested in a real browser on desktop, phone and reduced motion.",
    lines: [
      { who: "check", text: "real browser · real GPU · desktop, phone, reduced motion" },
      { who: "check", text: "every section, frame by frame" },
      { who: "person", text: "directed it: humans decide, agents build, both check" },
      { who: "live", text: "getwebpage.co.uk — you’re looking at it", tone: "live", key: true },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Totals and the running meters                                       */
/* ------------------------------------------------------------------ */

export type MeterId = "agents" | "minutes" | "tokens" | "toolCalls";

export interface MeterValue {
  value: number;
  /** True when a part of this total is still unknown → render "+". */
  partial: boolean;
}

export type Meters = Record<MeterId, MeterValue>;

const sectionsAgents = SECTIONS.agents ?? SECTIONS.plannedAgents;

/**
 * Cumulative meters after each phase (index 0 = before anything ran,
 * index 8 = finished). Numbers only appear in the phase where they were
 * actually measured: design numbers land with the spec, foundation numbers
 * with the foundation, section numbers with the sections.
 */
export const METERS_BY_PHASE: Meters[] = (() => {
  const steps: Meters[] = [];
  let agents = 0;
  let minutes = 0;
  let tokens = 0;
  let tools = 0;
  let minutesPartial = false;
  let tokensPartial = false;
  let toolsPartial = false;
  const push = () =>
    steps.push({
      agents: { value: agents, partial: false },
      minutes: { value: minutes, partial: minutesPartial },
      tokens: { value: tokens, partial: tokensPartial },
      toolCalls: { value: tools, partial: toolsPartial },
    });

  push(); // 0 — nothing yet
  agents += AUDIT.agents;
  push(); // 1 audit
  agents += DESIGN.researchers;
  push(); // 2 research
  agents += DESIGN.directors;
  push(); // 3 pitch
  agents += DESIGN.judges;
  push(); // 4 judge
  agents += DESIGN.synthesisers;
  minutes += DESIGN.minutes;
  tokens += DESIGN.tokens;
  if (DESIGN.toolCalls !== null) tools += DESIGN.toolCalls;
  else toolsPartial = true;
  push(); // 5 spec — design workflow done
  agents += FOUNDATION.agents;
  minutes += FOUNDATION.minutes;
  tokens += FOUNDATION.tokens;
  tools += FOUNDATION.toolCalls;
  push(); // 6 foundation
  agents += sectionsAgents;
  if (SECTIONS.minutes !== null) minutes += SECTIONS.minutes;
  else minutesPartial = true;
  if (SECTIONS.tokens !== null) tokens += SECTIONS.tokens;
  else tokensPartial = true;
  if (SECTIONS.toolCalls !== null) tools += SECTIONS.toolCalls;
  else toolsPartial = true;
  push(); // 7 sections
  push(); // 8 check — no new agents: builders check their own work
  return steps;
})();

export const TOTALS: Meters = METERS_BY_PHASE[METERS_BY_PHASE.length - 1];

const known = (parts: [string, boolean][]) =>
  parts.filter(([, ok]) => ok).map(([name]) => name);

function joinScope(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} + ${names[names.length - 1]}`;
}

/** Labels and honest scope notes for the four meters. */
export const METER_COPY: Record<MeterId, { label: string; scope: string }> = {
  agents: {
    label: "AI agents",
    scope: "audit to sections",
  },
  minutes: {
    label: "minutes on the clock",
    scope: `approx. · ${joinScope(
      known([
        ["design", true],
        ["foundation", true],
        ["sections", SECTIONS.minutes !== null],
      ]),
    )}`,
  },
  tokens: {
    label: "tokens read and written",
    scope: `approx. · ${joinScope(
      known([
        ["design", true],
        ["foundation", true],
        ["sections", SECTIONS.tokens !== null],
      ]),
    )}`,
  },
  toolCalls: {
    label: "tool calls",
    scope: `logged · ${joinScope(
      known([
        ["design", DESIGN.toolCalls !== null],
        ["foundation", true],
        ["sections", SECTIONS.toolCalls !== null],
      ]),
    )}`,
  },
};

/** Format a meter value for display. */
export function formatMeter(id: MeterId, value: number): string {
  if (id === "tokens") {
    if (value <= 0) return "0";
    return formatTokens(value);
  }
  return Math.round(value).toLocaleString("en-GB");
}

/** The closing line and the honest claim beneath it. */
export const CLOSING = {
  line: ["Directed by a person.", "Built by agents.", "Checked by both."],
  claim: FLAGS.aiStoryClientClaim
    ? "We build your site the same way."
    : "That’s how this page was made.",
  /** Speaks about client builds, so it only shows once the flag is on. */
  support: FLAGS.aiStoryClientClaim
    ? "Agents work in parallel, so it’s fast. Every frame gets checked, so it holds up."
    : "",
} as const;
