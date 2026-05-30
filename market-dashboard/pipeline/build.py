"""Fetch every series, compute metrics, run the rule engine, and write
snapshot.json (the full current read) + append to history.json (overall score
over time, for the trend chart).
"""

from __future__ import annotations

import json
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import config
import sources
import indicators
import analyze
import explanations
import signals as signals_mod
import semis as semis_mod
import valuation as valuation_mod


def _meta(row) -> dict:
    keys = ["key", "fred_id", "label", "section", "kind", "unit", "better"]
    return dict(zip(keys, row))


def _load_prev_snapshot() -> dict | None:
    """Last published snapshot (downloaded by the workflow), for cache fallback."""
    try:
        return json.loads((config.DATA_DIR / "prev_snapshot.json").read_text())
    except (OSError, json.JSONDecodeError):
        return None


def _fetch(fid: str):
    try:
        return fid, sources.fred_series(fid), None
    except Exception as exc:
        return fid, [], f"{type(exc).__name__}: {exc}"


def build(verbose: bool = False) -> dict:
    config.ensure_dirs()
    if verbose:
        print(f"FRED key: {'set (API mode)' if config.FRED_API_KEY else 'MISSING (keyless CSV — throttled in CI)'}"
              f" | FMP key: {'set' if config.FMP_API_KEY else 'missing'}")
    metrics_by_key: dict[str, dict] = {}
    errors: list[dict] = []

    # Fetch every FRED series (data + curve tenors) concurrently — sequential
    # fetches with retries can take minutes; in parallel the run is bounded by
    # the single slowest feed, not their sum.
    all_ids = list(dict.fromkeys(
        [_meta(r)["fred_id"] for r in config.SERIES] + [fid for _, fid in config.CURVE]
    ))
    fetched: dict[str, tuple] = {}
    with ThreadPoolExecutor(max_workers=config.FETCH_WORKERS) as ex:
        for fid, obs, err in ex.map(_fetch, all_ids):
            fetched[fid] = (obs, err)

    # Gentle sequential retry for stragglers — a burst of parallel requests can
    # get a few rate-limited/dropped even on the API; spacing them out recovers them.
    stragglers = [fid for fid, (obs, err) in fetched.items() if err]
    for fid in stragglers:
        time.sleep(0.4)
        _, obs, err = _fetch(fid)
        fetched[fid] = (obs, err)
    if verbose and stragglers:
        recovered = sum(1 for fid in stragglers if not fetched[fid][1])
        print(f"  retried {len(stragglers)} stragglers, recovered {recovered}")

    for row in config.SERIES:
        meta = _meta(row)
        obs, err = fetched.get(meta["fred_id"], ([], "not fetched"))
        if err:
            metric = {**{k: meta[k] for k in ("key", "label", "section", "unit")},
                      "status": "error", "error": err}
            errors.append({"key": meta["key"], "error": err})
        else:
            metric = indicators.build_metric(meta, obs)
            if metric.get("status") != "ok":
                errors.append({"key": meta["key"], "error": metric.get("error", "no data")})
        sig = analyze.signal_for(metric)
        if sig:
            metric["signal"] = sig
        explain = explanations.VARIABLE.get(meta["key"])
        if explain:
            metric["explain"] = explain
        metrics_by_key[meta["key"]] = metric
        if verbose:
            st = metric.get("status")
            print(f"  {meta['key']:<16} {st}"
                  + (f"  {metric.get('headline')}" if st == "ok" else f"  {metric.get('error','')[:40]}"))

    # Optional extras
    cape = sources.shiller_cape()

    # Gold — FRED discontinued its series; source the spot price from FMP.
    if config.FMP_API_KEY:
        gold_obs = sources.fmp_history("GCUSD")
        if gold_obs:
            gmeta = {"key": "gold", "label": "Gold", "section": "commodities",
                     "kind": "price", "unit": "$", "better": "none"}
            gm = indicators.build_metric(gmeta, gold_obs)
            ex = explanations.VARIABLE.get("gold")
            if ex:
                gm["explain"] = ex
            metrics_by_key["gold"] = gm

    # Yield curve (best effort; tolerate missing tenors)
    curve = []
    for tenor, fid in config.CURVE:
        obs, _ = fetched.get(fid, ([], None))
        if obs:
            curve.append({"tenor": tenor, "value": round(obs[-1][1], 2), "date": obs[-1][0]})

    overall = analyze.overall_read(metrics_by_key)

    sections = []
    for skey, slabel in config.SECTIONS:
        sec_metrics = [m for m in metrics_by_key.values() if m.get("section") == skey]
        # preserve catalog order
        order = [r[0] for r in config.SERIES]
        sec_metrics.sort(key=lambda m: order.index(m["key"]) if m["key"] in order else 999)
        sections.append({
            "key": skey,
            "label": slabel,
            "summary": analyze.section_summary(skey, metrics_by_key),
            "explain": explanations.SECTION.get(skey, ""),
            "metrics": sec_metrics,
        })

    # Semiconductor monitor — also feeds the semi signals (no duplicate calls).
    # Pass the previously published snapshot so names the FMP daily limit blocks
    # fall back to last-good values instead of blanking.
    prev_snapshot = _load_prev_snapshot()
    semis = semis_mod.build_semis(prev=(prev_snapshot or {}).get("semis"))

    # Extra data for the buy/sell signal model.
    extras = {"margin": sources.finra_margin_debt()}
    if semis:
        extras["semis_pe"] = [c["pe"] for c in semis["companies"] if c.get("pe")]
        extras["semis_rev"] = [c["rev_yoy"] for c in semis["companies"] if c.get("rev_yoy") is not None]
    if config.FMP_API_KEY:
        sectors = sources.fmp_sectors()
        extras["sectors"] = sectors
        leads = []
        for s in sorted(sectors or [], key=lambda x: x["change"], reverse=True)[:2]:
            if s["change"] > 0:
                tkr = config.SECTOR_BELLWETHERS.get(s["sector"])
                inc = sources.fmp_income_quarterly(tkr, limit=5) if tkr else []
                rv = [r.get("revenue") for r in inc]
                if len(rv) >= 5 and rv[0] and rv[4]:
                    leads.append((rv[0] / rv[4] - 1) * 100)
        extras["leaders_growth"] = sum(leads) / len(leads) if leads else None
    playbook = signals_mod.build_playbook(metrics_by_key, cape, overall, extras)

    valuation = valuation_mod.build_valuation(prev=(prev_snapshot or {}).get("valuation"))

    now = datetime.now(timezone.utc).isoformat()
    snapshot = {
        "generated_at": now,
        "overall": overall,
        "playbook": playbook,
        "semis": semis,
        "valuation": valuation,
        "sections": sections,
        "curve": curve,
        "cape": cape,
        "ok_count": sum(1 for m in metrics_by_key.values() if m.get("status") == "ok"),
        "total_count": len(metrics_by_key),
        "errors": errors,
        "fred_mode": "api" if config.FRED_API_KEY else "csv",
        "fmp_enabled": bool(config.FMP_API_KEY),
    }
    config.SNAPSHOT_PATH.write_text(json.dumps(snapshot, indent=2))
    _append_history(now, overall, cape)
    return snapshot


def _append_history(ts: str, overall: dict, cape) -> None:
    try:
        hist = json.loads(config.HISTORY_PATH.read_text())
    except (OSError, json.JSONDecodeError):
        hist = {"points": []}
    points = hist.get("points", [])
    today = ts[:10]
    points = [p for p in points if p.get("date") != today]  # one point per day
    points.append({
        "date": today, "ts": ts,
        "score": overall["score"], "label": overall["label"], "cape": cape,
    })
    points = points[-260:]  # ~1y of daily refreshes
    config.HISTORY_PATH.write_text(json.dumps({"points": points}, indent=2))


if __name__ == "__main__":
    snap = build(verbose=True)
    print(json.dumps(snap["overall"], indent=2))
    print(f"ok {snap['ok_count']}/{snap['total_count']}, errors {len(snap['errors'])}")
