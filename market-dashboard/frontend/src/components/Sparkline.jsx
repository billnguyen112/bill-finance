import React from "react";

// Tiny SVG sparkline from [[date, value], ...].
export default function Sparkline({ data, color = "#d9a441", w = 150, h = 34 }) {
  if (!data || data.length < 2) return <svg width={w} height={h} />;
  const vals = data.map((d) => d[1]);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i) => (i / (data.length - 1)) * (w - 2) + 1;
  const y = (v) => h - 2 - ((v - min) / span) * (h - 4);
  const path = data.map((d, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(d[1]).toFixed(1)}`).join(" ");
  const last = data[data.length - 1];
  return (
    <svg width={w} height={h} className="spark" preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx={x(data.length - 1)} cy={y(last[1])} r="2" fill={color} />
    </svg>
  );
}
