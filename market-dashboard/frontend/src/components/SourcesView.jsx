import React from "react";

function statusClass(s) {
  if (!s) return "";
  const t = String(s).toLowerCase();
  if (t.includes("unavailable") || t.includes("not configured") || t === "error") return "bad";
  return "good";
}

export default function SourcesView({ sources }) {
  if (!sources) return <p className="muted">No source data yet — refresh.</p>;
  const { providers = [], fred_series = [], fmp_endpoints = [], gold_source } = sources;

  return (
    <>
      <section className="card">
        <span className="hero-eyebrow">Where every number comes from</span>
        <p className="src-intro muted">
          Everything on this dashboard is pulled live from the public/licensed sources below and computed by
          transparent rules — no hand-entered figures. Click any series to view it at the source.
        </p>
        <div className="prov-grid">
          {providers.map((p) => (
            <div className="prov" key={p.name}>
              <div className="prov-top">
                <a href={p.url} target="_blank" rel="noreferrer" className="prov-name">{p.name} ↗</a>
                <span className={"prov-status " + statusClass(p.status)}>{p.status}</span>
              </div>
              <p className="prov-powers">{p.powers}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h3 className="val-h">FMP datasets <span className="cnt">equities & valuation</span></h3>
        <table className="semis-table">
          <thead><tr><th className="l">Endpoint</th><th className="l">Powers</th></tr></thead>
          <tbody>
            {fmp_endpoints.map((e) => (
              <tr key={e.endpoint}>
                <td className="l"><span className="mono-cell">{e.endpoint}</span></td>
                <td className="l">{e.powers}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {gold_source && <p className="muted small" style={{ marginTop: 10 }}>Gold: {gold_source}</p>}
      </section>

      <section className="card">
        <h3 className="val-h">FRED series <span className="cnt">{fred_series.length} macro series</span></h3>
        <div className="semis-table-wrap">
          <table className="semis-table">
            <thead><tr><th className="l">Indicator</th><th className="l">FRED ID</th><th>Status</th></tr></thead>
            <tbody>
              {fred_series.map((s) => (
                <tr key={s.id + s.label}>
                  <td className="l">{s.label}</td>
                  <td className="l"><a className="mono-cell" href={s.url} target="_blank" rel="noreferrer">{s.id} ↗</a></td>
                  <td><span className={"prov-status " + (s.status === "ok" ? "good" : "bad")}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="foot muted">
        Sources: FRED, FINRA, Financial Modeling Prep, multpl.com, Federal Reserve FOMC calendar.
        Signals are rule-based and for information only — not financial advice.
      </p>
    </>
  );
}
