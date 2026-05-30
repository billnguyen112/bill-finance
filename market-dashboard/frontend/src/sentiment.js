// Map a sentiment score (-1..+1) to a colour on a red->amber->green scale.
export function sentimentColor(score) {
  const s = Math.max(-1, Math.min(1, Number(score) || 0));
  // -1 red (5,) ... 0 amber ... +1 green
  if (s >= 0) {
    // amber (#d9a441) -> green (#3fa66a)
    return lerpColor([217, 164, 65], [63, 166, 106], s);
  }
  // amber -> red (#cc4b4b)
  return lerpColor([217, 164, 65], [204, 75, 75], -s);
}

function lerpColor(a, b, t) {
  const c = a.map((av, i) => Math.round(av + (b[i] - av) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export function fmtScore(score) {
  const n = Number(score);
  if (Number.isNaN(n)) return "—";
  return (n > 0 ? "+" : "") + n.toFixed(2);
}

export function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso.slice(0, 10)
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
