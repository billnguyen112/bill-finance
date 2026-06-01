import React from "react";
import { num } from "../format.js";
import AiRead from "./AiRead.jsx";

function RateChart({ c }) {
  const data = c.spark || [];
  const W = 300, H = 92, pad = { l: 4, r: 4, t: 4, b: 4 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const vals = data.map((p) => p[1]);
  // include last week's level in the y-range so the ghost marker always fits
  const ext = c.prev != null ? [...vals, c.prev] : vals;
  const min = Math.min(...ext), max = Math.max(...ext), span = max - min || 1;
  const x = (i) => pad.l + (i / (data.length - 1)) * iw;
  const y = (v) => pad.t + ih - ((v - min) / span) * ih;
  const line = data.map((p, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(p[1]).toFixed(1)}`).join(" ");
  const w1 = c.w1;
  // colour by good/bad for equities (green up, red down) and the w/w number too
  const stroke = c.good > 0 ? "#3fa66a" : c.good < 0 ? "#cc4b4b" : "#6b7585";
  const wcls = c.good > 0 ? "pos" : c.good < 0 ? "neg" : "";
  const ghostY = c.prev != null ? y(c.prev) : null;
  const lastY = data.length ? y(data[data.length - 1][1]) : null;
  return (
    <div className="fed-chart">
      <div className="fed-chart-top">
        <span className="fed-chart-label">{c.label}</span>
        <span className="fed-chart-val">{c.value != null ? `${num(c.value, 2)}${c.unit}` : "—"}</span>
      </div>
      {data.length > 1 && (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="fed-spark" preserveAspectRatio="none">
          {ghostY != null && (
            <line x1={pad.l} x2={W - pad.r} y1={ghostY} y2={ghostY}
                  className="fed-ghost" strokeDasharray="4 3" />
          )}
          <path d={line} fill="none" strokeWidth="1.6" stroke={stroke} />
          {lastY != null && <circle cx={W - pad.r} cy={lastY} r="2.4" fill={stroke} />}
        </svg>
      )}
      <div className="fed-chart-foot">
        {w1 != null
          ? <span className={wcls}>{w1 > 0 ? "+" : ""}{num(w1, 2)} wk{c.prev != null ? ` · vs ${num(c.prev, 2)}` : ""}</span>
          : <span />}
        {c.id && <a className="src-link" href={`https://fred.stlouisfed.org/series/${c.id}`} target="_blank" rel="noreferrer">source ↗</a>}
      </div>
    </div>
  );
}

const STANCE = {
  hike: { color: "#cc4b4b", label: "Hike risk" },
  cut: { color: "#3fa66a", label: "Cuts priced" },
  hold: { color: "#d9a441", label: "On hold" },
};

function fmtVal(it) {
  if (it.value == null) return "—";
  const sign = it.unit === "pp" && it.value > 0 ? "+" : "";
  const suffix = it.unit === "%" ? "%" : it.unit === "pp" ? "pp" : "";
  return `${sign}${num(it.value, 2)}${suffix}`;
}

export default function FedView({ fed, aiSource = "llm" }) {
  if (!fed) return <p className="muted">No Fed data yet — refresh.</p>;
  const s = STANCE[fed.stance] || STANCE.hold;

  return (
    <>
      <AiRead text={fed.analysis} source={aiSource} />
      <section className="card">
        <span className="hero-eyebrow">Fed watch — market-implied policy path (is a pivot coming?)</span>
        <div className="fed-head">
          <span className="fed-stance" style={{ color: s.color }}>{s.label}</span>
          {fed.next_fomc && <span className="fed-fomc">Next FOMC <b>{fed.next_fomc}</b></span>}
        </div>

        <div className="fed-prob-label muted">
          Implied for the next meeting (25bp move) — 3-month T-bill proxy; CME FedWatch uses fed funds futures (ZQ):
        </div>
        <div className="fed-prob">
          <div className="fp cut" style={{ width: `${fed.cut_odds || 0}%` }} />
          <div className="fp hold" style={{ width: `${fed.hold_odds ?? 100}%` }} />
          <div className="fp hike" style={{ width: `${fed.hike_odds || 0}%` }} />
        </div>
        <div className="fed-prob-legend">
          <span><i className="dot cut" /> Cut {fed.cut_odds || 0}%</span>
          <span><i className="dot hold" /> Hold {fed.hold_odds ?? 100}%</span>
          <span><i className="dot hike" /> Hike {fed.hike_odds || 0}%</span>
        </div>

        <p className="fed-reading">{fed.reading}</p>
      </section>

      {fed.charts?.length > 0 && (
        <section className="card">
          <h3 className="val-h">Rates I watch every week <span className="cnt">2-year history</span></h3>
          <div className="fed-charts">
            {fed.charts.map((c) => <RateChart key={c.label} c={c} />)}
          </div>
        </section>
      )}

      <section className="card">
        <h3 className="val-h">Leading indicators <span className="cnt">click ↗ to chart at source</span></h3>
        <div className="fed-grid">
          {(fed.panel || []).map((it) => (
            <div className="fed-ind" key={it.label}>
              <div className="fed-ind-top">
                <span className="fed-ind-l">{it.label}</span>
                {it.source_url && <a href={it.source_url} target="_blank" rel="noreferrer" className="src-link">↗</a>}
              </div>
              <span className="fed-ind-v">{fmtVal(it)}</span>
              <span className="fed-ind-n">{it.note}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="foot muted">
        Market-implied read from the 3-month T-bill vs effective fed funds + the FOMC calendar. CME FedWatch
        (fed funds futures) is the paid gold standard; this is the free, closely-correlated proxy. A pivot from
        cutting back to hiking is the sell trigger. Informational only, not financial advice.
      </p>
    </>
  );
}
