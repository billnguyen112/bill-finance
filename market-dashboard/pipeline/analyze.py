"""Rule-based interpretation of the metrics — the transparent stand-in for the
analyst's read. Each rule turns a number into a signal {score, label, note},
where score runs -1 (risk-off / warning) .. +1 (risk-on / benign). Section
summaries and an overall market read are composed from these signals.

No LLM, no API key — just explicit, auditable thresholds you can tune.
"""

from __future__ import annotations


def _clamp(x: float) -> float:
    return max(-1.0, min(1.0, x))


def _sig(score: float, label: str, note: str) -> dict:
    return {"score": round(_clamp(score), 2), "label": label, "note": note}


def _chg(metric: dict, horizon: str):
    c = metric.get("changes", {}).get(horizon)
    return c["abs"] if c else None


def signal_for(m: dict) -> dict | None:
    """Per-series signal. Returns None for series we treat as context-only."""
    if m.get("status") != "ok":
        return None
    key = m["key"]
    v = m.get("headline")
    if v is None:
        return None

    if key == "curve_2s10s":
        if v < 0:
            return _sig(-0.6, "Inverted", f"2s10s at {v:+.2f}% — classic recession signal.")
        if v < 0.25:
            return _sig(-0.1, "Flat", f"2s10s flat at {v:+.2f}%.")
        return _sig(0.3, "Positive", f"Curve positively sloped (+{v:.2f}%).")

    if key == "real_10y":
        if v >= 2.0:
            return _sig(-0.4, "Restrictive", f"10Y real yield {v:.2f}% — restrictive, a headwind for risk assets.")
        if v <= 1.0:
            return _sig(0.2, "Easy", f"10Y real yield {v:.2f}% — relatively accommodative.")
        return _sig(0.0, "Neutral", f"10Y real yield {v:.2f}%.")

    if key == "hy_oas":
        d = _chg(m, "1m")
        widening = " and widening" if d and d > 0.15 else (" and tightening" if d and d < -0.15 else "")
        if v > 6.0:
            return _sig(-0.8, "Stress", f"HY spreads {v:.2f}%{widening} — credit stress.")
        if v > 4.5:
            return _sig(-0.4, "Elevated", f"HY spreads {v:.2f}%{widening}.")
        if v < 3.0:
            return _sig(0.3, "Tight", f"HY spreads tight at {v:.2f}%{widening} — calm/complacent credit.")
        return _sig(0.0, "Normal", f"HY spreads {v:.2f}%{widening}.")

    if key == "ig_oas":
        if v > 1.5:
            return _sig(-0.3, "Elevated", f"IG spreads {v:.2f}%.")
        if v < 1.0:
            return _sig(0.2, "Tight", f"IG spreads tight at {v:.2f}%.")
        return _sig(0.0, "Normal", f"IG spreads {v:.2f}%.")

    if key == "vix":
        if v >= 30:
            return _sig(-0.8, "Fear", f"VIX {v:.0f} — fear/dislocation.")
        if v >= 20:
            return _sig(-0.4, "Elevated", f"VIX {v:.0f} — elevated volatility.")
        if v < 15:
            return _sig(0.3, "Calm", f"VIX {v:.0f} — calm.")
        return _sig(0.0, "Normal", f"VIX {v:.0f}.")

    if key in ("cpi", "core_cpi", "pce", "core_pce"):
        accel = m.get("yoy_accel")
        trend = ""
        if accel is not None:
            trend = " accelerating" if accel > 0.05 else (" cooling" if accel < -0.05 else " flat")
        if v >= 4:
            return _sig(-0.6, "Hot", f"{m['label']} {v:.1f}% y/y{trend} — well above the 2% target.")
        if v >= 3:
            return _sig(-0.3, "Sticky", f"{m['label']} {v:.1f}% y/y{trend} — above target.")
        if v >= 2:
            return _sig(0.1, "Near target", f"{m['label']} {v:.1f}% y/y{trend} — near the 2% target.")
        return _sig(0.2, "Soft", f"{m['label']} {v:.1f}% y/y{trend} — below target.")

    if key == "ppi":
        if v >= 4:
            return _sig(-0.3, "Hot", f"PPI {v:.1f}% y/y — pipeline price pressure.")
        return _sig(0.0, "Contained", f"PPI {v:.1f}% y/y.")

    if key == "breakeven_10y":
        if v > 2.5:
            return _sig(-0.2, "Elevated", f"10Y breakeven {v:.2f}% — market inflation expectations sticky.")
        return _sig(0.1, "Anchored", f"10Y breakeven {v:.2f}% — expectations anchored.")

    if key in ("sp500", "nasdaq"):
        pfh = m.get("stats", {}).get("pct_from_high_1y")
        if pfh is None:
            return None
        if pfh >= -2:
            return _sig(0.4, "At highs", f"{m['label']} within {abs(pfh):.1f}% of its 1y high — strong momentum.")
        if pfh >= -10:
            return _sig(0.1, "Uptrend", f"{m['label']} {pfh:.1f}% off its 1y high.")
        if pfh >= -20:
            return _sig(-0.3, "Correction", f"{m['label']} {pfh:.1f}% off its 1y high — in correction.")
        return _sig(-0.6, "Bear", f"{m['label']} {pfh:.1f}% off its 1y high — bear-market territory.")

    if key == "net_liquidity":
        c = m.get("changes", {}).get("1m") or m.get("changes", {}).get("prev")
        pct = c["pct"] if c else None
        t = v / 1e6
        if pct is not None and pct > 0.5:
            return _sig(0.2, "Expanding", f"Net liquidity ${t:.2f}T — expanding (tailwind).")
        if pct is not None and pct < -0.5:
            return _sig(-0.3, "Draining", f"Net liquidity ${t:.2f}T — draining (headwind for risk).")
        return _sig(0.0, "Flat", f"Net liquidity ${t:.2f}T.")

    if key == "cfnai":
        if v < -0.7:
            return _sig(-0.5, "Recessionary", f"CFNAI {v:+.2f} — well below trend.")
        if v > 0:
            return _sig(0.15, "Above trend", f"CFNAI {v:+.2f} — above-trend growth.")
        return _sig(-0.1, "Below trend", f"CFNAI {v:+.2f} — slightly below trend.")

    if key == "empire_mfg":
        if v < -10:
            return _sig(-0.3, "Contracting", f"Empire State {v:+.1f} — factory contraction.")
        if v > 0:
            return _sig(0.1, "Expanding", f"Empire State {v:+.1f} — expansion.")
        return _sig(0.0, "Flat", f"Empire State {v:+.1f}.")

    if key in ("small_caps", "regional_banks"):
        pfh = m.get("stats", {}).get("pct_from_high_1y")
        if pfh is None:
            return None
        label = "Small caps" if key == "small_caps" else "Regional banks"
        if pfh >= -3:
            return _sig(0.3, "Strong", f"{label} within {abs(pfh):.0f}% of 1y high — healthy risk appetite/breadth.")
        if pfh >= -12:
            return _sig(0.0, "OK", f"{label} {pfh:.0f}% off the 1y high.")
        if pfh >= -20:
            return _sig(-0.3, "Lagging", f"{label} {pfh:.0f}% off the 1y high — narrow/fragile.")
        return _sig(-0.5, "Stressed", f"{label} {pfh:.0f}% off the 1y high — stress.")

    if key in ("real_gdp", "final_sales"):
        label = "Real GDP" if key == "real_gdp" else "Final sales"
        score = 0.15 if v >= 2 else (-0.25 if v < 1 else 0.0)
        return _sig(score, label, f"{label} {v:+.1f}% annualized.")

    if key == "unemployment":
        d = _chg(m, "1y")
        if d is not None and d >= 0.5:
            return _sig(-0.5, "Rising", f"Unemployment {v:.1f}%, up {d:+.1f}pp y/y — labor softening.")
        if v < 4.0:
            return _sig(0.2, "Tight", f"Unemployment {v:.1f}% — tight labor market.")
        return _sig(0.0, "Steady", f"Unemployment {v:.1f}%.")

    if key == "payrolls":  # headline = monthly change in thousands
        if v < 0:
            return _sig(-0.6, "Contracting", f"Payrolls fell {v:.0f}k — outright job losses.")
        if v < 100:
            return _sig(-0.3, "Soft", f"Payrolls +{v:.0f}k — soft hiring.")
        if v > 250:
            return _sig(0.3, "Strong", f"Payrolls +{v:.0f}k — strong hiring.")
        return _sig(0.1, "Solid", f"Payrolls +{v:.0f}k.")

    if key == "claims":
        d = _chg(m, "1m")
        if d is not None and d > 30000:
            return _sig(-0.3, "Rising", f"Initial claims {v:,.0f}, rising — early labor cracks.")
        return _sig(0.1, "Low", f"Initial claims {v:,.0f}.")

    if key == "mortgage_30y":
        if v >= 7:
            return _sig(-0.2, "High", f"30Y mortgage {v:.2f}% — housing affordability squeezed.")
        return _sig(0.0, "Easing", f"30Y mortgage {v:.2f}%.")

    if key == "case_shiller":  # yoy
        if v < 0:
            return _sig(-0.3, "Falling", f"Home prices {v:.1f}% y/y — declining.")
        return _sig(0.1, "Rising", f"Home prices +{v:.1f}% y/y.")

    if key in ("new_home_sales", "housing_starts"):
        d = m.get("changes", {}).get("1y", {}).get("pct")
        if d is not None and d < -10:
            return _sig(-0.2, "Cooling", f"{m['label']} {d:.0f}% y/y — housing activity cooling.")
        return None

    return None  # context-only series (fed funds, yields, oil, gold, dollar, brent)


