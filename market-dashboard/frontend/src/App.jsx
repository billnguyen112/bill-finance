import React, { useEffect, useState, useCallback } from "react";
import { getSnapshot, getHistory, refresh } from "./api.js";
import { scoreColor, fmtDateTime, num } from "./format.js";
import MetricTile from "./components/MetricTile.jsx";
import CurveChart from "./components/CurveChart.jsx";
import ScoreHistory from "./components/ScoreHistory.jsx";

function Gauge({ score }) {
  // -1..+1 mapped to 0..100% along a red->amber->green track.
  const pct = ((Math.max(-1, Math.min(1, score)) + 1) / 2) * 100;
  return (
    <div className="gauge">
      <div className="gauge-track" />
      <div className="gauge-marker" style={{ left: `calc(${pct}% - 7px)`, borderColor: scoreColor(score) }} />
      <div className="gauge-labels"><span>Risk-Off</span><span>Neutral</span><span>Risk-On</span></div>
    </div>
  );
}

export default function App() {
  const [snap, setSnap] = useState(null);
  const [history, setHistory] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([getSnapshot(), getHistory()]);
      setSnap(s);
      setHistory(h);
      setError(null);
    } catch (e) {
      setSnap(null);
      setError(e.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doRefresh = async () => {
    setRefreshing(true); setStatus(null); setError(null);
    try {
      const res = await refresh();
      setStatus(`Updated · ${res.ok_count}/${res.total_count} series · ${res.overall.label} (${res.overall.score})`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const overall = snap?.overall;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Market Monitor</h1>
          <span className="sub">A weekly macro read, built from raw data — rates · inflation · credit · equities · housing · labor · commodities</span>
        </div>
        <div className="controls">
          {snap && <span className="asof muted">updated {fmtDateTime(snap.generated_at)}</span>}
          <button className="btn primary" disabled={refreshing} onClick={doRefresh}>
            {refreshing ? "Scraping…" : "↻ Refresh data"}
          </button>
        </div>
      </header>

      {status && <div className="banner ok">{status}</div>}
      {error && (
        <div className="banner err">
          {error.includes("no snapshot")
            ? "No data yet — click Refresh data, or run `python pipeline/run.py refresh`."
            : error.includes("api") || error.includes("/api")
            ? "Can't reach the backend. Start it: `python pipeline/server.py`."
            : error}
        </div>
      )}

      {overall && (
        <section className="hero card">
          <div className="hero-main">
            <div className="hero-head">
              <span className="hero-eyebrow">Overall market read</span>
              <span className="hero-label" style={{ color: scoreColor(overall.score) }}>{overall.label}</span>
              <span className="hero-score" style={{ color: scoreColor(overall.score) }}>
                {overall.score > 0 ? "+" : ""}{num(overall.score, 2)}
              </span>
            </div>
            <Gauge score={overall.score} />
            <div className="drivers">
              <div className="drv">
                <h4 className="pos">Supports</h4>
                <ul>{(overall.supports || []).map((s, i) => <li key={i}>{s}</li>)}
                  {(overall.supports || []).length === 0 && <li className="muted">—</li>}</ul>
              </div>
              <div className="drv">
                <h4 className="neg">Concerns</h4>
                <ul>{(overall.concerns || []).map((s, i) => <li key={i}>{s}</li>)}
                  {(overall.concerns || []).length === 0 && <li className="muted">—</li>}</ul>
              </div>
            </div>
          </div>
          <div className="hero-side">
            <div className="side-block">
              <div className="side-head"><span>Risk score history</span></div>
              <ScoreHistory points={history?.points} />
            </div>
            {snap.cape != null && (
              <div className="cape">
                <span className="cape-label">Shiller CAPE</span>
                <span className="cape-val">{num(snap.cape, 1)}</span>
                <span className="cape-note">{snap.cape > 30 ? "richly valued" : "fair"}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {snap?.curve?.length > 0 && (
        <section className="card curve-card">
          <h3>Treasury yield curve</h3>
          <CurveChart curve={snap.curve} />
        </section>
      )}

      {snap?.sections?.map((sec) => (
        <section className="card section" key={sec.key}>
          <div className="section-head">
            <h3>{sec.label}</h3>
          </div>
          {sec.summary && <p className="section-summary">{sec.summary}</p>}
          <div className="tiles">
            {sec.metrics.map((m) => <MetricTile key={m.key} m={m} />)}
          </div>
        </section>
      ))}

      <footer className="foot muted">
        Data: FRED (fredgraph.csv, no key) + multpl.com (CAPE). Signals are rule-based, not financial advice.
        {snap?.errors?.length > 0 && ` · ${snap.errors.length} series unavailable this run.`}
      </footer>
    </div>
  );
}
