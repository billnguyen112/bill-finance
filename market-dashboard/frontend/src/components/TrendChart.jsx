import React from "react";
import { sentimentColor, fmtDate } from "../sentiment.js";

// Hand-rolled SVG sentiment-over-time chart (no chart dependency).
export default function TrendChart({ series }) {
  if (!series || series.length === 0) {
    return <p className="muted">No sentiment history yet.</p>;
  }

  const W = 640;
  const H = 160;
  const pad = { l: 28, r: 12, t: 14, b: 22 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const n = series.length;

  const x = (i) => pad.l + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (s) => pad.t + ((1 - (Math.max(-1, Math.min(1, s)) + 1) / 2) * innerH);

  const path = series
    .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d.score).toFixed(1)}`)
    .join(" ");

  return (
    <svg className="trendchart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Sentiment over time">
      {/* zero / +1 / -1 gridlines */}
      {[1, 0, -1].map((g) => (
        <g key={g}>
          <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} className="grid" />
          <text x={4} y={y(g) + 3} className="axis">{g > 0 ? "+1" : g}</text>
        </g>
      ))}
      <path d={path} className="trendline" />
      {series.map((d, i) => (
        <circle key={d.video_id || i} cx={x(i)} cy={y(d.score)} r="4"
                fill={sentimentColor(d.score)}>
          <title>{`${fmtDate(d.date)} — ${d.label} (${d.score})\n${d.title || ""}`}</title>
        </circle>
      ))}
    </svg>
  );
}
