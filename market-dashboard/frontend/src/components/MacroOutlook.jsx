import React, { useState } from "react";
import { fmtDateTime } from "../format.js";

export default function MacroOutlook({ macro }) {
  const [open, setOpen] = useState(false);
  if (!macro) return null;
  const { regime, outlook, changes = [], source, prev_generated_at } = macro;
  return (
    <section className="card since-card">
      <div className="since-head">
        <span className="hero-eyebrow">Macro outlook{regime ? ` — ${regime}` : ""}</span>
        <span className="since-tag">{source === "llm" ? "AI read" : "auto read"}</span>
      </div>
      {outlook && <p className="since-headline">{outlook}</p>}
      {changes.length > 0 && (
        <div className="since-foot">
          <button className="since-toggle" onClick={() => setOpen((o) => !o)}>
            {open ? "▾" : "▸"} {changes.length} data move{changes.length === 1 ? "" : "s"} since last refresh
          </button>
          {open && (
            <ul className="since-changes">
              {changes.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          )}
        </div>
      )}
      {prev_generated_at && (
        <div className="since-asof">compared with refresh of {fmtDateTime(prev_generated_at)}</div>
      )}
    </section>
  );
}