# Weights for the overall regime read (by series key).
_REGIME_WEIGHTS = {
    "curve_2s10s": 1.0,
    "hy_oas": 1.3,
    "ig_oas": 0.5,
    "vix": 1.0,
    "real_10y": 0.7,
    "core_pce": 1.0,
    "core_cpi": 0.6,
    "sp500": 1.2,
    "small_caps": 0.7,
    "net_liquidity": 0.9,
    "unemployment": 1.0,
    "payrolls": 0.9,
    "claims": 0.5,
    "cfnai": 0.6,
}


def overall_read(metrics_by_key: dict) -> dict:
    num = den = 0.0
    contributions = []
    for key, w in _REGIME_WEIGHTS.items():
        m = metrics_by_key.get(key)
        if not m:
            continue
        s = m.get("signal")
        if not s:
            continue
        num += s["score"] * w
        den += w
        contributions.append((s["score"] * w, s["note"], s["score"]))
    score = round(num / den, 2) if den else 0.0

    if score >= 0.35:
        label = "Risk-On"
    elif score >= 0.12:
        label = "Constructive"
    elif score > -0.12:
        label = "Neutral / Mixed"
    elif score > -0.35:
        label = "Cautious"
    else:
        label = "Risk-Off"

    pos = sorted([c for c in contributions if c[2] > 0], key=lambda c: -c[0])[:3]
    neg = sorted([c for c in contributions if c[2] < 0], key=lambda c: c[0])[:3]
    return {
        "score": score,
        "label": label,
        "supports": [c[1] for c in pos],
        "concerns": [c[1] for c in neg],
    }


