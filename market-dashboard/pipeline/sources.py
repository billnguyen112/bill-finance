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


def _get(url: str) -> str:
    last = None
    for attempt in range(config.HTTP_RETRIES):
        try:
            req = urllib.request.Request(url, headers=_UA)
            with urllib.request.urlopen(req, timeout=config.HTTP_TIMEOUT) as resp:
                return resp.read().decode("utf-8", "replace")
        except Exception as exc:  # network flake / timeout
            last = exc
            time.sleep(2 ** attempt)  # 1, 2, 4, 8s backoff
    raise RuntimeError(f"GET failed after {config.HTTP_RETRIES} tries: {url} ({last})")


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


# --- Financial Modeling Prep (free key) ------------------------------------
def fmp_get(path: str):
    """GET an FMP v3 endpoint as JSON, or None if no key / on error."""
    if not config.FMP_API_KEY:
        return None
    sep = "&" if "?" in path else "?"
    url = f"{config.FMP_BASE}/{path}{sep}apikey={config.FMP_API_KEY}"
    try:
        return json.loads(_get(url))
    except Exception:
        return None


def fmp_sectors() -> list[dict] | None:
    """Sector performance: [{'sector': 'Technology', 'change': 1.2}, ...]."""
    data = fmp_get("sectors-performance")
    if not isinstance(data, list) or not data:
        return None
    out = []
    for d in data:
        raw = str(d.get("changesPercentage", "")).replace("%", "").strip()
        try:
            out.append({"sector": d.get("sector", "?"), "change": float(raw)})
        except ValueError:
            continue
    return out or None


def fmp_revenue_growth_yoy(ticker: str) -> float | None:
    """Latest-quarter revenue vs the same quarter a year ago, in percent."""
    data = fmp_get(f"income-statement/{ticker}?period=quarter&limit=5")
    if not isinstance(data, list) or len(data) < 5:
        return None
    try:
        cur = float(data[0]["revenue"])
        yago = float(data[4]["revenue"])
        if yago:
            return round((cur / yago - 1) * 100, 1)
    except (KeyError, ValueError, TypeError):
        return None
    return None


def fmp_pe_ttm(ticker: str) -> float | None:
    data = fmp_get(f"ratios-ttm/{ticker}")
    if not isinstance(data, list) or not data:
        return None
    pe = data[0].get("peRatioTTM")
    try:
        return round(float(pe), 1) if pe is not None else None
    except (ValueError, TypeError):
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
