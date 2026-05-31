import React from "react";

function latestPerChannel(archive) {
  if (!archive || !(archive.videos || []).length) return null;
  const seen = new Set(), items = [];
  for (const v of archive.videos) {
    if (!seen.has(v.channel)) { seen.add(v.channel); items.push(v); }
  }
  return { items };
}

export default function ViewsView({ views, archive, sections }) {
  // Fall back to the archive's latest-per-channel if the snapshot has no views.
  if (!views || !(views.items || []).length) views = latestPerChannel(archive);
  if (!views || !(views.items || []).length) {
    return (
      <div className="banner info">
        Transcript digests need the <code>SUPADATA_API_KEY</code> secret. Once set, the weekly build pulls
        each channel's latest market update and digests it here.
      </div>
    );
  }
  const secByKey = Object.fromEntries((sections || []).map((s) => [s.key, s]));

  return (
    <>
      {views.items.map((it) => (
        <section className="card" key={it.channel}>
          <div className="views-head">
            <h3 className="val-h">{it.channel}</h3>
            <a href={it.video.url} target="_blank" rel="noreferrer" className="views-vid">{it.video.title} ↗</a>
          </div>
          <div className="views-meta muted">
            {it.video.published} · {Number(it.word_count).toLocaleString()} words{" "}
            {it.channel === "Mark Meldrum" ? "(spotlight trimmed)" : ""}
          </div>
          {it.tldr && <p className="views-tldr">{it.tldr}</p>}

          {it.themes.map((t) => (
            <div className="views-theme" key={t.theme}>
              <div className="views-theme-h">
                <span className="vt-name">{t.theme}</span>
                <span className="vt-count muted">{t.mentions} mentions</span>
              </div>
              <ul className="views-points">{t.points.map((p, i) => <li key={i}>{p}</li>)}</ul>
              {t.section && secByKey[t.section]?.summary && (
                <div className="views-ourread"><b>Your live read →</b> {secByKey[t.section].summary}</div>
              )}
            </div>
          ))}

          {it.tickers?.length > 0 && (
            <div className="views-tickers"><b>Tickers mentioned:</b> {it.tickers.join(", ")}</div>
          )}
        </section>
      ))}
      <p className="foot muted">
        Latest weekly transcripts via Supadata (server-side, works from the cloud), digested by keyword (no LLM)
        and mapped onto your live tracker sections. Informational only, not financial advice.
      </p>
    </>
  );
}
