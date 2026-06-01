import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { num, fmtDate } from "../format.js";
import { getSeries } from "../api.js";

const ChartCtx = createContext(null);
export function useChart() {
  return useContext(ChartCtx) || { open: () => {}, has: () => false };
}

const RANGES = [["1M", 30], ["3M", 91], ["6M", 182], ["1Y", 365], ["5Y", 1825], ["Max", null]];
const AGGS = [["Day", "D"], ["Week", "W"], ["Month", "M"]];

function fmtVal(v, unit) {
  if (v == null) return "—";
  if (unit === "%" || unit === "% y/y") return `${num(v, 2)}%`;
  if (unit === "$M") { const t = v / 1e6; return t >= 1 ? `$${num(t, 2)}T` : `$${num(v / 1e3, 1)}B`; }
  if (unit === "$B") return v >= 1000 ? `$${num(v / 1e3, 2)}T` : `$${num(v, 0)}B`;
  if (unit === "$") return `$${num(v, 2)}`;
  if (unit === "k") return `${num(v, 0)}k`;
  return num(v, Math.abs(v) >= 1000 ? 0 : 2);
}

function weekKey(d) {
  const dt = new Date(d + "T00:00:00");
  const day = (dt.getDay() + 6) % 7;          // 0 = Monday
  dt.setDate(dt.getDate() - day);
  return dt.toISOString().slice(0, 10);
}

// Resample [[date,value]] (ascending) by Day/Week/Month, taking the last value per bucket.
function resample(points, agg) {
  if (agg === "D") return points;
  const buckets = new Map();
  for (const [d, v] of points) {
    const k = agg === "W" ? weekKey(d) : d.slice(0, 7);
    buckets.set(k, [d, v]);   // last wins (input is ascending)
  }
  return [...buckets.values()];
}

