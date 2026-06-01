import React, { useState } from "react";
import Sparkline from "./Sparkline.jsx";
import { fmtHeadline, changeDisplay, scoreColor, fmtDate, equityMove, moveColor } from "../format.js";

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
  const [open, setOpen] = useState(false);
  if (m.status !== "ok") {
    return (
      <div className="tile err" title={m.error}>
        <div className="t-label">{m.label}</div>
        <div className="t-missing">no data</div>
      </div>
    );
  }
  const sig = m.signal;
  // Colour the sparkline green/red by whether the recent move is good or bad for
  // equities — using the rule signal when present, else the metric's move direction.
  const sparkColor = sig ? scoreColor(sig.score) : moveColor(equityMove(m));
  return (
    <div className="tile">
      <div className="t-top">
        <span className="t-label">
          {m.label}
          {m.explain && (
            <button className="info-btn" onClick={() => setOpen((o) => !o)}
                    aria-label="What this means" title="What this means">ⓘ</button>
          )}
        </span>
        {sig && <span className="t-dot" style={{ background: scoreColor(sig.score) }} title={sig.label} />}
      </div>
      {open && m.explain && (
        <div className="t-explain">
          <p><b>What it means:</b> {m.explain.what}</p>
          {m.explain.lens && <p className="how"><b>My rule:</b> {m.explain.lens}</p>}
        </div>
      )}
      <div className="t-value">{fmtHeadline(m)}</div>
      <div className="t-deltas">
        <Delta m={m} horizon="1w" label="1w" />
        <Delta m={m} horizon="1m" label="1m" />
        <Delta m={m} horizon="1y" label="1y" />
        {!m.changes?.["1w"] && <Delta m={m} horizon="prev" label="Δ" />}
      </div>
      <Sparkline data={m.spark} color={sparkColor} w={170} h={32} />
      {sig && <div className="t-note">{sig.note}</div>}
      <div className="t-asof">
        as of {fmtDate(m.latest?.date)}
        {m.source_url && <> · <a href={m.source_url} target="_blank" rel="noreferrer" className="src-link">source ↗</a></>}
      </div>
    </div>
  );
}
