import React from "react";
import { num } from "../format.js";
import AiRead from "./AiRead.jsx";

const TONE = { good: "#3fa66a", ok: "#6cba8a", warn: "#d9a441", bad: "#cc4b4b" };
const toneColor = (t) => TONE[t] || "#8b94a3";

function signed(v) {
  if (v == null) return <span className="muted">—</span>;
  const c = v > 0 ? "neg" : v < 0 ? "pos" : ""; // widening (up) is bad for credit
  return <span className={c}>{v > 0 ? "+" : ""}{num(v, 2)}pp</span>;
}

// Mini sparkline for an OAS tier.
function Spark({ data, tone }) {
  if (!data || data.length < 2) return null;
  const W = 120, H = 28;
  const vals = data.map((p) => p[1]);
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const x = (i) => (i / (data.length - 1)) * W;
  const y = (v) => H - 2 - ((v - min) / span) * (H - 4);
  const d = data.map((p, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(p[1]).toFixed(1)}`).join(" ");
  return <svg viewBox={`0 0 ${W} ${H}`} width="120" height="28" className="oas-spark"><path d={d} fill="none" stroke={toneColor(tone)} strokeWidth="1.5" /></svg>;
}

export default function AiCreditCard({ data, aiSource = "llm" }) {
  if (!data || !(data.tiers || []).length) return null;
  const sig = data.signal || {};
  return (
    <section className="card">
      <div className="md-head">
        <span className="hero-eyebrow">AI buildout credit risk — datacenter / hyperscaler debt spreads</span>
        <span className="md-latest" style={{ fontSize: 15 }}>
          {sig.label && <span className="md-badge" style={{ color: toneColor(sig.tone), borderColor: toneColor(sig.tone) }}>{sig.label}</span>}
        </span>
      </div>
      <p className="muted small" style={{ margin: "4px 0 8px" }}>
        Single-name CDS (CoreWeave, Oracle…) and CDX indices are licensed and not on any free feed,
        so this tracks the <b>real credit-spread signal that carries the same information</b>: ICE BofA
        option-adjusted spreads (OAS) over Treasuries, rating-tiered to where AI/datacenter debt sits.
        The <b>junk tiers (CCC, single-B) blow out first</b> when the buildout's leveraged borrowers crack —
        the earliest bubble-pop lead, ahead of equities.
      </p>
      <div className="semis-table-wrap">
        <table className="semis-table">
          <thead>
            <tr><th className="l">Rating tier</th><th>OAS</th><th>1W</th><th>trend (2y)</th><th className="l">where it sits</th></tr>
          </thead>
          <tbody>
            {data.tiers.map((t) => (
              <tr key={t.key}>
                <td className="l">
                  <span className="sym">{t.is_junk ? "● " : "○ "}{t.label}</span>
                </td>
                <td><b>{t.value != null ? `${num(t.value, 2)}%` : "—"}</b></td>
                <td>{signed(t.w1)}</td>
                <td><Spark data={t.spark} tone={t.is_junk ? "warn" : "ok"} /></td>
                <td className="l"><span className="cname">{t.note}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.hy_minus_ig != null && (
        <div className="md-stats" style={{ marginTop: 10 }}>
          <div className="md-stat"><span className="md-n">{num(data.hy_minus_ig, 2)}%</span><span className="md-l">HY − IG spread (risk-on/off gauge)</span></div>
        </div>
      )}
      {sig.note && <div className="md-note" style={{ color: toneColor(sig.tone) }}>{sig.note}</div>}

      {data.deals?.length > 0 && (
        <div className="deals">
          <div className="deals-h">Actual buildout debt deals <span className="muted">(no API carries these — hand-curated)</span></div>
          {data.deals.map((d, i) => (
            <div className="deal" key={i}>
              <span className="deal-name">{d.name}</span>
              <span className="deal-spread">{d.spread}</span>
              <span className="deal-detail muted">{d.detail}</span>
            </div>
          ))}
        </div>
      )}

      <AiRead text={data.analysis} source={aiSource} />
      <div className="t-asof">
        ICE BofA OAS via <a href="https://fred.stlouisfed.org/release?rid=209" target="_blank" rel="noreferrer" className="src-link">FRED ↗</a>
      </div>
    </section>
  );
}
