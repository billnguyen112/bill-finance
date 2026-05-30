import React from "react";

const POSTURE_COLOR = {
  "Buy setup (capitulation)": "#3fa66a",
  "Accumulate watch": "#6cba8a",
  "Hold / monitor": "#d9a441",
  "Sell watch": "#cc4b4b",
};

function StateBadge({ met, kind }) {
  if (kind === "manual") return <span className="sbadge manual">◆ Your call</span>;
  if (met === true) return <span className="sbadge on">✓ Triggered</span>;
  return <span className="sbadge off">○ Not yet</span>;
}

function SignalRow({ s }) {
  const cls = s.kind === "manual" ? "manual" : s.met ? "on" : "off";
  return (
    <div className={`srow ${cls}`}>
      <div className="srow-top">
        <span className="srow-name">{s.name}</span>
        <StateBadge met={s.met} kind={s.kind} />
      </div>
      <p className="srow-rule">{s.rule}</p>
      <div className="srow-now">
        {s.reading}
        {s.link && <> · <a href={s.link} target="_blank" rel="noreferrer">FINRA data ↗</a></>}
      </div>
    </div>
  );
}

export default function SignalsView({ playbook }) {
  if (!playbook) return <p className="muted">No signal data yet — refresh the data.</p>;
  const { posture, buy_signals, sell_signals, buy_met, buy_total, sell_met, sell_total } = playbook;

  return (
    <>
      <section className="card posture-card">
        <div className="posture-main">
          <span className="hero-eyebrow">Meldrum playbook — current posture</span>
          <span className="posture-label" style={{ color: POSTURE_COLOR[posture] || "#d9a441" }}>{posture}</span>
        </div>
        <div className="tally">
          <span className="tally-item"><b style={{ color: "#3fa66a" }}>{buy_met}/{buy_total}</b> buy</span>
          <span className="tally-item"><b style={{ color: "#cc4b4b" }}>{sell_met}/{sell_total}</b> sell</span>
        </div>
      </section>

      <div className="sig-cols">
        <section className="card sig-col">
          <h3 className="buy-h">▲ Buy signals <span className="cnt">{buy_met}/{buy_total} triggered</span></h3>
          {buy_signals.map((s) => <SignalRow key={s.name} s={s} />)}
        </section>
        <section className="card sig-col">
          <h3 className="sell-h">▼ Sell signals <span className="cnt">{sell_met}/{sell_total} triggered</span></h3>
          {sell_signals.map((s) => <SignalRow key={s.name} s={s} />)}
        </section>
      </div>

      <section className="card sources-card">
        <h3>Mark Meldrum's strategy videos</h3>
        <ul className="sources">
          {playbook.sources?.map((v) => (
            <li key={v.url}><a href={v.url} target="_blank" rel="noreferrer">{v.title} ↗</a></li>
          ))}
        </ul>
        <p className="muted small">
          His own buy/sell checklist (5 buy, 3 sell). Auto-checked where live data covers it (VIX,
          Fed-funds direction, valuation); the qualitative ones — leading sectors, sector earnings,
          tech/semi plateau — and FINRA margin debt are marked “your call.” Informational only, not advice.
        </p>
      </section>
    </>
  );
}
