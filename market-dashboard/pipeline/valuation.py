"""Tech + semiconductor valuation monitor — trailing and forward multiples.

Per company: trailing P/E, P/B, P/S, EV/EBITDA (FMP ratios-ttm + key-metrics-ttm)
and forward P/E (price / next-fiscal-year consensus EPS from analyst-estimates).
Rolled into median multiples per group (Semiconductors, Big Tech) and overall, so
you can see how richly tech/semis are valued on a trailing vs forward basis.
"""

from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date

import config
import sources

UNIVERSE = [
    # Semiconductors
    ("NVDA", "Nvidia", "Semiconductors"), ("TSM", "TSMC", "Semiconductors"),
    ("AVGO", "Broadcom", "Semiconductors"), ("AMD", "AMD", "Semiconductors"),
    ("ASML", "ASML", "Semiconductors"), ("QCOM", "Qualcomm", "Semiconductors"),
    ("TXN", "Texas Instruments", "Semiconductors"), ("MU", "Micron", "Semiconductors"),
    ("AMAT", "Applied Materials", "Semiconductors"), ("LRCX", "Lam Research", "Semiconductors"),
    ("KLAC", "KLA", "Semiconductors"), ("ARM", "Arm Holdings", "Semiconductors"),
    # Big Tech / Software
    ("AAPL", "Apple", "Big Tech"), ("MSFT", "Microsoft", "Big Tech"),
    ("GOOGL", "Alphabet", "Big Tech"), ("AMZN", "Amazon", "Big Tech"),
    ("META", "Meta", "Big Tech"), ("ORCL", "Oracle", "Big Tech"),
    ("NFLX", "Netflix", "Big Tech"), ("CRM", "Salesforce", "Big Tech"),
    ("ADBE", "Adobe", "Big Tech"), ("PLTR", "Palantir", "Big Tech"),
]
MULTIPLES = ("pe", "fwd_pe", "pb", "ps", "ev_ebitda")


def _pos(v):
    return round(v, 1) if isinstance(v, (int, float)) and v > 0 else None


def _median(xs):
    xs = sorted(x for x in xs if isinstance(x, (int, float)) and x > 0)
    if not xs:
        return None
    n = len(xs)
    return round(xs[n // 2] if n % 2 else (xs[n // 2 - 1] + xs[n // 2]) / 2, 1)


def _one(item) -> dict:
    sym, name, grp = item
    q = sources.fmp_quote(sym) or {}
    r = sources.fmp_ratios(sym) or {}
    km = sources.fmp_key_metrics(sym) or {}
    est = sources.fmp_estimates(sym)
    price = q.get("price")

    fwd_pe = None
    if isinstance(price, (int, float)) and est:
        future = sorted((e for e in est if e.get("date") and e["date"] >= date.today().isoformat()),
                        key=lambda e: e["date"])
        eps = (future[0] if future else {}).get("epsAvg")
        if isinstance(eps, (int, float)) and eps > 0:
            fwd_pe = round(price / eps, 1)

    return {
        "symbol": sym, "name": name, "group": grp,
        "price": round(price, 2) if isinstance(price, (int, float)) else None,
        "market_cap": q.get("marketCap"),
        "pe": _pos(r.get("priceToEarningsRatioTTM")),
        "fwd_pe": fwd_pe,
        "pb": _pos(r.get("priceToBookRatioTTM")),
        "ps": _pos(r.get("priceToSalesRatioTTM")),
        "ev_ebitda": _pos(km.get("evToEBITDATTM")),
        "stale": False,
    }


def build_valuation(prev: dict | None = None) -> dict | None:
    if not config.FMP_API_KEY:
        return None
    with ThreadPoolExecutor(max_workers=config.FETCH_WORKERS) as ex:
        rows = list(ex.map(_one, UNIVERSE))
    for i, c in enumerate(rows):
        if c.get("price") is None:
            time.sleep(0.3)
            rows[i] = _one(UNIVERSE[i])
    if prev and prev.get("groups"):
        pmap = {c["symbol"]: c for g in prev["groups"] for c in g.get("companies", [])}
        for i, c in enumerate(rows):
            if c.get("price") is None and c["symbol"] in pmap:
                rows[i] = {**pmap[c["symbol"]], "stale": True}

    def medians(items):
        return {m: _median([c.get(m) for c in items]) for m in MULTIPLES}

    groups = []
    for gname in ("Semiconductors", "Big Tech"):
        items = [c for c in rows if c["group"] == gname]
        items.sort(key=lambda c: (c.get("market_cap") or 0), reverse=True)
        groups.append({"name": gname, "companies": items, "medians": medians(items)})
    return {"groups": groups, "overall_medians": medians(rows), "count": len(rows)}
