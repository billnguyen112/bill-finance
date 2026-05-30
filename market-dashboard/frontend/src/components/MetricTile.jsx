import React from "react";
import Sparkline from "./Sparkline.jsx";
import { fmtHeadline, changeDisplay, scoreColor, fmtDate } from "../format.js";

function Delta({ m, horizon, label }) {
  const d = changeDisplay(m, horizon);
  if (!d) return null;
  const cls = d.dir > 0 ? "up" : d.dir < 0 ? "down" : "flat";
  return (
    <span className={`delta ${cls}`} title={`change ${label}`}>
      <span className="dh">{label}</span> {d.text}
    </span>
  );
}

export default function MetricTile({ m }) {
  if (m.status !== "ok") {
    return (
      <div className="tile err" title={m.error}>
        <div className="t-label">{m.label}</div>
        <div className="t-missing">no data</div>
      </div>
    );
  }
  const sig = m.signal;
  const sparkColor = sig ? scoreColor(sig.score) : "#6b7585";
  return (
    <div className="tile">
      <div className="t-top">
        <span className="t-label">{m.label}</span>
        {sig && <span className="t-dot" style={{ background: scoreColor(sig.score) }} title={sig.label} />}
      </div>
      <div className="t-value">{fmtHeadline(m)}</div>
      <div className="t-deltas">
        <Delta m={m} horizon="1w" label="1w" />
        <Delta m={m} horizon="1m" label="1m" />
        <Delta m={m} horizon="1y" label="1y" />
        {!m.changes?.["1w"] && <Delta m={m} horizon="prev" label="Δ" />}
      </div>
      <Sparkline data={m.spark} color={sparkColor} w={170} h={32} />
      {sig && <div className="t-note">{sig.note}</div>}
      <div className="t-asof">as of {fmtDate(m.latest?.date)}</div>
    </div>
  );
}
