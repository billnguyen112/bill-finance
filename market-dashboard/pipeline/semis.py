"""Semiconductor industry strength & earnings monitor.

Tracks the 20 most indicative names (designers + equipment + EDA + memory +
foundry) and computes, per company, price strength (momentum, distance from
52-week high, position vs 50/200-day averages) and earnings (YoY revenue growth,
acceleration, next earnings date). Rolls them into an industry breadth/strength
read. All from FMP's /stable API (free tier).
"""

from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta

import config
import sources

# (ticker, group) — the AI/semiconductor complex, categorised like the watchlist.
# Names are pulled live from FMP so the list stays low-maintenance.
SEMI_TICKERS = [
    # Compute — chip designers
    ("NVDA", "Compute"), ("AVGO", "Compute"), ("AMD", "Compute"), ("ARM", "Compute"),
    ("QCOM", "Compute"), ("MRVL", "Compute"), ("INTC", "Compute"), ("MU", "Compute"),
    ("TXN", "Compute"), ("NXPI", "Compute"), ("MCHP", "Compute"), ("ADI", "Compute"),
    ("ON", "Compute"), ("MPWR", "Compute"), ("LSCC", "Compute"),
    # Fab & Equipment — foundry + semicap
    ("TSM", "Fab & Equipment"), ("GFS", "Fab & Equipment"), ("TSEM", "Fab & Equipment"),
    ("AMAT", "Fab & Equipment"), ("KLAC", "Fab & Equipment"), ("LRCX", "Fab & Equipment"),
    ("ASML", "Fab & Equipment"), ("CAMT", "Fab & Equipment"), ("ONTO", "Fab & Equipment"),
    ("ACMR", "Fab & Equipment"), ("NVMI", "Fab & Equipment"), ("ENTG", "Fab & Equipment"),
    ("AEHR", "Fab & Equipment"),
    # EDA & IP
    ("SNPS", "EDA & IP"), ("CDNS", "EDA & IP"), ("ANSS", "EDA & IP"), ("RMBS", "EDA & IP"),
    # Connectivity & optical
    ("CRDO", "Connectivity"), ("COHR", "Connectivity"), ("CIEN", "Connectivity"),
    ("FN", "Connectivity"), ("ALAB", "Connectivity"), ("POET", "Connectivity"),
    ("APH", "Connectivity"), ("SITM", "Connectivity"),
    # Datacenter & AI cloud
    ("CRWV", "Datacenter"), ("NBIS", "Datacenter"), ("ORCL", "Datacenter"),
    ("APLD", "Datacenter"), ("MSFT", "Datacenter"), ("VRT", "Datacenter"), ("SMCI", "Datacenter"),
    # Power & nuclear
    ("VST", "Power & Nuclear"), ("CEG", "Power & Nuclear"), ("GEV", "Power & Nuclear"),
    ("TLN", "Power & Nuclear"), ("NRG", "Power & Nuclear"), ("OKLO", "Power & Nuclear"),
    ("SMR", "Power & Nuclear"), ("BWXT", "Power & Nuclear"), ("CCJ", "Power & Nuclear"),
]
GROUP_ORDER = ["Compute", "Fab & Equipment", "EDA & IP", "Connectivity", "Datacenter", "Power & Nuclear"]
# Groups that count as actual semiconductors for the semi-specific buy/sell signals.
CHIP_GROUPS = {"Compute", "Fab & Equipment", "EDA & IP", "Connectivity"}


def _r(x, d=1):
    return round(x, d) if isinstance(x, (int, float)) else None


