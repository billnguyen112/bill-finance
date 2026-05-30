import React from "react";
import { num } from "../format.js";

const LABELS = [["Trailing P/E", "pe"], ["Forward P/E", "fwd_pe"], ["P/B", "pb"], ["P/S", "ps"], ["EV/EBITDA", "ev_ebitda"]];

function M({ v }) {
  return v == null ? <span className="muted">n/m</span> : <>{num(v, 1)}</>;
}

function Medians({ medians }) {
  return (
    <div className="val-medians">
      {LABELS.map(([label, k]) => (
        <div className="vstat" key={k}>
          <span className="vstat-v"><M v={medians[k]} /></span>
          <span className="vstat-l">{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function ValuationView({ valuation }) {
  if (!valuation) {
    return <div className="banner info">Valuation data needs the <code>FMP_API_KEY</code> secret. It fills in on the next refresh.</div>;
  }
  return (
    <>
      <section className="card">
        <span className="hero-eyebrow">Tech + Semiconductors — median valuation (trailing & forward)</span>
        <Medians medians={valuation.overall_medians} />
      </section>

      {valuation.groups.map((g) => (
        <section className="card" key={g.name}>
          <h3 className="val-h">{g.name} <span className="cnt">group median</span></h3>
          <Medians medians={g.medians} />
          <div className="semis-table-wrap">
            <table className="semis-table">
              <thead>
                <tr>
                  <th className="l">Company</th><th>P/E</th><th>Fwd P/E</th>
                  <th>P/B</th><th>P/S</th><th>EV/EBITDA</th>
                </tr>
              </thead>
              <tbody>
                {g.companies.map((c) => (
                  <tr key={c.symbol}>
                    <td className="l">
                      <span className="sym">{c.symbol}</span>
                      <span className="cname">{c.name}</span>
                    </td>
                    <td><M v={c.pe} /></td><td><M v={c.fwd_pe} /></td>
                    <td><M v={c.pb} /></td><td><M v={c.ps} /></td><td><M v={c.ev_ebitda} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <p className="foot muted">
        Trailing multiples from FMP (ratios-ttm / key-metrics-ttm); forward P/E = price ÷ next-fiscal-year
        consensus EPS. "n/m" = not meaningful (e.g. negative earnings). Informational only, not advice.
      </p>
    </>
  );
}
