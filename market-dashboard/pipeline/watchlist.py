"""A compact watchlist of the key ETFs I track (small caps, regional banks, long
bonds, credit, defensives, REITs, energy, gold, the broad market).
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor

import config
import sources

WATCHLIST = [
    ("IWM", "Small caps (Russell 2000)"),
    ("KRE", "Regional banks"),
    ("TLT", "Long Treasuries (duration)"),
    ("HYG", "High-yield credit"),
    ("XLP", "Staples (defensive)"),
    ("XLU", "Utilities (defensive / AI power)"),
    ("IYR", "REITs / real estate"),
    ("XLE", "Energy / oil"),
    ("GLD", "Gold"),
    ("SPY", "S&P 500"),
]


def _r(v, d=1):
    return round(v, d) if isinstance(v, (int, float)) else None


def _one(item) -> dict:
    sym, role = item
    q = sources.fmp_quote(sym) or {}
    pc = sources.fmp_price_change(sym) or {}
    price, yh = q.get("price"), q.get("yearHigh")
    return {
        "symbol": sym, "role": role,
        "price": _r(price, 2),
        "pct_from_high": _r((price / yh - 1) * 100) if price and yh else None,
        "w1": _r(pc.get("5D")), "m1": _r(pc.get("1M")), "y1": _r(pc.get("1Y")),
    }


def build_watchlist() -> dict | None:
    if not config.FMP_API_KEY:
        return None
    with ThreadPoolExecutor(max_workers=config.FETCH_WORKERS) as ex:
        rows = list(ex.map(_one, WATCHLIST))
    return {"items": rows}
