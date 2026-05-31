import React, { useEffect, useState, useCallback } from "react";
import { getSnapshot, getHistory, getArchive, refresh, probeBackend, actionsUrl } from "./api.js";
import { scoreColor, fmtDateTime, num } from "./format.js";
import MetricTile from "./components/MetricTile.jsx";
import CurveChart from "./components/CurveChart.jsx";
import ScoreHistory from "./components/ScoreHistory.jsx";
import SignalsView from "./components/SignalsView.jsx";
import SemisView from "./components/SemisView.jsx";
import ValuationView from "./components/ValuationView.jsx";
import SourcesView from "./components/SourcesView.jsx";
import FedView from "./components/FedView.jsx";
import ViewsView from "./components/ViewsView.jsx";
import ArchiveView from "./components/ArchiveView.jsx";
import WatchlistCard from "./components/WatchlistCard.jsx";

function SectionCard({ sec }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="card section">
      <div className="section-head">
        <h3>{sec.label}</h3>
        {sec.explain && (
          <button className="info-btn" onClick={() => setOpen((o) => !o)}
                  title="What this section covers">ⓘ</button>
        )}
      </div>
      {open && sec.explain && <p className="section-explain">{sec.explain}</p>}
      {sec.summary && <p className="section-summary">{sec.summary}</p>}
      <div className="tiles">
        {sec.metrics.map((m) => <MetricTile key={m.key} m={m} />)}
      </div>
    </section>
  );
}

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
  const [archive, setArchive] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [backend, setBackend] = useState(null); // null=unknown, true/false once probed
  const [view, setView] = useState("dashboard"); // "dashboard" | "signals"
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  useEffect(() => { probeBackend().then(setBackend); }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const load = useCallback(async () => {
    try {
      const [s, h, a] = await Promise.all([getSnapshot(), getHistory(), getArchive().catch(() => null)]);
      setSnap(s);
      setHistory(h);
      setArchive(a);
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
          <button className="btn ghost" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  title="Toggle light / dark" aria-label="Toggle theme">
            {theme === "dark" ? "☀" : "☾"}
          </button>
          {snap && <span className="asof muted">updated {fmtDateTime(snap.generated_at)}</span>}
          {backend === false && actionsUrl() ? (
            <a className="btn primary" href={actionsUrl()} target="_blank" rel="noreferrer"
               title="Opens GitHub Actions — click Run workflow to rescrape">
              ↻ Refresh via GitHub Actions ↗
            </a>
          ) : (
            <button className="btn primary" disabled={refreshing || backend === false} onClick={doRefresh}>
              {refreshing ? "Scraping…" : "↻ Refresh data"}
            </button>
          )}
        </div>
      </header>

      {snap?.fred_mode === "csv" && snap?.errors?.length > 0 && (
        <div className="banner err">
          FRED is running <b>keyless</b> (the public endpoint throttles in the cloud, so{" "}
          {snap.errors.length} series failed). Add a <code>FRED_API_KEY</code> repo secret
          (exact name) and re-run the workflow.
        </div>
      )}
      {status && <div className="banner ok">{status}</div>}
      {error && (
        <div className="banner err">
          {backend === false
            ? "No data published yet — open the Actions tab and click “Run workflow”, then reload."
            : error.includes("no snapshot")
            ? "No data yet — click Refresh data, or run `python pipeline/run.py refresh`."
            : "Can't reach the backend. Start it: `python pipeline/server.py`."}
        </div>
      )}

      {snap && (
        <nav className="tabs">
          <button className={"tab" + (view === "dashboard" ? " active" : "")}
                  onClick={() => setView("dashboard")}>Dashboard</button>
          <button className={"tab" + (view === "signals" ? " active" : "")}
                  onClick={() => setView("signals")}>Signals</button>
          <button className={"tab" + (view === "views" ? " active" : "")}
                  onClick={() => setView("views")}>Their Views</button>
          <button className={"tab" + (view === "archive" ? " active" : "")}
                  onClick={() => setView("archive")}>Archive</button>
          <button className={"tab" + (view === "fed" ? " active" : "")}
                  onClick={() => setView("fed")}>Fed Watch</button>
          <button className={"tab" + (view === "semis" ? " active" : "")}
                  onClick={() => setView("semis")}>Semiconductors</button>
          <button className={"tab" + (view === "valuation" ? " active" : "")}
                  onClick={() => setView("valuation")}>Valuation</button>
          <button className={"tab" + (view === "sources" ? " active" : "")}
                  onClick={() => setView("sources")}>Sources</button>
        </nav>
      )}

      {view === "dashboard" && (<>
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

      <WatchlistCard watchlist={snap?.watchlist} />

      {snap?.sections?.map((sec) => <SectionCard key={sec.key} sec={sec} />)}
      </>)}

      {view === "signals" && <SignalsView playbook={snap?.playbook} />}

      {view === "views" && <ViewsView views={snap?.views} sections={snap?.sections} />}

      {view === "archive" && <ArchiveView archive={archive} />}

      {view === "fed" && <FedView fed={snap?.fed} />}

      {view === "semis" && <SemisView semis={snap?.semis} />}

      {view === "valuation" && <ValuationView valuation={snap?.valuation} />}

      {view === "sources" && <SourcesView sources={snap?.sources} />}

      <footer className="foot muted">
        Data: FRED ({snap?.fred_mode === "api" ? "API" : "keyless CSV"}) · FINRA · FMP{" "}
        {snap?.fmp_enabled ? "on" : "off"} · multpl (CAPE). Signals are rule-based, not financial advice.
        {snap?.ok_count != null && ` · ${snap.ok_count}/${snap.total_count} series loaded`}
        {snap?.errors?.length > 0 && `, ${snap.errors.length} unavailable`}.
      </footer>
    </div>
  );
}
