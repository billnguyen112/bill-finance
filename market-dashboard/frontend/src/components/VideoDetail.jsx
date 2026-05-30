import React from "react";
import { sentimentColor, fmtScore, fmtDate } from "../sentiment.js";

function Pill({ score, label }) {
  return (
    <span className="pill" style={{ background: sentimentColor(score), color: "#10141c" }}>
      {label} {fmtScore(score)}
    </span>
  );
}

function List({ title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="detail-block">
      <h4>{title}</h4>
      <ul>{items.map((it, i) => <li key={i}>{it}</li>)}</ul>
    </div>
  );
}

// sentiment label has no numeric score on a section; approximate for colour.
const LABEL_SCORE = {
  bullish: 0.8, "cautiously bullish": 0.4, neutral: 0,
  "cautiously bearish": -0.4, bearish: -0.8,
};

export default function VideoDetail({ record, loading }) {
  if (loading) return <div className="detail card"><p className="muted">Loading…</p></div>;
  if (!record) {
    return (
      <div className="detail card empty-detail">
        <p className="muted">Select a week on the left to see the AI breakdown.</p>
      </div>
    );
  }

  const a = record.analysis || {};
  const sent = a.overall_sentiment || {};

  return (
    <div className="detail card">
      <div className="detail-head">
        <div>
          <h2>{record.title}</h2>
          <div className="detail-meta">
            <span>{fmtDate(record.published_at)}</span>
            <a href={record.url} target="_blank" rel="noreferrer">Watch ↗</a>
            {a._provider && <span className="muted">via {a._provider}{a._model ? ` · ${a._model}` : ""}</span>}
          </div>
        </div>
        {sent.label && <Pill score={sent.score} label={sent.label} />}
      </div>

      {a.tldr && <p className="tldr">{a.tldr}</p>}
      {sent.rationale && <p className="muted rationale">{sent.rationale}</p>}

      <div className="detail-grid">
        <List title="Key risks" items={a.key_risks} />
        <List title="Key opportunities" items={a.key_opportunities} />
        <List title="Positioning" items={a.positioning} />
      </div>

      {a.tickers_mentioned?.length > 0 && (
        <div className="detail-block">
          <h4>Tickers (macro)</h4>
          <div className="tickers">
            {a.tickers_mentioned.map((t) => <span key={t} className="ticker">{t}</span>)}
          </div>
        </div>
      )}

      {a.sections?.length > 0 && (
        <div className="detail-block">
          <h4>Section breakdown</h4>
          {a.sections.map((s, i) => (
            <div className="section" key={i}>
              <div className="section-head">
                <strong>{s.topic}</strong>
                <span className="dot" style={{ background: sentimentColor(LABEL_SCORE[s.sentiment] ?? 0) }}
                      title={s.sentiment} />
              </div>
              <p>{s.summary}</p>
              {s.data_points?.length > 0 && (
                <ul className="datapoints">
                  {s.data_points.map((d, j) => <li key={j}>{d}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {a.notable_quotes?.length > 0 && (
        <div className="detail-block">
          <h4>Notable quotes</h4>
          {a.notable_quotes.map((q, i) => <blockquote key={i}>“{q}”</blockquote>)}
        </div>
      )}
    </div>
  );
}