def _median(xs):
    xs = sorted(x for x in xs if x is not None)
    if not xs:
        return None
    n = len(xs)
    return xs[n // 2] if n % 2 else (xs[n // 2 - 1] + xs[n // 2]) / 2


def _clamp01(x):
    return max(0.0, min(1.0, x))


def _name(q, sym):
    n = q.get("name") or sym
    for suf in (" Class A Common Stock", " Common Stock", " Class A", " Class B", " Corporation",
                ", Inc.", " Inc.", " Incorporated", " Limited", " Ltd.", " plc", " Holdings",
                " Technologies", " Group"):
        n = n.replace(suf, "")
    return n.strip()[:24]


def _one(item) -> dict:
    sym, group = item
    q = sources.fmp_quote(sym) or {}
    pc = sources.fmp_price_change(sym) or {}
    inc = sources.fmp_income_quarterly(sym, limit=5)
    nxt = sources.fmp_next_earnings(sym)
    est = sources.fmp_estimates(sym)

    revs = [r.get("revenue") for r in inc]
    rev_yoy = _r((revs[0] / revs[4] - 1) * 100) if len(revs) >= 5 and revs[0] and revs[4] else None
    rev_qoq = _r((revs[0] / revs[1] - 1) * 100) if len(revs) >= 2 and revs[0] and revs[1] else None

    price, yh = q.get("price"), q.get("yearHigh")
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
    a50, a200 = q.get("priceAvg50"), q.get("priceAvg200")
    return {
        "symbol": sym, "name": _name(q, sym), "group": group,
        "price": price, "market_cap": q.get("marketCap"), "fwd_pe": fwd_pe, "fwd_pe_2028": fwd_pe_2028,
        "pct_from_high": _r((price / yh - 1) * 100) if price and yh else None,
        "above_50dma": (price > a50) if price and a50 else None,
        "above_200dma": (price > a200) if price and a200 else None,
        "m1": _r(pc.get("1M")), "m3": _r(pc.get("3M")), "y1": _r(pc.get("1Y")),
        "w1": _r(pc.get("5D")),
        "rev_yoy": rev_yoy, "rev_qoq": rev_qoq, "next_earnings": nxt,
    }


def build_semis() -> dict | None:
    if not config.FMP_API_KEY:
        return None
    with ThreadPoolExecutor(max_workers=config.FETCH_WORKERS) as ex:
        companies = list(ex.map(_one, SEMI_TICKERS))
    # Live-only: a couple of sequential retry passes for any name whose burst
    # got transiently rate-limited, so all names fill from the API.
    for _ in range(2):
        missing = [i for i, c in enumerate(companies) if c.get("price") is None]
        if not missing:
            break
        for i in missing:
            time.sleep(0.3)
            companies[i] = _one(SEMI_TICKERS[i])
    companies.sort(key=lambda c: (c.get("market_cap") or 0), reverse=True)
    n = len(companies)

    def pct_true(key):
        vals = [c[key] for c in companies if c[key] is not None]
        return round(sum(1 for v in vals if v) / len(vals) * 100) if vals else None

    breadth50 = pct_true("above_50dma")
    breadth200 = pct_true("above_200dma")
    pfh = [c["pct_from_high"] for c in companies if c["pct_from_high"] is not None]
    near_high = round(sum(1 for x in pfh if x >= -10) / len(pfh) * 100) if pfh else None
    revs = [c["rev_yoy"] for c in companies if c["rev_yoy"] is not None]
    med_rev = _r(_median(revs))
    growing = sum(1 for r in revs if r > 0)
    m3s = [c["m3"] for c in companies if c["m3"] is not None]
    med_m3 = _r(_median(m3s))

    # Strength score 0-100 from breadth + momentum + earnings (transparent blend).
    comps = []
    if breadth50 is not None:
        comps.append(breadth50 / 100)
    if near_high is not None:
        comps.append(near_high / 100)
    if med_m3 is not None:
        comps.append(_clamp01((med_m3 + 15) / 45))   # -15%..+30% 3m -> 0..1
    if revs:
        comps.append(growing / len(revs))
    strength = round(100 * sum(comps) / len(comps)) if comps else None
    label = ("Strong" if strength is not None and strength >= 70 else
             "Firm" if strength is not None and strength >= 50 else
             "Mixed" if strength is not None and strength >= 30 else
             "Weak" if strength is not None else "n/a")

    today = date.today().isoformat()
    horizon = (date.today() + timedelta(days=14)).isoformat()
    upcoming = sorted(
        ({"symbol": c["symbol"], "date": c["next_earnings"]}
         for c in companies if c["next_earnings"] and today <= c["next_earnings"] <= horizon),
        key=lambda x: x["date"],
    )

    return {
        "companies": companies,
        "group_order": GROUP_ORDER,
        "count": n,
        "strength": strength,
        "strength_label": label,
        "breadth_50dma": breadth50,
        "breadth_200dma": breadth200,
        "near_high_pct": near_high,
        "median_rev_growth": med_rev,
        "growing_count": growing,
        "rev_reported": len(revs),
        "median_3m": med_m3,
        "upcoming_earnings": upcoming,
    }
