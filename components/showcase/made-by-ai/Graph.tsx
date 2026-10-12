import { useId, type CSSProperties } from "react";
import {
  BUS_D,
  DROPS,
  EDGES,
  HEADERS,
  HEADER_Y,
  NODES,
  NODE_BY_ID,
  VB_H,
  VB_W,
  type GraphNode,
} from "./geometry";
import s from "./MadeByAI.module.css";

const pctX = (x: number) => `${(x / VB_W) * 100}%`;
const pctY = (y: number) => `${(y / VB_H) * 100}%`;

/**
 * The agent graph. Server-rendered in its finished state — every edge drawn,
 * every node lit — so without JS (and under reduced motion) it simply shows
 * the whole build. The scroll scene takes it apart and rebuilds it.
 */
export default function Graph() {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const halo = `mbai-halo-${uid}`;
  const haloBone = `mbai-halo-bone-${uid}`;

  return (
    <div className={s.graphBox} data-graph="" aria-hidden="true">
      <div className={s.scan} data-scan="" />
      <div className={s.bloom} data-bloom="" style={{ left: pctX(NODE_BY_ID.live.x), top: pctY(NODE_BY_ID.live.y) }} />
      <svg
        className={s.svg}
        data-graph-svg=""
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id={halo}>
            <stop offset="0%" stopColor="#cf8794" stopOpacity="0.55" />
            <stop offset="35%" stopColor="#b0505f" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#7d2436" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={haloBone}>
            <stop offset="0%" stopColor="#e3e6e0" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#e3e6e0" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Oversight: one person, a dashed line over the whole build. */}
        <g>
          <path className={s.busBase} d={BUS_D} vectorEffect="non-scaling-stroke" />
          {DROPS.map((d) => (
            <path key={`db-${d.id}`} className={s.busBase} d={d.d} vectorEffect="non-scaling-stroke" />
          ))}
          <path className={s.busLit} d={BUS_D} data-bus="" vectorEffect="non-scaling-stroke" />
          {DROPS.map((d) => (
            <path
              key={`dl-${d.id}`}
              className={s.busLit}
              d={d.d}
              data-drop={d.id}
              data-phase={d.phase}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>

        <g>
          {EDGES.map((e) => (
            <path
              key={e.id}
              className={s.edge}
              d={e.d}
              data-edge={e.id}
              data-phase={e.phase}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>

        <g>
          {NODES.map((n) => (
            <NodeGlyph key={n.id} n={n} halo={n.kind === "person" ? haloBone : halo} />
          ))}
        </g>

        {/* Hover targets (fine pointers only, via CSS). Bigger than the dots. */}
        <g>
          {NODES.map((n) => (
            <circle
              key={`hit-${n.id}`}
              className={s.hit}
              cx={n.x}
              cy={n.y}
              r={n.kind === "live" ? 30 : Math.max(13, n.r + 7)}
              data-hit={n.id}
            />
          ))}
        </g>
      </svg>

      <canvas className={s.pulses} data-pulses="" />

      <div className={s.labels}>
        {HEADERS.map((h) => (
          <span
            key={`h-${h.text}`}
            className={s.colHead}
            data-head={h.phase}
            style={{ left: pctX(h.x), top: pctY(HEADER_Y) }}
          >
            {h.text}
            {h.count ? <span className={s.colCount}>{h.count}</span> : null}
          </span>
        ))}
        <span className={s.tip} data-tip="" />
        {NODES.filter((n) => n.label).map((n) => (
          <span
            key={`l-${n.id}`}
            className={s.nodeLabel}
            data-label={n.id}
            data-phase={n.phase}
            data-side={n.labelSide ?? "right"}
            data-sticky={n.sticky ? "" : undefined}
            style={labelPos(n)}
          >
            {n.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function labelPos(n: GraphNode): CSSProperties {
  const gap = n.r + (n.kind === "live" ? 10 : 9);
  switch (n.labelSide) {
    case "left":
      return { left: pctX(n.x - gap), top: pctY(n.y) };
    case "below":
      return { left: pctX(n.x), top: pctY(n.y + gap) };
    case "above":
      return { left: pctX(n.x), top: pctY(n.y - gap) };
    case "aboveRight":
      return { left: pctX(n.x + n.r + 6), top: pctY(n.y - 6) };
    default:
      return { left: pctX(n.x + gap), top: pctY(n.y) };
  }
}

function diamond(cx: number, cy: number, r: number): string {
  return `M${cx} ${cy - r}L${cx + r} ${cy}L${cx} ${cy + r}L${cx - r} ${cy}Z`;
}

function NodeGlyph({ n, halo }: { n: GraphNode; halo: string }) {
  const { x, y, r } = n;
  const data = { "data-node": n.id, "data-phase": n.phase };

  if (n.kind === "gate") {
    return (
      <g>
        <path className={s.ghost} d={diamond(x, y, r)} vectorEffect="non-scaling-stroke" />
        <g className={s.lit} {...data}>
          <circle className={s.halo} cx={x} cy={y} r={r * 3.4} fill={`url(#${halo})`} />
          <path className={s.gateRing} d={diamond(x, y, r)} vectorEffect="non-scaling-stroke" />
          <path className={s.gateCore} d={diamond(x, y, r * 0.42)} />
        </g>
        <path className={s.ping} data-ping={n.id} d={diamond(x, y, r + 2)} vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  if (n.kind === "live") {
    const w = 50;
    const h = 34;
    const x0 = x - w / 2;
    const y0 = y - h / 2;
    return (
      <g>
        <rect className={s.ghost} x={x0} y={y0} width={w} height={h} rx={3} vectorEffect="non-scaling-stroke" />
        <g className={s.lit} {...data}>
          <circle className={s.halo} cx={x} cy={y} r={w * 1.15} fill={`url(#${halo})`} />
          <rect className={s.paneBody} x={x0} y={y0} width={w} height={h} rx={3} vectorEffect="non-scaling-stroke" />
          <path className={s.paneBar} d={`M${x0} ${y0 + 8}H${x0 + w}`} vectorEffect="non-scaling-stroke" />
          <circle className={s.paneDot} cx={x0 + 5} cy={y0 + 4} r={1.3} />
          <circle className={s.paneDot} cx={x0 + 9.5} cy={y0 + 4} r={1.3} />
          <rect className={s.paneHead} x={x0 + 6} y={y0 + 13} width={24} height={3.2} rx={1} />
          <rect className={s.paneText} x={x0 + 6} y={y0 + 19.5} width={36} height={2} rx={1} />
          <rect className={s.paneText} x={x0 + 6} y={y0 + 24} width={30} height={2} rx={1} />
          <rect className={s.paneCta} x={x0 + 6} y={y0 + 28} width={12} height={3} rx={0.8} />
        </g>
        <rect
          className={s.ping}
          data-ping={n.id}
          x={x0 - 2}
          y={y0 - 2}
          width={w + 4}
          height={h + 4}
          rx={4}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  if (n.kind === "person") {
    const a = r;
    return (
      <g>
        <g className={s.lit} {...data}>
          <circle className={s.halo} cx={x} cy={y} r={r * 3.2} fill={`url(#${halo})`} />
          <rect className={s.personRing} x={x - a} y={y - a} width={a * 2} height={a * 2} rx={2} vectorEffect="non-scaling-stroke" />
          <rect className={s.personCore} x={x - a * 0.4} y={y - a * 0.4} width={a * 0.8} height={a * 0.8} rx={1} />
        </g>
      </g>
    );
  }

  return (
    <g>
      <circle className={s.ghost} cx={x} cy={y} r={r} vectorEffect="non-scaling-stroke" />
      <g className={s.lit} {...data} data-kind={n.kind}>
        <circle className={s.halo} cx={x} cy={y} r={r * 3.4} fill={`url(#${halo})`} />
        <circle className={s.ring} cx={x} cy={y} r={r} vectorEffect="non-scaling-stroke" />
        <circle className={s.core} cx={x} cy={y} r={Math.max(1.8, r * 0.45)} />
      </g>
      <circle className={s.ping} data-ping={n.id} cx={x} cy={y} r={r + 2} vectorEffect="non-scaling-stroke" />
    </g>
  );
}
