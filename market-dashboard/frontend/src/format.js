// Score (-1..+1) -> colour on a red->amber->green scale (risk-off -> risk-on).
export function scoreColor(score) {
  const s = Math.max(-1, Math.min(1, Number(score) || 0));
  if (s >= 0) return lerp([217, 164, 65], [63, 166, 106], s);   // amber -> green
  return lerp([217, 164, 65], [204, 75, 75], -s);               // amber -> red
}
function lerp(a, b, t) {
  const c = a.map((av, i) => Math.round(av + (b[i] - av) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

// Format a metric's headline number for display.
export function fmtHeadline(m) {
  const v = m.headline;
  if (v === null || v === undefined) return "—";
  const u = m.headline_unit ?? m.unit ?? "";
  if (u === "% y/y" || u === "%") return `${v > 0 && u === "%" ? "" : ""}${num(v, 2)}%`;
  if (u === "$M") { const t = v / 1e6; return t >= 1 ? `$${num(t, 2)}T` : `$${num(v / 1e3, 0)}B`; }
  if (u === "$B") return v >= 1000 ? `$${num(v / 1e3, 2)}T` : `$${num(v, 0)}B`;
  if (u === "$") return `$${num(v, 2)}`;
  if (u === "k") return `${v > 0 ? "+" : ""}${num(v, 0)}k`;
  if (m.kind === "price" || m.kind === "level") return num(v, v >= 1000 ? 0 : 2);
  return num(v, 2);
}

export function num(v, d = 2) {
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}

// A change object -> {text, dir} where dir is +1/-1/0 in "good for equities" terms.
// For context-only series (better === "none") we apply an equity-impact direction
// so rates / oil / the dollar still light up green (good) or red (bad).
const EQUITY_DIR = {
  fed_funds: -1, ust_2y: -1, ust_10y: -1, ust_30y: -1, // higher rates = bad for equities
  wti: -1, brent: -1,                                   // higher oil = bad
  dollar: -1,                                           // stronger dollar = bad for risk
};

function goodDir(m) {
  if (m.better === "up") return 1;
  if (m.better === "down") return -1;
  return EQUITY_DIR[m.key] ?? 0;
}

export function changeDisplay(m, horizon) {
  const c = m.changes?.[horizon];
  if (!c) return null;
  const showPct = ["price", "level", "level_chg"].includes(m.kind);
  const raw = showPct ? c.pct : c.abs;
  if (raw === null || raw === undefined) return null;
  const sign = raw > 0 ? "+" : "";
  const text = showPct ? `${sign}${num(raw, 1)}%` : `${sign}${num(raw, 2)}`;
  const g = goodDir(m);
  const dir = g === 0 ? 0 : Math.sign(raw) * g;
  return { text, dir };
}

// Direction of a metric's most recent move in "good for equities" terms
// (+1 good / -1 bad / 0 neutral). Falls back 1w -> 1m -> prev so every chart resolves.
export function equityMove(m) {
  const c = m.changes?.["1w"] || m.changes?.["1m"] || m.changes?.prev;
  if (!c) return 0;
  const showPct = ["price", "level", "level_chg"].includes(m.kind);
  const raw = showPct ? c.pct : c.abs;
  if (raw === null || raw === undefined || raw === 0) return 0;
  const g = goodDir(m);
  return g === 0 ? 0 : Math.sign(raw) * g;
}

// Green (good) / red (bad) / gray (neutral) for an equity-direction value.
export function moveColor(dir) {
  return dir > 0 ? "#3fa66a" : dir < 0 ? "#cc4b4b" : "#6b7585";
}

export function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso.slice(0, 10)
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function fmtDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}
