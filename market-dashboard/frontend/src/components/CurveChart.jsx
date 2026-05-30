import React from "react";
import { num } from "../format.js";

// Treasury yield curve: yield (%) by tenor.
export default function CurveChart({ curve }) {
  if (!curve || curve.length < 2) return <p className="muted">No curve data.</p>;
  const W = 520, H = 150, pad = { l: 34, r: 12, t: 12, b: 24 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const vals = curve.map((c) => c.value);
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i) => pad.l + (i / (curve.length - 1)) * iw;
  const y = (v) => pad.t + ih - ((v - min) / span) * ih;
  const path = curve.map((c, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(c.value).toFixed(1)}`).join(" ");
  const inverted = curve[0].value > curve[curve.length - 1].value;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="curve" role="img" aria-label="Yield curve">
      {[max, (max + min) / 2, min].map((g, i) => (
        <g key={i}>
          <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} className="grid" />
          <text x={4} y={y(g) + 3} className="axis">{num(g, 1)}</text>
        </g>
      ))}
      <path d={path} fill="none" stroke={inverted ? "#cc4b4b" : "#3fa66a"} strokeWidth="2" />
      {curve.map((c, i) => (
        <g key={c.tenor}>
          <circle cx={x(i)} cy={y(c.value)} r="3" fill={inverted ? "#cc4b4b" : "#3fa66a"}>
            <title>{`${c.tenor}: ${num(c.value, 2)}%`}</title>
          </circle>
          <text x={x(i)} y={H - 8} className="axis" textAnchor="middle">{c.tenor}</text>
        </g>
      ))}
    </svg>
  );
}
