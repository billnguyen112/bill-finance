import React, { useState } from "react";
import Brief from "./Brief.jsx";

function keyPoints(v, max = 5) {
  // one representative point from each theme, in theme order, up to `max`.
  const pts = [];
  for (const t of v.themes || []) {
    if (t.points && t.points.length) pts.push({ theme: t.theme, text: t.points[0] });
    if (pts.length >= max) break;
  }
  return pts;
}

function Entry({ v }) {
  const [open, setOpen] = useState(false);
  const pts = keyPoints(v);
  return (
    <div className="arc-entry">
      <button className="arc-head" onClick={() => setOpen((o) => !o)}>
        <span className="arc-date">{v.date}</span>
        <span className="arc-chan">{v.channel}</span>
        <span className="arc-title">{v.title}</span>
        <span className="arc-caret">{open ? "▾" : "▸"}</span>
      </button>
      <div className="arc-themes">
        {(v.themes || []).slice(0, 6).map((t) => (
          <span className="chip" key={t.theme}>{t.theme} <b>{t.mentions}</b></span>
        ))}
      </div>
      {open && (
        <div className="arc-body">
          {v.brief ? (
            <Brief brief={v.brief} />
          ) : (
            <ul className="arc-points">
              {pts.map((p, i) => (
                <li key={i}><span className="arc-pt-theme">{p.theme}:</span> {p.text}</li>
              ))}
            </ul>
          )}
          {v.tickers?.length > 0 && (
            <div className="arc-tickers"><b>Tickers:</b> {v.tickers.join(", ")}</div>
          )}
          <a className="arc-watch" href={v.url} target="_blank" rel="noreferrer">Watch ↗</a>
        </div>
      )}
    </div>
  );
}

export default function ArchiveView({ archive }) {
  if (!archive || !(archive.videos || []).length) {
    return (
      <div className="banner info">
        The transcript archive builds up as the weekly job runs (needs the <code>SUPADATA_API_KEY</code> secret).
        It back-fills ~3 months on the first run, then adds each new update.
      </div>
    );
  }
  return (
    <>
      <section className="card">
        <span className="hero-eyebrow">Market-update archive — key points by date (~3 months)</span>
        <p className="muted small" style={{ margin: "6px 0 0" }}>
          {archive.videos.length} updates digested. Click any week to expand the key points and tickers.
        </p>
      </section>
      <section className="card">
        {archive.videos.map((v) => <Entry key={v.video_id} v={v} />)}
      </section>
      <p className="foot muted">
        Transcripts via Supadata, digested by keyword (no LLM). Each video fetched once. Informational only.
      </p>
    </>
  );
}
