import React from "react";
import { num } from "../format.js";

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

export default function FedView({ fed }) {
  if (!fed) return <p className="muted">No Fed data yet — refresh.</p>;
  const s = STANCE[fed.stance] || STANCE.hold;
  const odds = fed.hike_odds || fed.cut_odds;

  return (
    <>
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
