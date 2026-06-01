import React from "react";
import { num, fmtDate } from "../format.js";
import AiRead from "./AiRead.jsx";

function strengthColor(s) {
  if (s == null) return "#8b94a3";
  if (s >= 70) return "#3fa66a";
  if (s >= 50) return "#6cba8a";
  if (s >= 30) return "#d9a441";
  return "#cc4b4b";
}

function signed(v, suffix = "%") {
  if (v == null) return <span className="muted">—</span>;
  const cls = v > 0 ? "pos" : v < 0 ? "neg" : "";
  return <span className={cls}>{v > 0 ? "+" : ""}{num(v, 1)}{suffix}</span>;
}

function mcap(v) {
  if (!v) return "—";
  if (v >= 1e12) return `$${num(v / 1e12, 2)}T`;
  return `$${num(v / 1e9, 0)}B`;
}

export default function SemisView({ semis, aiSource = "llm" }) {
  if (!semis) {
    return <div className="banner info">Semiconductor data needs the <code>FMP_API_KEY</code> secret. Once it's set, this fills in on the next refresh.</div>;
  }
  const s = semis;
  const Stat = ({ label, value }) => (
    <div className="sstat"><span className="sstat-v">{value}</span><span className="sstat-l">{label}</span></div>
  );

  return (
    <>
      <section className="card semis-hero">
        <div className="semis-score">
          <span className="hero-eyebrow">Semiconductor strength</span>
          <span className="semis-num" style={{ color: strengthColor(s.strength) }}>
            {s.strength != null ? s.strength : "—"}<small>/100</small>
          </span>
          <span className="semis-label" style={{ color: strengthColor(s.strength) }}>{s.strength_label}</span>
        </div>
        <div className="sstats">
          <Stat label="above 50-day" value={s.breadth_50dma != null ? `${s.breadth_50dma}%` : "—"} />
          <Stat label="above 200-day" value={s.breadth_200dma != null ? `${s.breadth_200dma}%` : "—"} />
          <Stat label="within 10% of 1y high" value={s.near_high_pct != null ? `${s.near_high_pct}%` : "—"} />
          <Stat label="median rev growth y/y" value={s.median_rev_growth != null ? `${s.median_rev_growth > 0 ? "+" : ""}${num(s.median_rev_growth, 1)}%` : "—"} />
          <Stat label="growing revenue" value={`${s.growing_count}/${s.rev_reported}`} />
          <Stat label="median 3m return" value={s.median_3m != null ? `${s.median_3m > 0 ? "+" : ""}${num(s.median_3m, 1)}%` : "—"} />
        </div>
      </section>

      <AiRead text={s.analysis} source={aiSource} />

      {s.upcoming_earnings?.length > 0 && (
        <div className="banner info">
          📅 Earnings in the next 2 weeks: {s.upcoming_earnings.map((e) => `${e.symbol} (${fmtDate(e.date)})`).join(" · ")}
        </div>
      )}

      {(s.group_order || []).map((g) => {
        const rows = s.companies.filter((c) => c.group === g);
        if (!rows.length) return null;
        return (
          <section className="card" key={g}>
            <h3 className="val-h">{g} <span className="cnt">{rows.length} names</span></h3>
            <div className="semis-table-wrap">
              <table className="semis-table">
                <thead>
                  <tr>
                    <th className="l">Company</th><th>Price</th><th>% from high</th>
                    <th>1W</th><th>1M</th><th>1Y</th><th>Fwd P/E</th><th>FY28 P/E</th><th>Rev y/y</th><th>Next earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.symbol}>
                      <td className="l">
                        <span className="sym">{c.symbol}</span>
                        <span className="cname">{c.name}</span>
                      </td>
                      <td>{c.price != null ? `$${num(c.price, 2)}` : "—"} <span className="mc">{mcap(c.market_cap)}</span></td>
                      <td>{signed(c.pct_from_high)}</td>
                      <td>{signed(c.w1)}</td>
                      <td>{signed(c.m1)}</td>
                      <td>{signed(c.y1)}</td>
                      <td>{c.fwd_pe != null ? num(c.fwd_pe, 1) : <span className="muted">—</span>}</td>
                      <td>{c.fwd_pe_2028 != null ? num(c.fwd_pe_2028, 1) : <span className="muted">—</span>}</td>
                      <td>{signed(c.rev_yoy)}</td>
                      <td className="ne">{c.next_earnings ? fmtDate(c.next_earnings) : <span className="muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <p className="foot muted">
        {s.count} names across {(s.group_order || []).length} groups · price/momentum, 52-week range, fwd &amp;
        FY28 P/E, revenue growth, and earnings dates from FMP. Strength blends breadth, momentum, and revenue
        growth. Informational only.
      </p>
    </>
  );
}
