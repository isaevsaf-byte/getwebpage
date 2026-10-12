/**
 * Geometry of the agent graph, in one fixed viewBox (VB_W × VB_H).
 *
 * The shape is the real structure of this build, left to right:
 *   audit 1 → research 4 → pitch 3 → judge 2 → spec 1
 *   → foundation 4 → integrator → sections 12 → assembler
 *   → 3 checks (desktop, phone, reduced motion) → this page
 * plus one person above it all, with a dashed line down to the moments
 * a human steps in (the brief, the spec, the checks, the launch).
 *
 * Counts come from lib/showcase/buildLog.ts so the picture and the numbers
 * can never disagree.
 */
import { AUDIT, DESIGN, FOUNDATION, SECTIONS } from "@/lib/showcase/buildLog";

export const VB_W = 1200;
export const VB_H = 640;
const CY = 360;

export type NodeKind = "anchor" | "agent" | "small" | "gate" | "live" | "person";

export interface GraphNode {
  id: string;
  /** 1..8 = PHASES index + 1. 0 = the person (always there). */
  phase: number;
  x: number;
  y: number;
  kind: NodeKind;
  /** Visual radius used for edge endpoints and ping rings. */
  r: number;
  /** Short label shown while its phase is the active one. */
  label?: string;
  /** Who this is, shown on hover (fine pointers). */
  role: string;
  /** Which side of the node the label sits. */
  labelSide?: "right" | "left" | "below" | "above" | "aboveRight";
  /** Keep the label visible after its phase has passed. */
  sticky?: boolean;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  /** The phase that draws it (the target node's phase). */
  phase: number;
  /** 0 = first wave inside the phase, 1 = second wave. */
  wave: 0 | 1;
  d: string;
}

export interface ColumnHeader {
  phase: number;
  x: number;
  text: string;
  count?: string;
}

const RADIUS: Record<NodeKind, number> = {
  anchor: 9,
  agent: 6.5,
  small: 4.5,
  gate: 7,
  live: 20,
  person: 8,
};

function spread(n: number, gap: number): number[] {
  return Array.from({ length: n }, (_, i) => CY + (i - (n - 1) / 2) * gap);
}

const nodes: GraphNode[] = [];
const add = (n: Omit<GraphNode, "r"> & { r?: number }) => {
  const node = { ...n, r: n.r ?? RADIUS[n.kind] };
  nodes.push(node);
  return node;
};

/* Person — above the flow, at the start. */
add({ id: "person", phase: 0, x: 52, y: 90, kind: "person", role: "a person · sets the brief, signs off", label: "1 person · directs", labelSide: "aboveRight", sticky: true });

/* 1 · audit */
add({ id: "audit", phase: 1, x: 132, y: CY, kind: "anchor", role: "audit agent · read the old code", label: `${AUDIT.filesRead} files · ${AUDIT.issues} issues`, labelSide: "below" });

/* 2 · research */
const researchLabels = ["content", "web tech", "award sites", "motion"];
spread(DESIGN.researchers, 108).forEach((y, i) =>
  add({ id: `research-${i}`, phase: 2, x: 258, y, kind: "agent", role: `researcher · ${researchLabels[i]}`, label: researchLabels[i], labelSide: "right" }),
);

/* 3 · pitch */
const pitchLabels = ["A · The Making Of", "B · Light Table", "C · Your Name, Set in Glass"];
spread(DESIGN.directors, 128).forEach((y, i) =>
  add({ id: `pitch-${i}`, phase: 3, x: 378, y, kind: "agent", role: `creative director · ${pitchLabels[i]}`, label: pitchLabels[i], labelSide: "right" }),
);

/* 4 · judge */
const judgeLabels = ["impact → B", "engineering → C"];
spread(DESIGN.judges, 150).forEach((y, i) =>
  add({ id: `judge-${i}`, phase: 4, x: 488, y, kind: "agent", role: `judge · ${judgeLabels[i]}`, label: judgeLabels[i], labelSide: "right" }),
);

/* 5 · spec */
add({ id: "spec", phase: 5, x: 590, y: CY, kind: "anchor", role: "synthesiser · wrote the build spec", label: "hybrid spec", labelSide: "below" });