_SECTION_LEADS = {
    "rates": ["fed_funds", "ust_10y", "curve_2s10s", "real_10y"],
    "inflation": ["core_pce", "core_cpi", "cpi"],
    "credit": ["hy_oas", "ig_oas"],
    "liquidity": ["net_liquidity", "tga", "reverse_repo"],
    "equities": ["sp500", "small_caps", "regional_banks", "vix"],
    "housing": ["mortgage_30y", "new_home_sales", "case_shiller"],
    "labor": ["payrolls", "unemployment", "claims"],
    "growth": ["real_gdp", "final_sales", "cfnai"],
    "commodities": ["wti", "gold", "dollar"],
}


def section_summary(section_key: str, metrics_by_key: dict) -> str:
    notes = []
    for key in _SECTION_LEADS.get(section_key, []):
        m = metrics_by_key.get(key)
        if m and m.get("signal"):
            notes.append(m["signal"]["note"])
    if section_key == "growth":
        gdp = (metrics_by_key.get("real_gdp") or {}).get("headline")
        fs = (metrics_by_key.get("final_sales") or {}).get("headline")
        if gdp is not None and fs is not None:
            gap = gdp - fs
            if gap >= 1.0:
                notes.append(f"Headline GDP is running {gap:.1f}pp above final sales — low-quality growth (inventories/government/trade).")
            elif gap <= -0.5:
                notes.append("Final sales are outpacing headline GDP — underlying demand is solid.")
    return " ".join(notes)
