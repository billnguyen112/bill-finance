"""'Their Views' — pull the latest weekly market-update transcript from each
tracked channel (via Supadata), trim the spotlight, and extract an extractive
digest: the macro themes they hit, the data points they cited, the tickers they
named, and a map onto our own tracker sections. No LLM.
"""

from __future__ import annotations

import re
from collections import Counter

import config
import sources

# Bump when the digest logic changes so carried-over videos get re-digested.
DIGEST_VERSION = 3

_FILLER = re.compile(r"\b(uh+|um+|uhm+|erm+|hmm+|mm+|you know|i mean|kind of|sort of|right\?|okay so|so basically)\b", re.I)
_LEAD = re.compile(r"^(and|so|but|now|well|okay|ok|yeah|yep|uh|um|right|look|see|i mean|you know)[\s,]+", re.I)
# Phrases that mark a conclusion / his actual view (vs. just naming a topic).
_INSIGHT = [
    "i think", "i expect", "i believe", "my view", "the key", "the point", "the takeaway",
    "bottom line", "what this means", "this means", "this tells", "tells us", "suggests",
    "the issue", "the problem", "the concern", "the risk", "watch for", "watch out",
    "important", "expect", "likely", "should", "bullish", "bearish", "matters", "the reason",
    "because", "so what", "which is why", "the bottom line", "going to", "will be",
]


def _clean(text: str) -> str:
    t = re.sub(r"\[[^\]]*\]", " ", text)            # [music], [applause]
    t = t.replace(">>", " ").replace("&gt;&gt;", " ")
    t = _FILLER.sub(" ", t)
    t = re.sub(r"\b(\w+)(\s+\1\b)+", r"\1", t, flags=re.I)   # collapse stutters ("the the")
    t = re.sub(r"\s+([,.;:!?])", r"\1", t)
    return re.sub(r"\s+", " ", t).strip()


def _polish(s: str) -> str:
    """Tidy a single sentence into a presentable bullet."""
    prev = None
    while prev != s:                                 # strip leading filler/conjunctions
        prev = s
        s = _LEAD.sub("", s).strip()
    s = re.sub(r"\s+", " ", s).strip(" ,;:-")
    if s and s[0].islower():
        s = s[0].upper() + s[1:]
    if s and s[-1] not in ".!?":
        s += "."
    return s


def _score(s: str) -> int:
    sl = s.lower()
    n = len(s.split())
    score = 0
    if re.search(r"\d", s):                       # data points
        score += 2
    score += sum(1 for k in _INSIGHT if k in sl)  # his view / conclusions
    if 9 <= n <= 42:
        score += 1
    if n < 7 or n > 55:
        score -= 2
    return score

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


def _top(sentences, n=2):
    """Highest-insight, polished, de-duplicated sentences."""
    out = []
    for s in sorted(sentences, key=_score, reverse=True):
        if len(out) >= n:
            break
        if _score(s) <= 0:
            continue
        p = _polish(s)[:260]
        if len(p.split()) < 8:                       # drop fragments
            continue
        if any(p[:45].lower() == q[:45].lower() for q in out):
            continue
        out.append(p)
    return out


def _digest(text: str) -> dict:
    text = _clean(text)
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if len(s.split()) >= 6]
    themes = []
    for label, kws, section in THEMES:
        hits = [s for s in sentences if any(k in s.lower() for k in kws)]
        if not hits:
            continue
        points = _top(hits, 2) or [max(hits, key=_score).strip()[:240]]
        themes.append({"theme": label, "section": section, "points": points, "mentions": len(hits)})
    themes.sort(key=lambda t: -t["mentions"])
    cnt = Counter(t for t in _TICKER.findall(text) if t not in _STOP)
    tickers = [t for t, c in cnt.most_common() if c >= 2][:18]
    tldr = " ".join(_top(sentences, 2)) if sentences else ""
    return {"themes": themes, "tickers": tickers, "tldr": tldr[:320]}


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
        "word_count": len(text.split()), "dv": DIGEST_VERSION, **_digest(text),
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
            cached = prev_by_id.get(v["video_id"])
            if cached and cached.get("dv") == DIGEST_VERSION:
                videos.append(cached)
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
