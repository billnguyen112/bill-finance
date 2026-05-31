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
MULTIPLES = ("pe", "fwd_pe", "fwd_pe_2028", "pb", "ps", "ev_ebitda")
MEDIAN_KEYS = MULTIPLES + ("gross_margin", "op_margin", "fcf_ni")


def _pos(v):
    return round(v, 1) if isinstance(v, (int, float)) and v > 0 else None


def _median(xs):
    xs = sorted(x for x in xs if isinstance(x, (int, float)) and x > 0)
    if not xs:
        return None
    n = len(xs)
    return round(xs[n // 2] if n % 2 else (xs[n // 2 - 1] + xs[n // 2]) / 2, 1)


def _pct(v):
    return round(v * 100, 1) if isinstance(v, (int, float)) else None


def _one(item) -> dict:
    sym, name, grp = item
    q = sources.fmp_quote(sym) or {}
    r = sources.fmp_ratios(sym) or {}
    km = sources.fmp_key_metrics(sym) or {}
    est = sources.fmp_estimates(sym)
    cf = sources.fmp_cash_flow(sym) or {}
    price = q.get("price")

    # Earnings-quality metrics (his "CFO illusions" lens).
    fcf, sbc, ocf, ni = (cf.get("freeCashFlow"), cf.get("stockBasedCompensation"),
                         cf.get("operatingCashFlow"), cf.get("netIncome"))
    fcf_ni = round(fcf / ni, 2) if isinstance(fcf, (int, float)) and ni else None
    sbc_ocf = round(sbc / ocf * 100, 1) if isinstance(sbc, (int, float)) and ocf else None

    fwd_pe = fwd_pe_2028 = None
    if isinstance(price, (int, float)) and est:
        future = sorted((e for e in est if e.get("date") and e["date"] >= date.today().isoformat()),
                        key=lambda e: e["date"])
        eps = (future[0] if future else {}).get("epsAvg")
        if isinstance(eps, (int, float)) and eps > 0:
            fwd_pe = round(price / eps, 1)
        eps28 = next((e.get("epsAvg") for e in est if str(e.get("date", "")).startswith("2028")), None)
        if isinstance(eps28, (int, float)) and eps28 > 0:
            fwd_pe_2028 = round(price / eps28, 1)

    return {
        "symbol": sym, "name": name, "group": grp,
        "price": round(price, 2) if isinstance(price, (int, float)) else None,
        "market_cap": q.get("marketCap"),
        "pe": _pos(r.get("priceToEarningsRatioTTM")),
        "fwd_pe": fwd_pe,
        "fwd_pe_2028": fwd_pe_2028,
        "pb": _pos(r.get("priceToBookRatioTTM")),
        "ps": _pos(r.get("priceToSalesRatioTTM")),
        "ev_ebitda": _pos(km.get("evToEBITDATTM")),
        "gross_margin": _pct(r.get("grossProfitMarginTTM")),
        "op_margin": _pct(r.get("operatingProfitMarginTTM")),
        "fcf_ni": fcf_ni,
        "sbc_ocf": sbc_ocf,
    }


def build_valuation() -> dict | None:
    if not config.FMP_API_KEY:
        return None
    with ThreadPoolExecutor(max_workers=config.FETCH_WORKERS) as ex:
        rows = list(ex.map(_one, UNIVERSE))
    for _ in range(2):  # live-only retry for transiently rate-limited names
        missing = [i for i, c in enumerate(rows) if c.get("price") is None]
        if not missing:
            break
        for i in missing:
            time.sleep(0.3)
            rows[i] = _one(UNIVERSE[i])

    def medians(items):
        return {m: _median([c.get(m) for c in items]) for m in MEDIAN_KEYS}

    groups = []
    for gname in ("Semiconductors", "Big Tech"):
        items = [c for c in rows if c["group"] == gname]
        items.sort(key=lambda c: (c.get("market_cap") or 0), reverse=True)
        groups.append({"name": gname, "companies": items, "medians": medians(items)})
    return {"groups": groups, "overall_medians": medians(rows), "count": len(rows)}
