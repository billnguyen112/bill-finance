import React from "react";
import { num } from "../format.js";

function signed(v) {
  if (v == null) return <span className="muted">—</span>;
  const c = v > 0 ? "pos" : v < 0 ? "neg" : "";
  return <span className={c}>{v > 0 ? "+" : ""}{num(v, 1)}%</span>;
}

export default function WatchlistCard({ watchlist }) {
  if (!watchlist || !(watchlist.items || []).length) return null;
  return (
    <section className="card">
      <span className="hero-eyebrow">What he's pointing at — key ETFs he tracks</span>
      <div className="semis-table-wrap" style={{ marginTop: 10 }}>
        <table className="semis-table">
          <thead>
            <tr><th className="l">ETF</th><th>Price</th><th>% from high</th><th>1M</th><th>1Y</th></tr>
          </thead>
          <tbody>
            {watchlist.items.map((it) => (
              <tr key={it.symbol}>
                <td className="l">
                  <span className="sym">{it.symbol}</span>
                  <span className="cname">{it.role}</span>
                </td>
                <td>{it.price != null ? `$${num(it.price, 2)}` : "—"}</td>
                <td>{signed(it.pct_from_high)}</td>
                <td>{signed(it.m1)}</td>
                <td>{signed(it.y1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
