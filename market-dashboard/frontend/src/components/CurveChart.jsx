import React from "react";
import { num } from "../format.js";

// Treasury yield curve: yield (%) by tenor, with last week's curve as a ghost
// overlay and per-tenor week-on-week change below each tenor label.
export default function CurveChart({ curve }) {
  if (!curve || curve.length < 2) return <p className="muted">No curve data.</p>;
  const W = 560, H = 178, pad = { l: 34, r: 12, t: 12, b: 40 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const hasPrev = curve.some((c) => c.prev != null);
  const vals = curve.flatMap((c) => [c.value, c.prev]).filter((v) => v != null);
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i) => pad.l + (i / (curve.length - 1)) * iw;
  const y = (v) => pad.t + ih - ((v - min) / span) * ih;
  const path = curve.map((c, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(c.value).toFixed(1)}`).join(" ");
  const prevPath = curve.every((c) => c.prev != null)
    ? curve.map((c, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(c.prev).toFixed(1)}`).join(" ")
    : null;
  const inverted = curve[0].value > curve[curve.length - 1].value;

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="curve" role="img" aria-label="Yield curve">
        {[max, (max + min) / 2, min].map((g, i) => (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} className="grid" />
            <text x={4} y={y(g) + 3} className="axis">{num(g, 1)}</text>
          </g>
        ))}
        {prevPath && (
          <path d={prevPath} fill="none" stroke="var(--muted)" strokeWidth="1.5"
                strokeDasharray="4 3" opacity="0.7" />
        )}
        <path d={path} fill="none" stroke={inverted ? "#cc4b4b" : "#3fa66a"} strokeWidth="2" />
        {curve.map((c, i) => (
          <g key={c.tenor}>
            {c.prev != null && <circle cx={x(i)} cy={y(c.prev)} r="2" fill="var(--muted)" opacity="0.7" />}
            <circle cx={x(i)} cy={y(c.value)} r="3" fill={inverted ? "#cc4b4b" : "#3fa66a"}>
              <title>{`${c.tenor}: ${num(c.value, 2)}%${c.w1 != null ? ` (${c.w1 > 0 ? "+" : ""}${num(c.w1, 2)} w/w)` : ""}`}</title>
            </circle>
            <text x={x(i)} y={H - 22} className="axis" textAnchor="middle">{c.tenor}</text>
            {c.w1 != null && (
              <text x={x(i)} y={H - 9} textAnchor="middle"
                    className={`curve-ww ${c.w1 > 0 ? "up" : c.w1 < 0 ? "down" : ""}`}>
                {c.w1 > 0 ? "+" : ""}{num(c.w1, 2)}
              </text>
            )}
          </g>
        ))}
      </svg>
      {hasPrev && (
        <div className="curve-legend muted">
          <span><i className="cl-line solid" /> this week</span>
          <span><i className="cl-line dash" /> last week</span>
          <span>numbers below = week-on-week change (pp)</span>
        </div>
      )}
    </>
  );
}
