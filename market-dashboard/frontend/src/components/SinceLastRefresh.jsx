import React, { useState } from "react";
import { fmtDateTime } from "../format.js";

export default function SinceLastRefresh({ data }) {
  const [open, setOpen] = useState(false);
  if (!data) return null;
  const { headline, bullets = [], changes = [], source, prev_generated_at } = data;
  const hasMoves = changes.length > 0;
  return (
    <section className="card since-card">
      <div className="since-head">
        <span className="hero-eyebrow">Since last refresh</span>
        <span className="since-tag">{source === "llm" ? "AI read" : "auto read"}</span>
      </div>
      {headline && <p className="since-headline">{headline}</p>}
      {bullets.length > 0 && (
        <ul className="since-bullets">
          {bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      )}
      {hasMoves && (
        <div className="since-foot">
          <button className="since-toggle" onClick={() => setOpen((o) => !o)}>
            {open ? "▾" : "▸"} {changes.length} data move{changes.length === 1 ? "" : "s"}
          </button>
          {open && (
            <ul className="since-changes">
              {changes.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          )}
        </div>
      )}
      {prev_generated_at && (
        <div className="since-asof">vs refresh of {fmtDateTime(prev_generated_at)}</div>
      )}
    </section>
  );
}
