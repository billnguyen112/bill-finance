import React from "react";
import { num } from "../format.js";
import AiRead from "./AiRead.jsx";

const TONE = { good: "#3fa66a", ok: "#6cba8a", warn: "#d9a441", bad: "#cc4b4b" };
const toneColor = (t) => TONE[t] || "#8b94a3";

function signed(v) {
  if (v == null) return <span className="muted">—</span>;
  const c = v > 0 ? "pos" : v < 0 ? "neg" : "";
  return <span className={c}>{v > 0 ? "+" : ""}{num(v, 1)}%</span>;
}

export default function AiCreditCard({ data }) {
  if (!data || !(data.names || []).length) return null;
  const sig = data.signal || {};
  return (
    <section className="card">
      <div className="md-head">
        <span className="hero-eyebrow">AI buildout credit risk — CoreWeave / neoclouds &amp; hyperscalers</span>
        <span className="md-latest">
          {data.canary_avg_from_high != null ? `${num(data.canary_avg_from_high, 1)}%` : "—"}
          {sig.label && <span className="md-badge" style={{ color: toneColor(sig.tone), borderColor: toneColor(sig.tone) }}>{sig.label}</span>}
        </span>
      </div>
      <p className="muted small" style={{ margin: "4px 0 8px" }}>
        Single-name CDS isn't available from free feeds, so this is an <b>equity-drawdown proxy</b>:
        the debt-funded AI "canaries" (★) typically crack before broad credit spreads widen — a
        leading tell for the buildout bubble. Number above = average distance of the canaries below
        their 52-week high.
      </p>
      <div className="semis-table-wrap">
        <table className="semis-table">
          <thead>
            <tr><th className="l">Name</th><th>Price</th><th>1W</th><th>1M</th><th>% from high</th></tr>
          </thead>
          <tbody>
            {data.names.map((n) => (
              <tr key={n.symbol}>
                <td className="l">
                  <span className="sym">{n.canary ? "★ " : ""}{n.symbol}</span>
                  <span className="cname">{n.role}</span>
                </td>
                <td>{n.price != null ? `$${num(n.price, 2)}` : "—"}</td>
                <td>{signed(n.w1)}</td>
                <td>{signed(n.m1)}</td>
                <td>{signed(n.pct_from_high)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sig.note && <div className="md-note" style={{ color: toneColor(sig.tone) }}>{sig.note}</div>}
      <AiRead text={data.analysis} />
    </section>
  );
}
