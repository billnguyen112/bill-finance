import React from "react";
import { num } from "../format.js";

const TONE = { good: "#3fa66a", ok: "#6cba8a", warn: "#d9a441", bad: "#cc4b4b" };
const toneColor = (t) => TONE[t] || "#8b94a3";

function VixBand({ vix }) {
  if (!vix) return null;
  const max = vix.max || 45;
  const pct = (x) => `${Math.max(0, Math.min(100, (x / max) * 100))}%`;
  return (
    <div className="gauge-cell">
      <div className="gauge-cell-head">
        <span className="gc-title">VIX regime <span className="gc-by">— my fear bands</span></span>
        <span className="gc-val" style={{ color: toneColor(vix.tone) }}>{num(vix.value, 1)}</span>
      </div>
      <div className="vixband">
        {(vix.bands || []).map((b) => (
          <div key={b.label} className="vixband-seg"
               style={{ left: pct(b.lo), width: pct(b.hi - b.lo), background: toneColor(b.tone), opacity: 0.32 }} />
        ))}
        {(vix.bands || []).slice(1).map((b) => (
          <div key={`t-${b.lo}`} className="vixband-tick" style={{ left: pct(b.lo) }}><span>{b.lo}</span></div>
        ))}
        <div className="vixband-marker" style={{ left: pct(vix.value), borderColor: toneColor(vix.tone) }} />
      </div>
      <div className="gc-zone" style={{ color: toneColor(vix.tone) }}>{vix.zone} <span className="muted">— {vix.note}</span></div>
      {vix.explain?.lens && <div className="gc-lens">{vix.explain.lens}</div>}
    </div>
  );
}

function ErpCell({ erp }) {
  if (!erp) return null;
  return (
    <div className="gauge-cell">
      <div className="gauge-cell-head">
        <span className="gc-title">Equity risk premium <span className="gc-by">— earnings yield − 10Y</span></span>
        <span className="gc-val" style={{ color: toneColor(erp.tone) }}>{erp.spread > 0 ? "+" : ""}{num(erp.spread, 2)}%</span>
      </div>
      <div className="erp-row">
        <div className="erp-stat"><span className="erp-n">{num(erp.earnings_yield, 2)}%</span><span className="erp-l">earnings yield (1÷CAPE {num(erp.cape, 0)})</span></div>
        <div className="erp-op">−</div>
        <div className="erp-stat"><span className="erp-n">{num(erp.ten_year, 2)}%</span><span className="erp-l">10Y Treasury</span></div>
      </div>
      <div className="gc-zone" style={{ color: toneColor(erp.tone) }}>{erp.label}</div>
      {erp.explain?.lens && <div className="gc-lens">{erp.explain.lens}</div>}
    </div>
  );
}

function MfgCell({ mfg }) {
  if (!mfg) return null;
  const part = (v) => (v == null ? "—" : `${v > 0 ? "+" : ""}${num(v, 1)}`);
  return (
    <div className="gauge-cell">
      <div className="gauge-cell-head">
        <span className="gc-title">Manufacturing pulse <span className="gc-by">— free ISM stand-in</span></span>
        <span className="gc-val" style={{ color: toneColor(mfg.tone) }}>{part(mfg.avg)}</span>
      </div>
      <div className="erp-row">
        <div className="erp-stat"><span className="erp-n">{part(mfg.empire)}</span><span className="erp-l">Empire State</span></div>
        <div className="erp-op">·</div>
        <div className="erp-stat"><span className="erp-n">{part(mfg.philly)}</span><span className="erp-l">Philly Fed</span></div>
      </div>
      <div className="gc-zone" style={{ color: toneColor(mfg.tone) }}>{mfg.zone}</div>
      <div className="gc-lens">
        My free stand-in for the ISM: the average of the regional Fed manufacturing surveys.
        Above 0 = factory expansion (good), below 0 = contraction (bad). (Services PMI isn't freely available.)
      </div>
    </div>
  );
}

export default function GaugesCard({ gauges }) {
  if (!gauges || (!gauges.vix && !gauges.erp && !gauges.mfg_pulse)) return null;
  return (
    <section className="card gauges-card">
      <span className="hero-eyebrow">Sentiment &amp; valuation — my rules</span>
      <div className="gauges-grid">
        <VixBand vix={gauges.vix} />
        <ErpCell erp={gauges.erp} />
        <MfgCell mfg={gauges.mfg_pulse} />
      </div>
    </section>
  );
}
