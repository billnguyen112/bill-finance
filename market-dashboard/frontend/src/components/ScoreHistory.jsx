import React from "react";
import { scoreColor, fmtDate } from "../format.js";

// Overall risk score (-1..+1) over time.
export default function ScoreHistory({ points }) {
  if (!points || points.length < 2) {
    return <p className="muted small">Risk-score history builds up as you refresh over time.</p>;
  }
  const W = 520, H = 96, pad = { l: 22, r: 8, t: 8, b: 8 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const n = points.length;
  const x = (i) => pad.l + (i / (n - 1)) * iw;
  const y = (s) => pad.t + ih - ((Math.max(-1, Math.min(1, s)) + 1) / 2) * ih;
  const path = points.map((p, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(p.score).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="hist" role="img" aria-label="Risk score history">
      {[1, 0, -1].map((g) => (
        <line key={g} x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} className={g === 0 ? "grid zero" : "grid"} />
      ))}
      <path d={path} fill="none" stroke="#8b94a3" strokeWidth="1.5" />
      {points.map((p, i) => (
        <circle key={p.date} cx={x(i)} cy={y(p.score)} r="2.5" fill={scoreColor(p.score)}>
          <title>{`${fmtDate(p.date)} — ${p.label} (${p.score})`}</title>
        </circle>
      ))}
    </svg>
  );
}
