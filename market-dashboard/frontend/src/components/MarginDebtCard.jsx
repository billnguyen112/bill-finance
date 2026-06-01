import React from "react";
import { fmtDate } from "../format.js";
import { useChart } from "./ChartModal.jsx";

const TONE = { good: "#3fa66a", ok: "#6cba8a", warn: "#d9a441", bad: "#cc4b4b" };
const toneColor = (t) => TONE[t] || "#8b94a3";

// FINRA margin debt is reported in $millions.
function money(m) {
  if (m == null) return "—";
  if (m >= 1e6) return `$${(m / 1e6).toFixed(2)}T`;
  return `$${(m / 1e3).toFixed(0)}B`;
}

function signed(v, suffix = "%") {
  if (v == null) return <span className="muted">—</span>;
  const cls = v > 0 ? "pos" : v < 0 ? "neg" : "";
  return <span className={cls}>{v > 0 ? "+" : ""}{v}{suffix}</span>;
}

function Chart({ series, tone }) {
  if (!series || series.length < 2) return null;
  const W = 720, H = 200, pad = { l: 46, r: 12, t: 12, b: 22 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const n = series.length;
  const vals = series.map((p) => p[1]);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i) => pad.l + (i / (n - 1)) * iw;
  const y = (v) => pad.t + ih - ((v - min) / span) * ih;
  const line = series.map((p, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(p[1]).toFixed(1)}`).join(" ");
  const area = `${line} L ${x(n - 1).toFixed(1)} ${(pad.t + ih).toFixed(1)} L ${x(0).toFixed(1)} ${(pad.t + ih).toFixed(1)} Z`;
  const col = toneColor(tone);
  // y gridlines at min, mid, max
  const grids = [min, (min + max) / 2, max];
  // x labels: ~5 evenly spaced
  const ticks = [];
  const step = Math.max(1, Math.floor((n - 1) / 4));
  for (let i = 0; i < n; i += step) ticks.push(i);
  if (ticks[ticks.length - 1] !== n - 1) ticks.push(n - 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="mdchart" role="img" aria-label="Margin debt over time">
      <defs>
        <linearGradient id="mdfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity="0.28" />
          <stop offset="100%" stopColor={col} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {grids.map((g, i) => (
        <g key={i}>
          <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} className="mdgrid" />
          <text x={pad.l - 6} y={y(g) + 3} className="mdytick" textAnchor="end">{money(g)}</text>
        </g>
      ))}
      {ticks.map((i) => (
        <text key={i} x={x(i)} y={H - 6} className="mdxtick" textAnchor="middle">{fmtDate(series[i][0])}</text>
      ))}
      <path d={area} fill="url(#mdfill)" />
      <path d={line} fill="none" stroke={col} strokeWidth="1.8" />
      <circle cx={x(n - 1)} cy={y(series[n - 1][1])} r="3.5" fill={col} />
    </svg>
  );
}

export default function MarginDebtCard({ margin }) {
  const chart = useChart();   // hook must run before any early return
  if (!margin || !margin.series?.length) return null;
  const sig = margin.signal || {};
  const canExplore = chart.has("margin_debt");
  const openChart = () => chart.open({
    key: "margin_debt", label: "Margin debt (FINRA)", unit: "$M", good: -1,
    source_url: "https://www.finra.org/investors/learn-to-invest/advanced-investing/margin-statistics",
  });
  return (
    <section className="card">
      <div className="md-head">
        <span className="hero-eyebrow">Margin debt — investor leverage (FINRA)
          {canExplore && <button className="spark-expand-btn" onClick={openChart} title="Open interactive chart"> ⤢</button>}
        </span>
        <span className="md-latest">{money(margin.latest)}
          {sig.label && <span className="md-badge" style={{ color: toneColor(sig.tone), borderColor: toneColor(sig.tone) }}>{sig.label}</span>}
        </span>
      </div>
      <div className="md-stats">
        <div className="md-stat"><span className="md-n">{signed(margin.mom_pct)}</span><span className="md-l">m/m</span></div>
        <div className="md-stat"><span className="md-n">{signed(margin.yoy_pct)}</span><span className="md-l">y/y</span></div>
        <div className="md-stat"><span className="md-n">{signed(margin.pct_from_peak)}</span><span className="md-l">vs peak</span></div>
        <div className="md-stat"><span className="md-n">{money(margin.peak)}</span><span className="md-l">peak {fmtDate(margin.peak_date)}</span></div>
      </div>
      <Chart series={margin.series} tone={sig.tone} />
      {sig.note && <div className="md-note">{sig.note}</div>}
      {margin.explain?.lens && <div className="t-lens">{margin.explain.lens}</div>}
      <div className="t-asof">
        as of {fmtDate(margin.latest_date)} · <a href="https://www.finra.org/investors/learn-to-invest/advanced-investing/margin-statistics" target="_blank" rel="noreferrer" className="src-link">FINRA ↗</a>
      </div>
    </section>
  );
}
