"""Key-free data scrapers.

FRED's CSV download endpoint serves full history for any series without an API
key. We also try to scrape the Shiller CAPE ratio from multpl.com (best effort).
"""

from __future__ import annotations

import csv
import io
import json
import re
import time
import urllib.parse
import urllib.request

import config

FRED_API = "https://api.stlouisfed.org/fred/series/observations"

_UA = {"User-Agent": "Mozilla/5.0 (market-dashboard)"}


def _get(url: str, retries: int | None = None, headers: dict | None = None) -> str:
    last = None
    n = config.HTTP_RETRIES if retries is None else retries
    hdrs = {**_UA, **(headers or {})}
    for attempt in range(n):
        try:
            req = urllib.request.Request(url, headers=hdrs)
            with urllib.request.urlopen(req, timeout=config.HTTP_TIMEOUT) as resp:
                return resp.read().decode("utf-8", "replace")
        except Exception as exc:  # network flake / timeout
            last = exc
            if attempt < n - 1:
                time.sleep(2 ** attempt)  # 1, 2, 4, 8s backoff
    raise RuntimeError(f"GET failed after {n} tries: {url} ({last})")


def fred_series(series_id: str) -> list[tuple[str, float]]:
    """Return [(date 'YYYY-MM-DD', value), ...] ascending, skipping missing.

    Uses the official FRED API when FRED_API_KEY is set (reliable + fast from
    any IP, incl. CI). Falls back to the public CSV endpoint otherwise — fine on
    a residential IP, but FRED throttles that endpoint from cloud/datacenter IPs,
    so set a (free) key for GitHub Actions. https://fredaccount.stlouisfed.org/apikeys
    """
    if config.FRED_API_KEY:
        return _fred_api(series_id)
    return _fred_csv(series_id)


def _fred_api(series_id: str) -> list[tuple[str, float]]:
    params = urllib.parse.urlencode({
        "series_id": series_id,
        "file_type": "json",
        "api_key": config.FRED_API_KEY,
    })
    data = json.loads(_get(f"{FRED_API}?{params}"))
    out: list[tuple[str, float]] = []
    for o in data.get("observations", []):
        raw = o.get("value", ".")
        if raw in ("", "."):
            continue
        try:
            out.append((o["date"], float(raw)))
        except (ValueError, KeyError):
            continue
    return out


def _fred_csv(series_id: str) -> list[tuple[str, float]]:
    text = _get(config.FRED_CSV.format(id=series_id))
    rows = list(csv.reader(io.StringIO(text)))
    if not rows:
        return []
    # Header is DATE,<SERIES_ID> (older) or observation_date,<id> (newer).
    out: list[tuple[str, float]] = []
    for r in rows[1:]:
        if len(r) < 2:
            continue
        date, raw = r[0].strip(), r[1].strip()
        if raw in ("", "."):  # FRED uses '.' for missing
            continue
        try:
            out.append((date, float(raw)))
        except ValueError:
            continue
    return out


_MARGIN_ROW = re.compile(
    r"<td>([A-Z][a-z]{2}-\d{2})</td>\s*<td>([\d,]+)</td>", re.I
)


def finra_margin_debt() -> list[tuple[str, float]] | None:
    """Scrape FINRA's monthly margin-debt table (no key).

    Returns [(month_label, debit_balance_millions), ...] most-recent first, or
    None if unavailable.
    """
    try:
        html = _get(config.FINRA_MARGIN_URL)
    except Exception:
        return None
    rows = _MARGIN_ROW.findall(html)
    out = []
    for label, val in rows:
        try:
            out.append((label, float(val.replace(",", ""))))
        except ValueError:
            continue
    return out or None


# --- Financial Modeling Prep (free key, "stable" API) ----------------------
def fmp_stable(endpoint: str, **params):
    """GET an FMP /stable endpoint as parsed JSON, or None (no key / error)."""
    if not config.FMP_API_KEY:
        return None
    params["apikey"] = config.FMP_API_KEY
    url = f"{config.FMP_BASE}/{endpoint}?{urllib.parse.urlencode(params)}"
    try:
        data = json.loads(_get(url, retries=2))  # fail fast — don't burn retries
    except Exception:
        return None
    if isinstance(data, dict) and ("Error Message" in data or "error" in data):
        return None
    return data


