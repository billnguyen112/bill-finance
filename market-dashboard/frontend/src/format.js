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

// A change object -> {text, dir} where dir is +1/-1/0 in "good for risk" terms.
export function changeDisplay(m, horizon) {
  const c = m.changes?.[horizon];
  if (!c) return null;
  const showPct = ["price", "level", "level_chg"].includes(m.kind);
  const raw = showPct ? c.pct : c.abs;
  if (raw === null || raw === undefined) return null;
  const sign = raw > 0 ? "+" : "";
  const text = showPct ? `${sign}${num(raw, 1)}%` : `${sign}${num(raw, 2)}`;
  // direction in risk terms depends on which way is "good"
  let dir = 0;
  if (m.better === "up") dir = Math.sign(raw);
  else if (m.better === "down") dir = -Math.sign(raw);
  return { text, dir };
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