function ExploreChart({ raw, unit, good }) {
  const [range, setRange] = useState("1Y");
  const [agg, setAgg] = useState("D");
  const [zoom, setZoom] = useState(null);     // [i0, i1] into the resampled view
  const [hover, setHover] = useState(null);   // index into the drawn series
  const [drag, setDrag] = useState(null);     // {x0, x1} in svg units
  const wrapRef = useRef(null);
  const [w, setW] = useState(820);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(320, el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // filter by range (relative to the latest date), then resample
  const view = useMemo(() => {
    if (!raw || !raw.length) return [];
    const days = RANGES.find((r) => r[0] === range)?.[1];
    let pts = raw;
    if (days) {
      const last = new Date(raw[raw.length - 1][0] + "T00:00:00");
      const cutoff = new Date(last); cutoff.setDate(cutoff.getDate() - days);
      const cs = cutoff.toISOString().slice(0, 10);
      pts = raw.filter((p) => p[0] >= cs);
      if (pts.length < 2) pts = raw.slice(-2);
    }
    return resample(pts, agg);
  }, [raw, range, agg]);

  // reset zoom when the view changes
  useEffect(() => { setZoom(null); setHover(null); }, [range, agg]);

  const data = useMemo(() => (zoom ? view.slice(zoom[0], zoom[1] + 1) : view), [view, zoom]);

  const H = 400, pad = { l: 58, r: 18, t: 18, b: 34 };
  const iw = w - pad.l - pad.r, ih = H - pad.t - pad.b;
  const geom = useMemo(() => {
    if (data.length < 2) return null;
    const vals = data.map((p) => p[1]);
    let min = Math.min(...vals), max = Math.max(...vals);
    const padv = (max - min) * 0.08 || Math.abs(max) * 0.05 || 1;
    min -= padv; max += padv;
    const span = max - min || 1;
    const x = (i) => pad.l + (i / (data.length - 1)) * iw;
    const y = (v) => pad.t + ih - ((v - min) / span) * ih;
    return { min, max, span, x, y };
  }, [data, w]);

  if (!raw || raw.length < 2) return <p className="muted">No history available for this series.</p>;
  if (!geom) return <p className="muted">Not enough points in this range.</p>;
  const { min, max, x, y } = geom;

  const line = data.map((p, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(p[1]).toFixed(1)}`).join(" ");
  const area = `${line} L ${x(data.length - 1).toFixed(1)} ${(pad.t + ih).toFixed(1)} L ${x(0).toFixed(1)} ${(pad.t + ih).toFixed(1)} Z`;
  const net = data[data.length - 1][1] - data[0][1];
  const dir = good ? Math.sign(net) * good : 0;
  const color = dir > 0 ? "#3fa66a" : dir < 0 ? "#cc4b4b" : "#d9a441";

  const xToIdx = (clientX, rect) => {
    const sx = ((clientX - rect.left) / rect.width) * w;
    return Math.max(0, Math.min(data.length - 1, Math.round(((sx - pad.l) / iw) * (data.length - 1))));
  };
  const xToSvg = (clientX, rect) => ((clientX - rect.left) / rect.width) * w;

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHover(xToIdx(e.clientX, rect));
    if (drag) setDrag((d) => ({ ...d, x1: xToSvg(e.clientX, rect) }));
  };
  const onDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x0 = xToSvg(e.clientX, rect);
    setDrag({ x0, x1: x0 });
  };
  const onUp = (e) => {
    if (drag) {
      const rect = e.currentTarget.getBoundingClientRect();
      const a = xToIdx(drag.x0 / w * rect.width + rect.left, rect);
      const b = xToIdx(e.clientX, rect);
      const [lo, hi] = [Math.min(a, b), Math.max(a, b)];
      if (hi - lo >= 2) setZoom(zoom ? [zoom[0] + lo, zoom[0] + hi] : [lo, hi]);
      setDrag(null);
    }
  };

  const hv = hover != null && data[hover] ? data[hover] : null;
  const grids = [max, (max + min) / 2, min];
  const ticks = []; const step = Math.max(1, Math.floor((data.length - 1) / 5));
  for (let i = 0; i < data.length; i += step) ticks.push(i);

  return (
    <div ref={wrapRef} className="xc">
      <div className="xc-controls">
        <div className="xc-grp">{RANGES.map(([l]) => (
          <button key={l} className={`xc-btn${range === l ? " on" : ""}`} onClick={() => setRange(l)}>{l}</button>
        ))}</div>
        <div className="xc-grp">{AGGS.map(([l, a]) => (
          <button key={a} className={`xc-btn${agg === a ? " on" : ""}`} onClick={() => setAgg(a)}>{l}</button>
        ))}</div>
        {zoom && <button className="xc-btn reset" onClick={() => setZoom(null)}>⟲ reset zoom</button>}
      </div>
      <svg viewBox={`0 0 ${w} ${H}`} width="100%" height={H} className="xc-svg"
           onMouseMove={onMove} onMouseLeave={() => { setHover(null); setDrag(null); }}
           onMouseDown={onDown} onMouseUp={onUp}>
        <defs>
          <linearGradient id="xcfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {grids.map((g, i) => (
          <g key={i}>
            <line x1={pad.l} x2={w - pad.r} y1={y(g)} y2={y(g)} className="xc-grid" />
            <text x={pad.l - 8} y={y(g) + 4} className="xc-axis" textAnchor="end">{fmtVal(g, unit)}</text>
          </g>
        ))}
        {ticks.map((i) => (
          <text key={i} x={x(i)} y={H - 10} className="xc-axis" textAnchor="middle">{fmtDate(data[i][0])}</text>
        ))}
        <path d={area} fill="url(#xcfill)" />
        <path d={line} fill="none" stroke={color} strokeWidth="1.8" />
        {drag && Math.abs(drag.x1 - drag.x0) > 2 && (
          <rect x={Math.min(drag.x0, drag.x1)} y={pad.t} width={Math.abs(drag.x1 - drag.x0)} height={ih} className="xc-sel" />
        )}
        {hv && !drag && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} className="xc-cross" />
            <circle cx={x(hover)} cy={y(hv[1])} r="3.5" fill={color} />
          </g>
        )}
      </svg>
      <div className="xc-readout">
        {hv ? (
          <><b style={{ color }}>{fmtVal(hv[1], unit)}</b> <span className="muted">on {fmtDate(hv[0])}</span></>
        ) : (
          <><b style={{ color }}>{fmtVal(data[data.length - 1][1], unit)}</b>
            <span className="muted"> latest · {fmtDate(data[0][0])} → {fmtDate(data[data.length - 1][0])} · net {net > 0 ? "+" : ""}{fmtVal(net, unit)}</span></>
        )}
        <span className="xc-hint muted">drag to zoom · hover to inspect</span>
      </div>
    </div>
  );
}

function Modal({ item, onClose }) {
  const [raw, setRaw] = useState(undefined); // undefined=loading, null=error, []=empty
  useEffect(() => {
    let live = true;
    setRaw(undefined);
    getSeries(item.key).then((d) => { if (live) setRaw(d?.points || null); }).catch(() => live && setRaw(null));
    return () => { live = false; };
  }, [item.key]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="xc-overlay" onClick={onClose}>
      <div className="xc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="xc-head">
          <h3>{item.label}</h3>
          <button className="xc-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {raw === undefined && <p className="muted">Loading history…</p>}
        {raw === null && <p className="muted">No history available for this series.</p>}
        {Array.isArray(raw) && <ExploreChart raw={raw} unit={item.unit} good={item.good || 0} />}
        {item.source_url && (
          <div className="t-asof">source: <a href={item.source_url} target="_blank" rel="noreferrer" className="src-link">{item.source_url.replace(/^https?:\/\//, "").split("/")[0]} ↗</a></div>
        )}
      </div>
    </div>
  );
}

export function ChartProvider({ keys, children }) {
  const [item, setItem] = useState(null);
  const set = useMemo(() => new Set(keys || []), [keys]);
  const open = useCallback((it) => it?.key && setItem(it), []);
  const has = useCallback((k) => set.has(k), [set]);
  return (
    <ChartCtx.Provider value={{ open, has }}>
      {children}
      {item && <Modal item={item} onClose={() => setItem(null)} />}
    </ChartCtx.Provider>
  );
}
