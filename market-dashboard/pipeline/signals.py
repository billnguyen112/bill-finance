"""The "Signals" playbook — a buy/sell-oriented view of the same live data.

This reframes the indicators Mark Meldrum tracks in his weekly outlooks as
Buy-supportive vs Caution signals, evaluated against the current readings, plus
an overall posture. The signal *set* is what he watches; the thresholds here are
a transparent, tunable encoding (not his verbatim rules — see SOURCE_VIDEOS).
"""

from __future__ import annotations

# His videos on personal strategy / market timing that motivate this tab.
SOURCE_VIDEOS = [
    {"title": "Stock investing strategy for EVERYONE (which I developed)",
     "url": "https://www.youtube.com/watch?v=len22DXc8AQ"},
    {"title": "You are not smart.. be cautious",
     "url": "https://www.youtube.com/watch?v=_Gii9ONQemA"},
    {"title": "Easy way to make money with stocks",
     "url": "https://www.youtube.com/watch?v=QQRyTednY2w"},
]

# Each signal maps to a live metric key and describes how he reads it.
# state is taken from the rule engine's signal score on that metric:
#   score >= +0.20 -> "buy"     (supportive of adding risk)
#   score <= -0.20 -> "caution" (defensive / trim)
#   otherwise          "neutral"
SPECS = [
    {"id": "curve", "key": "curve_2s10s", "name": "Yield curve",
     "watches": "2s10s slope — the bond market's recession tell.",
     "buy_when": "Positively sloped / steepening from a healthy level.",
     "caution_when": "Inverted (10Y below 2Y), or re-steepening out of a deep inversion."},
    {"id": "credit", "key": "hy_oas", "name": "Credit spreads",
     "watches": "High-yield OAS — the earliest sign of stress; credit usually cracks before equities.",
     "buy_when": "Tight and stable (roughly < 3.5%).",
     "caution_when": "Widening, or above ~4.5%."},
    {"id": "vol", "key": "vix", "name": "Volatility",
     "watches": "VIX — complacency vs fear.",
     "buy_when": "Low and calm (< 15).",
     "caution_when": "Spiking above 20 (30+ = dislocation)."},
    {"id": "valuation", "key": None, "name": "Valuation (CAPE)",
     "watches": "Shiller CAPE — how expensive the market is vs history.",
     "buy_when": "Below ~25 (more margin of safety).",
     "caution_when": "Above ~30 — richly valued, lower forward returns."},
    {"id": "policy", "key": "real_10y", "name": "Fed / real rates",
     "watches": "10Y real (TIPS) yield — how restrictive policy is.",
     "buy_when": "Easing — real yield falling / below ~1%.",
     "caution_when": "Restrictive — real yield above ~2%."},
    {"id": "inflation", "key": "core_pce", "name": "Inflation trend",
     "watches": "Core PCE — the Fed's target gauge.",
     "buy_when": "Cooling toward 2%.",
     "caution_when": "Hot or re-accelerating (> 3%)."},
    {"id": "trend", "key": "sp500", "name": "Price trend",
     "watches": "S&P 500 vs its 1-year high — respect the trend.",
     "buy_when": "Uptrend, near highs.",
     "caution_when": "10%+ off the high (correction) or worse."},
    {"id": "labor", "key": "unemployment", "name": "Labor market",
     "watches": "Unemployment / claims — late-cycle deterioration.",
     "buy_when": "Low and stable.",
     "caution_when": "Rising (+0.5pp off the lows)."},
]


def _state_from_score(score: float) -> str:
    if score >= 0.20:
        return "buy"
    if score <= -0.20:
        return "caution"
    return "neutral"


def _cape_signal(cape):
    if cape is None:
        return "neutral", "n/a", -0.3 if False else 0.0
    if cape >= 30:
        return "caution", f"CAPE {cape:.1f} — richly valued", -0.4
    if cape <= 25:
        return "buy", f"CAPE {cape:.1f} — reasonable", 0.3
    return "neutral", f"CAPE {cape:.1f}", 0.0


def build_playbook(metrics_by_key: dict, cape, overall: dict) -> dict:
    signals = []
    for spec in SPECS:
        if spec["id"] == "valuation":
            state, reading, score = _cape_signal(cape)
        else:
            m = metrics_by_key.get(spec["key"]) or {}
            sig = m.get("signal")
            if sig:
                score = sig["score"]
                state = _state_from_score(score)
                reading = sig["note"]
            else:
                score, state, reading = 0.0, "neutral", "no data"
        signals.append({
            "id": spec["id"], "name": spec["name"], "watches": spec["watches"],
            "buy_when": spec["buy_when"], "caution_when": spec["caution_when"],
            "state": state, "reading": reading, "score": round(score, 2),
        })

    buys = sum(1 for s in signals if s["state"] == "buy")
    cautions = sum(1 for s in signals if s["state"] == "caution")
    score = overall.get("score", 0.0)
    if score >= 0.20:
        posture = "Accumulate"
    elif score <= -0.20:
        posture = "Defensive"
    else:
        posture = "Neutral"

    return {
        "posture": posture,
        "score": score,
        "buy_count": buys,
        "caution_count": cautions,
        "neutral_count": len(signals) - buys - cautions,
        "signals": signals,
        "sources": SOURCE_VIDEOS,
    }
