import React, { useEffect, useState, useCallback } from "react";
import { getIndex, getTrends, getVideo, refresh } from "./api.js";
import { sentimentColor, fmtScore, fmtDate } from "./sentiment.js";
import TrendChart from "./components/TrendChart.jsx";
import VideoDetail from "./components/VideoDetail.jsx";

export default function App() {
  const [index, setIndex] = useState(null);
  const [trends, setTrends] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState(null);
  const [manualId, setManualId] = useState("");
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [idx, trd] = await Promise.all([getIndex(), getTrends()]);
      setIndex(idx);
      setTrends(trd);
      setError(null);
      if (!selectedId && idx.videos?.length) setSelectedId(idx.videos[0].video_id);
    } catch (e) {
      setError("Can't reach the API. Start the backend: `python pipeline/server.py`");
    }
  }, [selectedId]);

  useEffect(() => { loadData(); }, []); // eslint-disable-line

  useEffect(() => {
    if (!selectedId) return;
    setDetailLoading(true);
    getVideo(selectedId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const doRefresh = async (body) => {
    setRefreshing(true);
    setStatus(null);
    setError(null);
    try {
      const res = await refresh(body);
      const parts = [`provider: ${res.provider}`, `analysed: ${res.analysed}`];
      if (res.errors) parts.push(`errors: ${res.errors}`);
      setStatus(parts.join(" · "));
      const errs = (res.processed || []).filter((p) => p.status === "error");
      if (errs.length) setStatus((s) => `${s} — ${errs[0].reason}`);
      await loadData();
      const done = (res.processed || []).find((p) => p.status === "analysed");
      if (done) setSelectedId(done.video_id);
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const videos = index?.videos || [];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Meldrum Market Monitor</h1>
          <span className="sub">Weekly macro breakdowns from {index?.channel?.name || "Mark Meldrum"}, analysed by AI</span>
        </div>
        <div className="controls">
          <button className="btn primary" disabled={refreshing} onClick={() => doRefresh({ limit: 1 })}>
            {refreshing ? "Refreshing…" : "↻ Pull latest"}
          </button>
          <div className="manual">
            <input
              placeholder="video id or URL"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
            />
            <button
              className="btn"
              disabled={refreshing || !manualId.trim()}
              onClick={() => { doRefresh({ videos: [manualId.trim()] }); setManualId(""); }}
            >Analyse</button>
          </div>
        </div>
      </header>

      {status && <div className="banner ok">{status}</div>}
      {error && <div className="banner err">{error}</div>}

      <section className="trends card">
        <div className="trends-head">
          <h3>Sentiment over time</h3>
          <span className="muted">{index?.count ?? 0} weeks analysed</span>
        </div>
        <TrendChart series={trends?.sentiment_over_time} />
        {trends?.recurring_themes?.length > 0 && (
          <div className="themes">
            {trends.recurring_themes.slice(0, 8).map((t) => (
              <span key={t.theme} className="chip">{t.theme} <b>{t.count}</b></span>
            ))}
          </div>
        )}
      </section>

      <div className="layout">
        <aside className="list">
          {videos.length === 0 && (
            <div className="card empty">
              <p>No analyses yet.</p>
              <p className="muted">Click <b>Pull latest</b> to scrape and analyse the most recent weekly update.</p>
            </div>
          )}
          {videos.map((v) => {
            const sc = v.overall_sentiment?.score ?? 0;
            return (
              <button
                key={v.video_id}
                className={"vcard" + (v.video_id === selectedId ? " active" : "")}
                onClick={() => setSelectedId(v.video_id)}
              >
                <span className="bar" style={{ background: sentimentColor(sc) }} />
                <span className="vcard-body">
                  <span className="vtitle">{v.title}</span>
                  <span className="vmeta">
                    <span>{fmtDate(v.published_at)}</span>
                    {v.overall_sentiment?.label && (
                      <span className="vsent" style={{ color: sentimentColor(sc) }}>
                        {v.overall_sentiment.label} {fmtScore(sc)}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </aside>

        <main className="main">
          <VideoDetail record={detail} loading={detailLoading} />
        </main>
      </div>

      <footer className="foot muted">
        Independent project · not affiliated with Mark Meldrum · transcripts via public captions ·
        spotlight company deep-dive intentionally excluded.
      </footer>
    </div>
  );
}
