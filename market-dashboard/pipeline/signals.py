"""Mark Meldrum's own buy/sell checklist, evaluated against the live data.

His framework (paraphrased from his strategy videos):

  BUY when:
    1. VIX > 30                          (capitulation / fear)
    2. Fed interest rate not going up     (done hiking — pause or cut)
    3. Margin debt (FINRA) decreasing     (leverage being flushed out)
    4. Clear leading sectors              (qualitative)
    5. Earnings growth in those leaders   (qualitative)

  SELL when:
    - Any tech/semi names show a revenue/earnings plateau   (qualitative)
    - The Fed makes an official interest-rate pivot
    - Tech/semi valuations get "crazy"

We auto-evaluate the conditions our data covers (VIX, Fed-funds direction,
valuation via CAPE) and mark the qualitative / external ones as "assess
yourself" with the current reading and, where useful, a link. Thresholds are a
transparent encoding of his rules and live in this file so they're easy to tune.
"""

from __future__ import annotations

SOURCE_VIDEOS = [
    {"title": "Stock investing strategy for EVERYONE (which I developed)",
     "url": "https://www.youtube.com/watch?v=len22DXc8AQ"},
    {"title": "You are not smart.. be cautious",
     "url": "https://www.youtube.com/watch?v=_Gii9ONQemA"},
    {"title": "Easy way to make money with stocks",
     "url": "https://www.youtube.com/watch?v=QQRyTednY2w"},
]

FINRA_MARGIN_URL = "https://www.finra.org/investors/learn-to-invest/advanced-investing/margin-statistics"


def _headline(metrics, key):
    m = metrics.get(key) or {}
    return m.get("headline")


def _change(metrics, key, horizon="1y"):
    c = (metrics.get(key) or {}).get("changes", {}).get(horizon)
    return c["abs"] if c else None


# --- auto evaluators: return (met: bool|None, reading: str) ------------------
def _buy_vix(metrics, cape):
    v = _headline(metrics, "vix")
    if v is None:
        return None, "VIX unavailable"
    return v > 30, f"VIX {v:.1f} — {'≥ 30 (capitulation)' if v > 30 else 'below 30'}"


def _buy_fed(metrics, cape):
    v = _headline(metrics, "fed_funds")
    d = _change(metrics, "fed_funds", "1y")
    if v is None:
        return None, "Fed funds unavailable"
    direction = "rising" if (d is not None and d > 0.05) else \
                ("cutting" if (d is not None and d < -0.05) else "flat")
    met = direction != "rising"
    return met, f"Fed funds {v:.2f}% — {direction} over the past year"


def _sell_pivot(metrics, cape):
    v = _headline(metrics, "fed_funds")
    d = _change(metrics, "fed_funds", "1y")
    if v is None:
        return None, "Fed funds unavailable"
    pivoting = d is not None and d <= -0.25  # actively cutting = official easing pivot
    return pivoting, f"Fed funds {v:.2f}% — {'cutting (easing pivot underway)' if pivoting else 'no easing pivot yet'}"


def _sell_valuation(metrics, cape):
    if cape is None:
        return None, "CAPE unavailable — check tech/semi valuations manually"
    met = cape >= 35
    return met, f"Shiller CAPE {cape:.1f} — {'extreme' if met else 'elevated' if cape >= 30 else 'moderate'} (market-wide proxy)"


BUY_SIGNALS = [
    {"name": "VIX > 30", "rule": "Buy into fear — VIX above 30.", "fn": _buy_vix},
    {"name": "Fed not hiking", "rule": "Fed interest rate is not going up (paused or cutting).", "fn": _buy_fed},
    {"name": "Margin debt falling", "rule": "FINRA margin debt is decreasing (leverage flushed out).",
     "manual": True, "hint": "Not on FRED — check FINRA margin statistics.", "link": FINRA_MARGIN_URL},
    {"name": "Clear leading sectors", "rule": "There are clear leadership sectors.",
     "manual": True, "hint": "Qualitative — your call on current sector leadership."},
    {"name": "Leaders' earnings growth", "rule": "Those leading sectors show earnings growth.",
     "manual": True, "hint": "Qualitative — check earnings of the leading sectors."},
]

SELL_SIGNALS = [
    {"name": "Tech/semi earnings plateau", "rule": "Any tech/semi names show a revenue/earnings plateau.",
     "manual": True, "hint": "Qualitative — watch leaders' revenue/earnings trajectory."},
    {"name": "Fed official pivot", "rule": "The Fed makes an official interest-rate pivot.", "fn": _sell_pivot},
    {"name": "Crazy tech/semi valuation", "rule": "Tech/semi valuations get extreme.", "fn": _sell_valuation},
]


def _evaluate(spec_list, metrics, cape):
    out = []
    for spec in spec_list:
        if spec.get("manual"):
            item = {"name": spec["name"], "rule": spec["rule"], "kind": "manual",
                    "met": None, "reading": spec.get("hint", "")}
            if spec.get("link"):
                item["link"] = spec["link"]
        else:
            met, reading = spec["fn"](metrics, cape)
            item = {"name": spec["name"], "rule": spec["rule"], "kind": "auto",
                    "met": met, "reading": reading}
        out.append(item)
    return out


def build_playbook(metrics_by_key: dict, cape, overall: dict) -> dict:
    buys = _evaluate(BUY_SIGNALS, metrics_by_key, cape)
    sells = _evaluate(SELL_SIGNALS, metrics_by_key, cape)

    buy_met = sum(1 for s in buys if s["met"] is True)
    buy_auto = sum(1 for s in buys if s["kind"] == "auto")
    sell_met = sum(1 for s in sells if s["met"] is True)
    sell_auto = sum(1 for s in sells if s["kind"] == "auto")

    # Posture from the auto-checkable conditions (his headline buy trigger is VIX>30).
    vix_buy = next((s["met"] for s in buys if s["name"] == "VIX > 30"), None)
    if sell_met >= 1 and buy_met == 0:
        posture = "Sell watch"
    elif vix_buy:
        posture = "Buy setup (capitulation)"
    elif buy_met >= 2:
        posture = "Accumulate watch"
    else:
        posture = "Hold / monitor"

    return {
        "posture": posture,
        "buy_signals": buys,
        "sell_signals": sells,
        "buy_met": buy_met, "buy_auto": buy_auto, "buy_total": len(buys),
        "sell_met": sell_met, "sell_auto": sell_auto, "sell_total": len(sells),
        "sources": SOURCE_VIDEOS,
    }
