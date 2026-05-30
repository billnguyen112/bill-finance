"""Bubble & concentration gauge — his 'CAPE at 42 / 1999 all over again' lens.

Combines the Shiller CAPE (vs its long-run mean and the 2000 peak) with mega-cap
market concentration (the 'Magnificent 7' combined market cap and its share of
nominal GDP) into a single bubble read.
"""

from __future__ import annotations

import sources

MAG7 = [("AAPL", "Apple"), ("MSFT", "Microsoft"), ("NVDA", "Nvidia"), ("GOOGL", "Alphabet"),
        ("AMZN", "Amazon"), ("META", "Meta"), ("TSLA", "Tesla")]
CAPE_MEAN = 17.0      # long-run average
CAPE_2000 = 44.0      # dot-com peak
CAPE_2021 = 38.0      # 2021 peak


def _clamp01(x):
    return max(0.0, min(1.0, x))


def build(cape, nominal_gdp_bn) -> dict | None:
    members = []
    for sym, name in MAG7:
        q = sources.fmp_quote(sym) or {}
        members.append({"symbol": sym, "name": name, "market_cap": q.get("marketCap")})
    total = sum(m["market_cap"] for m in members if m.get("market_cap"))
    members.sort(key=lambda m: (m.get("market_cap") or 0), reverse=True)
    pct_gdp = round(total / (nominal_gdp_bn * 1e9) * 100, 1) if total and nominal_gdp_bn else None

    cape_block = None
    if cape:
        stretch = round((cape - CAPE_MEAN) / (CAPE_2000 - CAPE_MEAN) * 100)
        cape_block = {
            "value": round(cape, 1), "mean": CAPE_MEAN, "peak_2000": CAPE_2000, "peak_2021": CAPE_2021,
            "pct_of_2000_stretch": stretch,
            "label": "extreme" if cape >= 38 else "elevated" if cape >= 25 else "normal",
        }

    comps = []
    if cape:
        comps.append(_clamp01((cape - 15) / (45 - 15)))         # 15..45 -> 0..1
    if pct_gdp is not None:
        comps.append(_clamp01((pct_gdp - 15) / (50 - 15)))       # 15%..50% of GDP -> 0..1
    score = round(100 * sum(comps) / len(comps)) if comps else None
    label = ("Frothy" if score is not None and score >= 66 else
             "Elevated" if score is not None and score >= 40 else
             "Normal" if score is not None else "n/a")

    return {
        "score": score, "label": label, "cape": cape_block,
        "mag7_total_t": round(total / 1e12, 2) if total else None,
        "mag7_pct_gdp": pct_gdp, "members": members,
    }
