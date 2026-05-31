"""Buy/Sell signal model, evaluated entirely from data.

Buy (5):
  1. VIX > 30                         — FRED VIX
  2. Fed funds not rising             — FRED DFF direction
  3. Margin debt decreasing           — FINRA margin statistics (scraped)
  4. Clear leading sectors            — FMP sector performance
  5. Leading sectors' earnings growth — FMP earnings of sector bellwethers

Sell (3):
  1. Tech/semi earnings plateau       — FMP semis revenue growth
  2. Fed official rate pivot          — FRED DFF (actively cutting)
  3. Crazy tech/semi valuation        — FMP semis P/E (falls back to Shiller CAPE)

Every condition is computed. Items whose data source isn't configured yet
report "awaiting data" (never a subjective call). Thresholds live in config.py /
this file and are fully tunable.
"""

from __future__ import annotations

import config


def _median(xs):
    xs = sorted(x for x in xs if x is not None)
    if not xs:
        return None
    n = len(xs)
    return xs[n // 2] if n % 2 else (xs[n // 2 - 1] + xs[n // 2]) / 2


def _headline(metrics, key):
    return (metrics.get(key) or {}).get("headline")


def _change(metrics, key, horizon="1y"):
    c = (metrics.get(key) or {}).get("changes", {}).get(horizon)
    return c["abs"] if c else None


def _auto(met, reading):
    return {"kind": "auto", "met": met, "reading": reading}


def _pending(reading):
    return {"kind": "pending", "met": None, "reading": reading}


# --- individual evaluators --------------------------------------------------
def _vix(metrics, cape, ex):
    v = _headline(metrics, "vix")
    if v is None:
        return _pending("VIX unavailable")
    return _auto(v > 30, f"VIX {v:.1f} — {'≥ 30 (capitulation)' if v > 30 else 'below 30'}")


def _fed_not_rising(metrics, cape, ex):
    v = _headline(metrics, "fed_funds")
    d = _change(metrics, "fed_funds", "1y")
    if v is None:
        return _pending("Fed funds unavailable")
    direction = "rising" if (d is not None and d > 0.05) else \
                ("cutting" if (d is not None and d < -0.05) else "flat")
    return _auto(direction != "rising", f"Fed funds {v:.2f}% — {direction} over the past year")


def _margin(metrics, cape, ex):
    rows = (ex or {}).get("margin")
    if not rows or len(rows) < 2:
        return _pending("FINRA margin data unavailable")
    cur, prev = rows[0][1], rows[1][1]
    falling = cur < prev
    pct = (cur / prev - 1) * 100 if prev else 0
    return _auto(falling, f"Margin debt ${cur/1e6:.2f}T — {'falling' if falling else 'rising'} "
                          f"{pct:+.1f}% M/M ({rows[0][0]})")


def _leading_sectors(metrics, cape, ex):
    sectors = (ex or {}).get("sectors")
    if not sectors:
        return _pending("Awaiting FMP data (sector performance)")
    ranked = sorted(sectors, key=lambda s: s["change"], reverse=True)
    dispersion = ranked[0]["change"] - ranked[-1]["change"]
    leaders = [s for s in ranked[:3] if s["change"] > 0]
    clear = dispersion >= 1.0 and len(leaders) >= 1
    lead_txt = ", ".join(f"{s['sector']} {s['change']:+.1f}%" for s in leaders[:3]) or "none positive"
    return _auto(clear, f"Leaders: {lead_txt}; dispersion {dispersion:.1f}%")


def _leaders_earnings(metrics, cape, ex):
    g = (ex or {}).get("leaders_growth")
    if g is None:
        return _pending("Awaiting FMP data (sector earnings)")
    return _auto(g > 0, f"Leading sectors' bellwether revenue {g:+.1f}% YoY")


def _semi_miss(metrics, cape, ex):
    """Sell trigger: a megacap semiconductor missed its last earnings."""
    misses = (ex or {}).get("semi_miss")
    if misses is None:
        return _pending("Awaiting FMP data (semi earnings)")
    if misses:
        parts = [f"{m['symbol']} (missed {'EPS' if m.get('eps_miss') else 'revenue'})" for m in misses[:5]]
        return _auto(True, f"{'; '.join(parts)} — a semi missing is the real plateau signal, "
                           "since so much growth is already priced in.")
    return _auto(False, "No tracked semiconductor (≥ $20B) missed last quarter's earnings.")


def _fed_pivot(metrics, cape, ex):
    """Sell trigger: market is pricing a pivot from cutting back to HIKING."""
    fed = (ex or {}).get("fed")
    if not fed:
        return _pending("Fed rate data unavailable")
    return _auto(fed.get("stance") == "hike", fed["reading"])


def _crazy_valuation(metrics, cape, ex):
    pes = (ex or {}).get("semis_pe")
    if pes:
        med = _median(pes)
        crazy = med is not None and med > config.VALUATION_PE_EXTREME
        return _auto(crazy, f"Semis median forward P/E {med:.0f} — {'extreme' if crazy else 'elevated' if med and med>30 else 'moderate'}")
    if cape is not None:  # market-wide fallback
        crazy = cape >= 35
        return _auto(crazy, f"Shiller CAPE {cape:.1f} (market-wide) — {'extreme' if crazy else 'elevated' if cape >= 30 else 'moderate'}")
    return _pending("Awaiting valuation data")


_FRED = "https://fred.stlouisfed.org/series/"
_SECTORS = "https://stockanalysis.com/markets/sectors/"
_SMH = "https://stockanalysis.com/etf/smh/"

# name, rule, criteria (fixed trigger), (source_label, source_url), fn
BUY_SPECS = [
    ("VIX > 30", "Buy into fear — VIX above 30.", "VIX > 30",
     ("FRED: VIXCLS", _FRED + "VIXCLS"), _vix),
    ("Fed not hiking", "Fed funds rate is not rising.", "Fed funds Δ1y ≤ 0",
     ("FRED: DFF", _FRED + "DFF"), _fed_not_rising),
    ("Margin debt falling", "FINRA margin debt is decreasing month over month.",
     "Margin debt ↓ vs prior month", ("FINRA margin stats", config.FINRA_MARGIN_URL), _margin),
    ("Clear leading sectors", "There is clear sector leadership (dispersion + positive leaders).",
     "Top–bottom sector spread ≥ 1% with ≥1 positive leader", ("Sector performance", _SECTORS), _leading_sectors),
    ("Leaders' earnings growth", "The leading sectors show revenue/earnings growth.",
     "Leading sectors' bellwether revenue YoY > 0", ("Sector performance", _SECTORS), _leaders_earnings),
]
SELL_SPECS = [
    ("Large-cap semi earnings miss", "A semiconductor missed its last earnings (EPS or revenue below estimate) — with so much growth priced in, a miss is the real plateau signal.",
     f"Any semi ≥ ${config.SEMI_MEGACAP_MCAP/1e9:.0f}B market cap misses EPS/revenue", ("Semis (SMH)", _SMH), _semi_miss),
    ("Fed pivots to hiking", "Market-implied rates (3M T-bill vs fed funds, FOMC calendar) signal a pivot from cutting back to hiking.",
     "3M T-bill − fed funds ≥ +10bp (hike priced)", ("FRED: DGS3MO", _FRED + "DGS3MO"), _fed_pivot),
    ("Crazy tech/semi valuation", "Semiconductor valuations are extreme.",
     f"Semis median forward P/E > {config.VALUATION_PE_EXTREME:.0f}", ("Semis (SMH)", _SMH), _crazy_valuation),
]


def _build(specs, metrics, cape, ex):
    out = []
    for name, rule, criteria, source, fn in specs:
        res = fn(metrics, cape, ex)
        out.append({"name": name, "rule": rule, "criteria": criteria,
                    "source_label": source[0], "source_url": source[1], **res})
    return out


def build_playbook(metrics_by_key: dict, cape, overall: dict, extras: dict | None = None) -> dict:
    buys = _build(BUY_SPECS, metrics_by_key, cape, extras)
    sells = _build(SELL_SPECS, metrics_by_key, cape, extras)

    buy_met = sum(1 for s in buys if s["met"] is True)
    sell_met = sum(1 for s in sells if s["met"] is True)
    pending = sum(1 for s in buys + sells if s["kind"] == "pending")

    vix_buy = next((s["met"] for s in buys if s["name"] == "VIX > 30"), None)
    semi_miss = next((s["met"] for s in sells if s["name"] == "Large-cap semi earnings miss"), None)
    if sell_met >= 2 or semi_miss:   # a single megacap semi miss is a sell on its own
        posture = "Sell watch"
    elif vix_buy:
        posture = "Buy setup (capitulation)"
    elif buy_met >= 3:
        posture = "Accumulate watch"
    elif sell_met >= 1:
        posture = "Caution"
    else:
        posture = "Hold / monitor"

    return {
        "posture": posture,
        "buy_signals": buys,
        "sell_signals": sells,
        "buy_met": buy_met, "buy_total": len(buys),
        "sell_met": sell_met, "sell_total": len(sells),
        "pending": pending,
        "fmp_enabled": bool(config.FMP_API_KEY),
    }
