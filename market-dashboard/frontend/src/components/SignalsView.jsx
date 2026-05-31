import React from "react";
import AiRead from "./AiRead.jsx";

const POSTURE_COLOR = {
  "Buy setup (capitulation)": "#3fa66a",
  "Accumulate watch": "#6cba8a",
  "Hold / monitor": "#d9a441",
  "Caution": "#e0913f",
  "Sell watch": "#cc4b4b",
};

function StateBadge({ kind, met }) {
  if (kind === "pending") return <span className="sbadge pending">… Awaiting data</span>;
  if (met === true) return <span className="sbadge on">✓ Triggered</span>;
  return <span className="sbadge off">○ Not yet</span>;
}

function SignalRow({ s }) {
  const cls = s.kind === "pending" ? "pending" : s.met ? "on" : "off";
  return (
    <div className={`srow ${cls}`}>
      <div className="srow-top">
        <span className="srow-name">{s.name}</span>
        <StateBadge kind={s.kind} met={s.met} />
      </div>
      <p className="srow-rule">{s.rule}</p>
      {s.criteria && <div className="srow-criteria">Trigger: <b>{s.criteria}</b></div>}
      <div className="srow-now">
        {s.reading}
        {s.source_url && (
          <> · <a href={s.source_url} target="_blank" rel="noreferrer">{s.source_label || "chart"} ↗</a></>
        )}
      </div>
    </div>
  );
}

export default function SignalsView({ playbook, aiSource = "llm" }) {
  if (!playbook) return <p className="muted">No signal data yet — refresh the data.</p>;
  const { posture, buy_signals, sell_signals, buy_met, buy_total, sell_met, sell_total, pending, fmp_enabled } = playbook;

  return (
    <>
      <AiRead text={playbook.analysis} source={aiSource} />
      <section className="card posture-card">
        <div className="posture-main">
          <span className="hero-eyebrow">Signal model — current posture</span>
          <span className="posture-label" style={{ color: POSTURE_COLOR[posture] || "#d9a441" }}>{posture}</span>
        </div>
        <div className="tally">
          <span className="tally-item"><b style={{ color: "#3fa66a" }}>{buy_met}/{buy_total}</b> buy</span>
          <span className="tally-item"><b style={{ color: "#cc4b4b" }}>{sell_met}/{sell_total}</b> sell</span>
        </div>
      </section>

      {pending > 0 && (
        <div className="banner info">
          {fmp_enabled ? (
            <>{pending} signal{pending > 1 ? "s" : ""} couldn't be computed this run — the FMP free
            daily limit (250 requests) was likely reached. They refresh on the next run.</>
          ) : (
            <>{pending} signal{pending > 1 ? "s" : ""} awaiting a data source. Add an <code>FMP_API_KEY</code> repo
            secret (free Financial Modeling Prep key) to compute the sector & earnings signals.</>
          )}
        </div>
      )}

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

      <p className="foot muted">
        Every signal is computed from data — FRED, FINRA margin statistics, and Financial Modeling Prep.
        Thresholds are transparent and tunable. Informational only, not financial advice.
      </p>
    </>
  );
}