/* 6 · foundation: builders → integrator */
spread(FOUNDATION.builders, 100).forEach((y, i) =>
  add({ id: `found-${i}`, phase: 6, x: 688, y, kind: "agent", role: "foundation builder" }),
);
add({ id: "integrator", phase: 6, x: 772, y: CY, kind: "anchor", role: "integrator · made the parts fit", label: "integrator", labelSide: "below" });

/* 7 · sections: builders → assembler. Builder #4 built this section. */
const THIS_ONE = 3;
spread(SECTIONS.builders, 40).forEach((y, i) =>
  add({
    id: `sect-${i}`,
    phase: 7,
    x: 876,
    y,
    kind: "small",
    role: i === THIS_ONE ? "section builder · this section" : "section builder",
    label: i === THIS_ONE ? "this section" : undefined,
    labelSide: "left",
    sticky: i === THIS_ONE,
  }),
);
add({ id: "assembler", phase: 7, x: 964, y: CY, kind: "anchor", role: "assembler · put the page together", label: "assembler", labelSide: "below" });

/* 8 · check → live */
const gateLabels = ["desktop", "phone", "reduced motion"];
spread(3, 82).forEach((y, i) =>
  add({ id: `gate-${i}`, phase: 8, x: 1052, y, kind: "gate", role: `check · ${gateLabels[i]}`, label: gateLabels[i], labelSide: i === 2 ? "below" : "above" }),
);
add({ id: "live", phase: 8, x: 1142, y: CY, kind: "live", role: "this page · live", label: "this page", labelSide: "below", sticky: true });

export const NODES: GraphNode[] = nodes;
export const NODE_BY_ID: Record<string, GraphNode> = Object.fromEntries(nodes.map((n) => [n.id, n]));

/** Horizontal-tangent S-curve from the right edge of a to the left edge of b. */
function curve(a: GraphNode, b: GraphNode): string {
  const x1 = a.x + a.r + 2;
  const x2 = b.x - b.r - 2;
  const mx = (x2 - x1) * 0.5;
  const f = (v: number) => Math.round(v * 10) / 10;
  return `M${f(x1)} ${f(a.y)}C${f(x1 + mx)} ${f(a.y)} ${f(x2 - mx)} ${f(b.y)} ${f(x2)} ${f(b.y)}`;
}

const edges: GraphEdge[] = [];
function link(fromIds: string[], toIds: string[], phase: number, wave: 0 | 1 = 0) {
  for (const f of fromIds) {
    for (const t of toIds) {
      edges.push({ id: `${f}>${t}`, from: f, to: t, phase, wave, d: curve(NODE_BY_ID[f], NODE_BY_ID[t]) });
    }
  }
}
const ids = (prefix: string) => nodes.filter((n) => n.id.startsWith(prefix)).map((n) => n.id);

link(["audit"], ids("research-"), 2);
link(ids("research-"), ids("pitch-"), 3);
link(ids("pitch-"), ids("judge-"), 4);
link(ids("judge-"), ["spec"], 5);
link(["spec"], ids("found-"), 6, 0);
link(ids("found-"), ["integrator"], 6, 1);
link(["integrator"], ids("sect-"), 7, 0);
link(ids("sect-"), ["assembler"], 7, 1);
link(["assembler"], ids("gate-"), 8, 0);
link(ids("gate-"), ["live"], 8, 1);

export const EDGES: GraphEdge[] = edges;

/* The oversight line: one dashed bus from the person, with drops to the
   moments a human steps in. Drawn progressively across the whole story. */
const BUS_Y = 90;
const person = NODE_BY_ID.person;
const live = NODE_BY_ID.live;
export const BUS_D = `M${person.x + person.r + 4} ${BUS_Y}H${live.x}`;

export interface Drop {
  id: string;
  phase: number;
  d: string;
}
const drop = (id: string, phase: number): Drop => {
  const n = NODE_BY_ID[id];
  return { id, phase, d: `M${n.x} ${BUS_Y}V${n.y - n.r - (n.kind === "live" ? 0 : 6)}` };
};
export const DROPS: Drop[] = [
  drop("audit", 1), // the brief
  drop("spec", 5), // a person signs off the plan
  drop("live", 8), // a person checks the result and launches it
];

