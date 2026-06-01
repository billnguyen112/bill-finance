"""Turn a raw FRED series into a metric: latest value, multi-horizon changes,
a YoY headline for index series, a sparkline, and 1y/5y stats.
"""

from __future__ import annotations

from datetime import date, timedelta


def _d(s: str) -> date:
    return date.fromisoformat(s)


def _on_or_before(obs: list[tuple[str, float]], target: date):
    """Most recent (date, value) with date <= target, else None."""
    for ds, v in reversed(obs):
        if _d(ds) <= target:
            return ds, v
    return None


def _downsample(obs: list[tuple[str, float]], max_points: int = 90):
    if len(obs) <= max_points:
        return [[d, v] for d, v in obs]
    step = len(obs) / max_points
    picked = [obs[int(i * step)] for i in range(max_points)]
    if picked[-1] != obs[-1]:
        picked[-1] = obs[-1]
    return [[d, v] for d, v in picked]


def build_metric(meta: dict, obs: list[tuple[str, float]]) -> dict:
    key, label = meta["key"], meta["label"]
    kind, unit, better = meta["kind"], meta["unit"], meta["better"]
    base = {
        "key": key, "label": label, "section": meta["section"],
        "kind": kind, "unit": unit, "better": better,
    }
    if not obs:
        return {**base, "status": "error", "error": "no data"}

    last_date, last_val = obs[-1]
    ld = _d(last_date)

    # Multi-horizon changes vs nearest earlier observation, de-duplicated so a
    # monthly series doesn't report the same point as "1w" and "1m".
    changes = {}
    used_dates = set()
    for name, days in (("prev", None), ("1w", 7), ("1m", 30), ("1y", 365)):
        if name == "prev":
            ref = obs[-2] if len(obs) >= 2 else None
        else:
            ref = _on_or_before(obs, ld - timedelta(days=days))
        if not ref:
            continue
        rdate, rval = ref
        if rdate == last_date or rdate in used_dates:
            continue
        used_dates.add(rdate)
        changes[name] = {
            "date": rdate,
            "abs": round(last_val - rval, 4),
            "pct": round((last_val / rval - 1) * 100, 2) if rval else None,
        }

    # Weekly-cadence series (Fed balance sheet, TGA, reserves, net liquidity…):
    # the prior observation IS ~1 week old, so the 7-day lookback was deduped into
    # "prev". Surface it as a proper "1w" so it's labelled week-on-week — but only
    # when the prior point is genuinely ~a week back (never for monthly/quarterly,
    # where "prev" is a month/quarter and must stay an unlabelled delta).
    if "1w" not in changes and "prev" in changes:
        gap = (ld - _d(changes["prev"]["date"])).days
        if 5 <= gap <= 9:
            changes["1w"] = changes["prev"]

    # Headline number depends on the series kind.
    if kind == "index_yoy":
        yref = _on_or_before(obs, ld - timedelta(days=365))
        yoy = round((last_val / yref[1] - 1) * 100, 2) if yref and yref[1] else None
        # acceleration: how the YoY itself changed vs the prior observation
        accel = None
        if len(obs) >= 2:
            pdate, pval = obs[-2]
            pyref = _on_or_before(obs, _d(pdate) - timedelta(days=365))
            if pyref and pyref[1] and yoy is not None:
                prev_yoy = (pval / pyref[1] - 1) * 100
                accel = round(yoy - prev_yoy, 2)
        headline, headline_unit = yoy, "% y/y"
        extra = {"level": last_val, "yoy_accel": accel}
    elif kind == "level_chg":
        prev = obs[-2][1] if len(obs) >= 2 else last_val
        headline, headline_unit = round(last_val - prev, 1), unit
        extra = {"level": last_val}
    else:
        headline, headline_unit = last_val, unit
        extra = {}

    # 1y / 5y stats
    one_y = [v for d, v in obs if _d(d) >= ld - timedelta(days=365)]
    five_y = [v for d, v in obs if _d(d) >= ld - timedelta(days=365 * 5)]
    stats = {}
    if one_y:
        hi, lo = max(one_y), min(one_y)
        stats["high_1y"], stats["low_1y"] = round(hi, 4), round(lo, 4)
        stats["pct_from_high_1y"] = round((last_val / hi - 1) * 100, 2) if hi else None
    if len(five_y) >= 8:
        mean = sum(five_y) / len(five_y)
        var = sum((x - mean) ** 2 for x in five_y) / len(five_y)
        sd = var ** 0.5
        stats["zscore_5y"] = round((last_val - mean) / sd, 2) if sd else 0.0

    spark_window = [(d, v) for d, v in obs if _d(d) >= ld - timedelta(days=365 * 2)]
    return {
        **base,
        "status": "ok",
        "latest": {"date": last_date, "value": round(last_val, 4)},
        "headline": headline,
        "headline_unit": headline_unit,
        "changes": changes,
        "stats": stats,
        "spark": _downsample(spark_window or obs),
        **extra,
    }
