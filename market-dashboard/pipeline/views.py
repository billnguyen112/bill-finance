"""'Their Views' — pull the latest weekly market-update transcript from each
tracked channel (via Supadata), trim the spotlight, and extract an extractive
digest: the macro themes they hit, the data points they cited, the tickers they
named, and a map onto our own tracker sections. No LLM.
"""

from __future__ import annotations

import re

import config
import sources

# theme label, keywords, the dashboard section it maps onto (or None)
THEMES = [
    ("Inflation", ["inflation", "cpi", "ppi", "pce", "deflat"], "inflation"),
    ("Fed & rates", ["fed", "fomc", "powell", "rate cut", "rate hike", "interest rate",
                     "yield", "treasury", "basis point"], "rates"),
    ("Credit & liquidity", ["spread", "oas", "credit", "liquidity", "margin debt", "leverage"], "credit"),
    ("Equities & valuation", ["s&p", "nasdaq", "cape", "valuation", "earnings", "multiple",
                              "bubble", "1999", "p/e", "forward"], "equities"),
    ("Labor & growth", ["jobs", "payroll", "unemployment", "gdp", "jobless", "recession",
                        "final sales"], "growth"),
    ("Housing", ["housing", "home sales", "mortgage", "homebuilder"], "housing"),
    ("Commodities & dollar", ["oil", "wti", "crude", "gold", "dollar", "commodit"], "commodities"),
    ("Geopolitics", ["tariff", "trump", "xi", "china", "iran", "war", "blockade", "sanction"], None),
]
_TICKER = re.compile(r"\b[A-Z]{2,5}\b")
_STOP = {"CPI", "PPI", "PCE", "FOMC", "GDP", "USD", "CEO", "ETF", "AI", "US", "OK", "EPS",
         "FED", "WTI", "OAS", "TV", "GM", "CFO", "AM", "PM", "UK", "EU", "OPEC", "II", "III",
         "IV", "JP", "GPT", "LLM", "PC", "ROI", "EBA", "AAI", "IPO", "YOY", "YTD", "AKA",
         "IMO", "FYI", "IRA", "IRS", "ASC", "DPO", "ESG", "NATO", "UN", "GDPR", "DDS", "JP"}


def _is_update(title: str) -> bool:
    return not any(k in title.lower() for k in config.EXCLUDE_KEYWORDS)


def _trim_spotlight(text: str) -> str:
    low = text.lower()
    n = len(low)
    best = None
    for m in config.SPOTLIGHT_MARKERS:
        i = low.find(m, int(n * config.SPOTLIGHT_MIN_FRACTION))
        if i != -1 and (best is None or i < best):
            best = i
    return text[:best].rstrip() if best else text


def _digest(text: str) -> dict:
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    themes = []
    for label, kws, section in THEMES:
        hits = [s for s in sentences if any(k in s.lower() for k in kws)]
        if not hits:
            continue
        data = [s for s in hits if re.search(r"\d", s)]
        points = [s[:280] for s in (data[:3] or hits[:2])]
        themes.append({"theme": label, "section": section, "points": points, "mentions": len(hits)})
    themes.sort(key=lambda t: -t["mentions"])
    tickers = sorted({t for t in _TICKER.findall(text) if t not in _STOP})
    tldr = " ".join(sentences[:2])[:320]
    return {"themes": themes, "tickers": tickers[:25], "tldr": tldr}


def _channel_item(ch: dict) -> dict | None:
    vids = sources.channel_videos(ch["channel_id"], limit=15)
    target = next((v for v in vids if _is_update(v["title"])), None)
    if not target:
        return None
    text = sources.supadata_transcript(target["video_id"])
    if not text:
        return None
    if ch.get("trim_spotlight"):
        text = _trim_spotlight(text)
    d = _digest(text)
    return {
        "channel": ch["name"],
        "video": {
            "video_id": target["video_id"], "title": target["title"],
            "published": target["published"],
            "url": f"https://www.youtube.com/watch?v={target['video_id']}",
        },
        "word_count": len(text.split()),
        **d,
    }


def _digest_video(ch: dict, v: dict) -> dict | None:
    text = sources.supadata_transcript(v["video_id"])
    if not text:
        return None
    if ch.get("trim_spotlight"):
        text = _trim_spotlight(text)
    return {
        "video_id": v["video_id"], "channel": ch["name"], "title": v["title"],
        "url": f"https://www.youtube.com/watch?v={v['video_id']}", "date": v["published"],
        "word_count": len(text.split()), **_digest(text),
    }


def build_archive(prev_by_id: dict | None = None, days: int = 95) -> dict | None:
    """Digest every market update from the tracked channels over the last `days`,
    re-using already-digested videos (transcripts are immutable, and the Supadata
    free tier is limited) so each video is fetched at most once."""
    if not config.SUPADATA_API_KEY:
        return None
    from datetime import date, timedelta
    prev_by_id = prev_by_id or {}
    cutoff = (date.today() - timedelta(days=days)).isoformat()
    videos = []
    for ch in config.CHANNELS:
        for v in sources.channel_videos(ch["channel_id"], limit=30):
            if not v["published"] or v["published"] < cutoff or not _is_update(v["title"]):
                continue
            if v["video_id"] in prev_by_id:
                videos.append(prev_by_id[v["video_id"]])
                continue
            try:
                d = _digest_video(ch, v)
            except Exception:
                d = None
            if d:
                videos.append(d)
    videos.sort(key=lambda x: x.get("date", ""), reverse=True)
    return {"videos": videos} if videos else None


def latest_per_channel(archive: dict | None) -> dict | None:
    if not archive or not archive.get("videos"):
        return None
    seen, items = set(), []
    for v in archive["videos"]:
        if v["channel"] not in seen:
            seen.add(v["channel"])
            items.append(v)
    return {"items": items}
