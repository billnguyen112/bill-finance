import React from "react";
import { num } from "../format.js";
import AiRead from "./AiRead.jsx";

function signed(v) {
  if (v == null) return <span className="muted">—</span>;
  const c = v > 0 ? "pos" : v < 0 ? "neg" : "";
  return <span className={c}>{v > 0 ? "+" : ""}{num(v, 1)}%</span>;
}

export default function WatchlistCard({ watchlist, aiSource = "llm" }) {
  if (!watchlist || !(watchlist.items || []).length) return null;
  return (
    <section className="card">
      <span className="hero-eyebrow">Key ETFs</span>
      <p className="muted small" style={{ margin: "6px 0 4px" }}>
        How to read: <b>1W</b> = week-on-week move (momentum). <b>1M / 1Y</b> = recent vs longer-term performance.
        <b> % from high</b> = distance below the 52-week high — near 0% is strength, deeply negative is weakness/stress.
        Watch small caps (IWM) &amp; banks (KRE) for risk appetite, defensives (XLP/XLU) &amp; bonds (TLT) for risk-off.
      </p>
      <div className="semis-table-wrap" style={{ marginTop: 8 }}>
        <table className="semis-table">
          <thead>
            <tr><th className="l">ETF</th><th>Price</th><th>1W</th><th>1M</th><th>1Y</th><th>% from high</th></tr>
          </thead>
          <tbody>
            {watchlist.items.map((it) => (
              <tr key={it.symbol}>
                <td className="l">
                  <span className="sym">{it.symbol}</span>
                  <span className="cname">{it.role}</span>
                </td>
                <td>{it.price != null ? `$${num(it.price, 2)}` : "—"}</td>
                <td>{signed(it.w1)}</td>
                <td>{signed(it.m1)}</td>
                <td>{signed(it.y1)}</td>
                <td>{signed(it.pct_from_high)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AiRead text={watchlist.analysis} source={aiSource} />
    </section>
  );
}
