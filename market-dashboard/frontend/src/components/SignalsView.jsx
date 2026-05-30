import React from "react";

const STATE_COLOR = { buy: "#3fa66a", caution: "#cc4b4b", neutral: "#8b94a3" };
const STATE_LABEL = { buy: "Buy-supportive", caution: "Caution", neutral: "Neutral" };
const POSTURE_COLOR = { Accumulate: "#3fa66a", Neutral: "#d9a441", Defensive: "#cc4b4b" };

export default function SignalsView({ playbook }) {
  if (!playbook) return <p className="muted">No signal data yet — refresh the data.</p>;
  const { posture, buy_count, neutral_count, caution_count, signals, sources } = playbook;

  return (
    <>
      <section className="card posture-card">
        <div className="posture-main">
          <span className="hero-eyebrow">Current posture</span>
          <span className="posture-label" style={{ color: POSTURE_COLOR[posture] || "#d9a441" }}>
            {posture}
          </span>
        </div>
        <div className="tally">
          <span className="tally-item"><b style={{ color: STATE_COLOR.buy }}>{buy_count}</b> buy</span>
          <span className="tally-item"><b style={{ color: STATE_COLOR.neutral }}>{neutral_count}</b> neutral</span>
          <span className="tally-item"><b style={{ color: STATE_COLOR.caution }}>{caution_count}</b> caution</span>
        </div>
      </section>

      <div className="sig-grid">
        {signals.map((s) => (
          <div className="sig-card" key={s.id}>
            <div className="sig-head">
              <span className="sig-name">{s.name}</span>
              <span className="sig-badge" style={{ background: STATE_COLOR[s.state] }}>
                {STATE_LABEL[s.state]}
              </span>
            </div>
            <p className="sig-watch">{s.watches}</p>
            <div className="sig-rules">
              <div className="rule buy"><span>▲ Buy when</span> {s.buy_when}</div>
              <div className="rule caution"><span>▼ Caution when</span> {s.caution_when}</div>
            </div>
            <div className="sig-now" style={{ borderColor: STATE_COLOR[s.state] }}>
              <span className="now-label">Now</span> {s.reading}
            </div>
          </div>
        ))}
      </div>

      <section className="card sources-card">
        <h3>Mark Meldrum's strategy videos</h3>
        <ul className="sources">
          {sources?.map((v) => (
            <li key={v.url}><a href={v.url} target="_blank" rel="noreferrer">{v.title} ↗</a></li>
          ))}
        </ul>
        <p className="muted small">
          These signals are the indicators he tracks in his weekly outlooks, read against live data.
          Thresholds are a transparent, tunable encoding — not his verbatim rules. Informational only,
          not financial advice.
        </p>
      </section>
    </>
  );
}