export const HEADERS: ColumnHeader[] = [
  { phase: 1, x: 132, text: "audit", count: `×${AUDIT.agents}` },
  { phase: 2, x: 258, text: "research", count: `×${DESIGN.researchers}` },
  { phase: 3, x: 378, text: "pitch", count: `×${DESIGN.directors}` },
  { phase: 4, x: 488, text: "judge", count: `×${DESIGN.judges}` },
  { phase: 5, x: 590, text: "spec", count: `×${DESIGN.synthesisers}` },
  { phase: 6, x: 730, text: "foundation", count: `×${FOUNDATION.agents}` },
  {
    phase: 7,
    x: 920,
    text: "sections",
    count: `×${SECTIONS.agents ?? SECTIONS.plannedAgents}`,
  },
  { phase: 8, x: 1052, text: "check" },
  { phase: 8, x: 1142, text: "live" },
];

export const HEADER_Y = 24;
export const BUS = { y: BUS_Y };

/** Agents per phase, for the mobile dot clusters. */
export function nodesForPhase(phase: number): GraphNode[] {
  return nodes.filter((n) => n.phase === phase);
}

/* ------------------------------------------------------------------ */
/* Mini fans — the vertical graph on phones                             */
/* ------------------------------------------------------------------ */

export const FAN_W = 320;
const FAN_ROW = 38;
const FAN_TOP = 8;

export interface FanNode {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  /** 0 = the row feeding in (already built), 1 and 2 = built in this phase. */
  row: 0 | 1 | 2;
}

export interface FanEdge {
  id: string;
  d: string;
  row: 1 | 2;
  dashed?: boolean;
}

export interface Fan {
  h: number;
  nodes: FanNode[];
  edges: FanEdge[];
}

function fanRow(ids: string[], row: 0 | 1 | 2): FanNode[] {
  const n = ids.length;
  const gap = n > 1 ? Math.min(30, (FAN_W - 40) / (n - 1)) : 0;
  const x0 = FAN_W / 2 - ((n - 1) * gap) / 2;
  return ids.map((id, i) => ({
    id,
    kind: NODE_BY_ID[id].kind,
    x: Math.round((x0 + i * gap) * 10) / 10,
    y: FAN_TOP + row * FAN_ROW,
    row,
  }));
}

/**
 * One phase as a small top-to-bottom fan: the row that fed it (dim), then
 * what this phase built — e.g. 1 → 4, 4 → 3, 1 → 12 → 1. Stacked down the
 * page, the fans read as one vertical graph.
 */
export function miniFan(phase: number): Fan {
  const inPhase = edges.filter((e) => e.phase === phase);
  const w0 = inPhase.filter((e) => e.wave === 0);
  const w1 = inPhase.filter((e) => e.wave === 1);
  const uniq = (xs: string[]) => Array.from(new Set(xs));

  const prevIds = phase === 1 ? ["person"] : uniq(w0.map((e) => e.from));
  const row1Ids = phase === 1 ? ["audit"] : uniq(w0.map((e) => e.to));
  const row2Ids = uniq(w1.map((e) => e.to));

  const fanNodes = [
    ...fanRow(prevIds, 0),
    ...fanRow(row1Ids, 1),
    ...(row2Ids.length ? fanRow(row2Ids, 2) : []),
  ];
  const at = (id: string, row: number) => fanNodes.find((n) => n.id === id && n.row === row);

  const curveV = (a: FanNode, b: FanNode) => {
    const my = (b.y - a.y) / 2;
    return `M${a.x} ${a.y + 4}C${a.x} ${a.y + my} ${b.x} ${b.y - my} ${b.x} ${b.y - 5}`;
  };

  const fanEdges: FanEdge[] = [];
  if (phase === 1) {
    const a = at("person", 0);
    const b = at("audit", 1);
    if (a && b) fanEdges.push({ id: "person>audit", d: curveV(a, b), row: 1, dashed: true });
  }
  for (const e of w0) {
    const a = at(e.from, 0);
    const b = at(e.to, 1);
    if (a && b) fanEdges.push({ id: e.id, d: curveV(a, b), row: 1 });
  }
  for (const e of w1) {
    const a = at(e.from, 1);
    const b = at(e.to, 2);
    if (a && b) fanEdges.push({ id: e.id, d: curveV(a, b), row: 2 });
  }

  const rows = row2Ids.length ? 3 : 2;
  return { h: FAN_TOP * 2 + (rows - 1) * FAN_ROW, nodes: fanNodes, edges: fanEdges };
}
