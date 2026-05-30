import React from "react";
import { num } from "../format.js";

const COLOR = { Frothy: "#cc4b4b", Elevated: "#d9a441", Normal: "#3fa66a" };

export default function BubbleCard({ bubble }) {
  if (!bubble) return null;
  const c = bubble.cape;
  return (
    <section className="card bubble-card">
      <div className="bubble-main">
        <span className="hero-eyebrow">Bubble watch — valuation & concentration ("1999 again?")</span>
        <span className="bubble-score" style={{ color: COLOR[bubble.label] || "#d9a441" }}>
          {bubble.label}{bubble.score != null && <small> · {bubble.score}/100</small>}
        </span>
      </div>
      <div className="bubble-stats">
        {c && (
          <div className="vstat">
            <span className="vstat-v">{num(c.value, 1)}</span>
            <span className="vstat-l">Shiller CAPE — {c.pct_of_2000_stretch}% of the way from its {c.mean} mean to the 2000 peak ({c.peak_2000})</span>
          </div>
        )}
        {bubble.mag7_total_t != null && (
          <div className="vstat">
            <span className="vstat-v">${num(bubble.mag7_total_t, 1)}T</span>
            <span className="vstat-l">Magnificent-7 combined market cap</span>
          </div>
        )}
        {bubble.mag7_pct_gdp != null && (
          <div className="vstat">
            <span className="vstat-v">{num(bubble.mag7_pct_gdp, 0)}%</span>
            <span className="vstat-l">Mag-7 as a share of US GDP</span>
          </div>
        )}
      </div>
    </section>
  );
}