def fmp_quote(symbol: str) -> dict | None:
    d = fmp_stable("quote", symbol=symbol)
    return d[0] if isinstance(d, list) and d else None


def fmp_price_change(symbol: str) -> dict | None:
    d = fmp_stable("stock-price-change", symbol=symbol)
    return d[0] if isinstance(d, list) and d else None


def fmp_pe(symbol: str) -> float | None:
    """Trailing P/E (the stable `quote` endpoint doesn't carry it)."""
    d = fmp_stable("ratios-ttm", symbol=symbol)
    if not isinstance(d, list) or not d:
        return None
    pe = d[0].get("priceToEarningsRatioTTM")
    try:
        return round(float(pe), 1) if pe is not None else None
    except (ValueError, TypeError):
        return None


def fmp_ratios(symbol: str) -> dict | None:
    d = fmp_stable("ratios-ttm", symbol=symbol)
    return d[0] if isinstance(d, list) and d else None


def fmp_key_metrics(symbol: str) -> dict | None:
    d = fmp_stable("key-metrics-ttm", symbol=symbol)
    return d[0] if isinstance(d, list) and d else None


def fmp_estimates(symbol: str) -> list:
    d = fmp_stable("analyst-estimates", symbol=symbol, period="annual", limit=10)
    return d if isinstance(d, list) else []


def fmp_history(symbol: str) -> list:
    """Daily price history as [(date, price), ...] ascending (for sparklines)."""
    d = fmp_stable("historical-price-eod/light", symbol=symbol)
    rows = d if isinstance(d, list) else (d.get("historical") if isinstance(d, dict) else None)
    if not rows:
        return []
    out = []
    for r in rows:
        dt, px = r.get("date"), (r.get("price") if r.get("price") is not None else r.get("close"))
        if dt and isinstance(px, (int, float)):
            out.append((dt, float(px)))
    out.sort()
    return out


def fmp_cash_flow(symbol: str) -> dict | None:
    """Latest annual cash-flow statement (FCF, SBC, operating CF, net income)."""
    d = fmp_stable("cash-flow-statement", symbol=symbol, period="annual", limit=1)
    return d[0] if isinstance(d, list) and d else None


def fmp_income_quarterly(symbol: str, limit: int = 6) -> list:
    d = fmp_stable("income-statement", symbol=symbol, period="quarter", limit=limit)
    return d if isinstance(d, list) else []


def fmp_next_earnings(symbol: str) -> str | None:
    """Next scheduled earnings date (ISO), or None."""
    from datetime import date
    d = fmp_stable("earnings", symbol=symbol, limit=5)
    if not isinstance(d, list):
        return None
    today = date.today().isoformat()
    upcoming = [e.get("date") for e in d
                if e.get("date") and e["date"] >= today and e.get("epsActual") is None]
    return min(upcoming) if upcoming else None


def fmp_sectors() -> list[dict] | None:
    """Latest sector performance (percent), averaged across exchanges:
    [{'sector': 'Technology', 'change': 1.2}, ...]."""
    from datetime import date, timedelta
    for back in range(0, 7):
        d = (date.today() - timedelta(days=back)).isoformat()
        data = fmp_stable("sector-performance-snapshot", date=d)
        if isinstance(data, list) and data:
            agg: dict[str, list] = {}
            for row in data:
                s, c = row.get("sector"), row.get("averageChange")
                if s is None or c is None:
                    continue
                agg.setdefault(s, []).append(c)
            return [{"sector": s, "change": round(sum(v) / len(v), 3)} for s, v in agg.items()]
    return None


def shiller_cape() -> float | None:
    """Best-effort scrape of the current Shiller CAPE (CAPE/PE10) ratio."""
    try:
        html = _get("https://www.multpl.com/shiller-pe")
    except Exception:
        return None
    # The page shows "Current Shiller PE Ratio: NN.NN ..."
    m = re.search(r"Current Shiller PE Ratio[:\s]*([0-9]+\.?[0-9]*)", html, re.I)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            return None
    return None
