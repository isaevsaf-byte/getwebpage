import { FAN_W, miniFan, type FanNode } from "./geometry";
import s from "./MadeByAI.module.css";

/**
 * One phase of the vertical graph (flow layout): the row that fed it, dim,
 * fanning into what this phase built. Server-rendered finished; the flow
 * motion draws it in when the row arrives.
 */
export default function MiniFan({ phase }: { phase: number }) {
  const fan = miniFan(phase);
  return (
    <svg
      className={s.fan}
      viewBox={`0 0 ${FAN_W} ${fan.h}`}
      aria-hidden="true"
      focusable="false"
      data-fan=""
    >
      {fan.edges.map((e) => (
        // No vector-effect on drawn paths: with non-scaling-stroke DrawSVG
        // re-measures the path (getTotalLength + getScreenCTM) on every frame.
        // The fan renders at ~1:1 (max-width 320px = its viewBox), so the
        // stroke looks the same either way.
        <path
          key={e.id}
          className={e.dashed ? s.fanEdgeDashed : s.fanEdge}
          d={e.d}
          data-fan-edge={e.row}
        />
      ))}
      {/* Pulses: a bright run that travels each solid edge once it is drawn
          (flow motion only; invisible until JS sets its dash). */}
      {fan.edges
        .filter((e) => !e.dashed)
        .map((e) => (
          <path key={`${e.id}-pulse`} className={s.fanPulse} d={e.d} data-fan-pulse={e.row} />
        ))}
      {fan.nodes.map((n) => (
        <FanGlyph key={`${n.id}-${n.row}`} n={n} />
      ))}
    </svg>
  );
}

function FanGlyph({ n }: { n: FanNode }) {
  const { x, y } = n;
  const cls = n.row === 0 ? `${s.fanNode} ${s.fanPrev}` : s.fanNode;
  const data = { "data-fan-node": n.row };

  switch (n.kind) {
    case "person":
      return (
        <g className={cls} {...data}>
          <rect className={s.fanBone} x={x - 4.5} y={y - 4.5} width={9} height={9} rx={1.5} vectorEffect="non-scaling-stroke" />
          <rect className={s.fanBoneFill} x={x - 1.5} y={y - 1.5} width={3} height={3} />
        </g>
      );
    case "gate":
      return (
        <g className={cls} {...data}>
          <path
            className={s.fanGate}
            d={`M${x} ${y - 4.5}L${x + 4.5} ${y}L${x} ${y + 4.5}L${x - 4.5} ${y}Z`}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      );
    case "live":
      return (
        <g className={cls} {...data}>
          <rect className={s.fanPane} x={x - 10} y={y - 6.5} width={20} height={13} rx={2} vectorEffect="non-scaling-stroke" />
          <rect className={s.fanBoneFill} x={x - 6.5} y={y - 2.5} width={8} height={1.6} />
          <rect className={s.fanAccentFill} x={x - 6.5} y={y + 1.2} width={4} height={1.6} />
        </g>
      );
    case "anchor":
      return (
        <g className={cls} {...data}>
          <circle className={s.fanRing} cx={x} cy={y} r={4.6} vectorEffect="non-scaling-stroke" />
          <circle className={s.fanBoneFill} cx={x} cy={y} r={1.9} />
        </g>
      );
    case "small":
      return (
        <g className={cls} {...data}>
          <circle className={s.fanDot} cx={x} cy={y} r={2.7} vectorEffect="non-scaling-stroke" />
        </g>
      );
    default:
      return (
        <g className={cls} {...data}>
          <circle className={s.fanDot} cx={x} cy={y} r={3.6} vectorEffect="non-scaling-stroke" />
        </g>
      );
  }
}
