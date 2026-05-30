#!/usr/bin/env python3
"""Local transcript miner for Mark Meldrum's weekly market update.

Run this ON YOUR OWN MACHINE — YouTube blocks transcript pulls from cloud/CI
IPs, so it can't run in the GitHub Actions build. It finds the latest weekly
market-update video, pulls the transcript, trims off the closing company
"spotlight" deep-dive, and prints an extractive digest (no LLM, no API key):
the macro themes he hit, the data points, and the tickers he mentioned.

Usage:
    pip install youtube-transcript-api
    python transcript_digest.py                 # latest market update
    python transcript_digest.py VIDEO_ID         # a specific video
    python transcript_digest.py > this-week.md   # save the digest
"""

from __future__ import annotations

import re
import sys
import urllib.request
from xml.etree import ElementTree as ET

CHANNEL_ID = "UCAHr-sT0AjrD3sBwr1eRUNg"  # Mark Meldrum
RSS = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}"
EXCLUDE = ["q&a", "non-market", "pre-market", "premarket", "mid-day", "midday",
           "cfa", "level ", "ask me anything", "webinar", "announcement"]
SPOTLIGHT = ["spotlight company", "spotlight stock", "company spotlight",
             "this week's spotlight", "our spotlight", "the spotlight",
             "deep dive into", "individual company"]
THEMES = {
    "Inflation": ["inflation", "cpi", "ppi", "pce", "price"],
    "Fed & rates": ["fed", "fomc", "powell", "rate cut", "rate hike", "interest rate", "treasury", "yield"],
    "Credit & liquidity": ["spread", "oas", "credit", "high yield", "liquidity", "margin"],
    "Equities & valuation": ["s&p", "nasdaq", "cape", "valuation", "earnings", "multiple", "1999", "bubble"],
    "Labor & growth": ["jobs", "payroll", "unemployment", "gdp", "claims", "recession"],
    "Housing": ["housing", "home sales", "mortgage"],
    "Commodities & dollar": ["oil", "wti", "gold", "dollar", "crude", "commodity"],
    "Geopolitics": ["tariff", "trump", "xi", "china", "iran", "war", "blockade", "sanction"],
}
_TICKER = re.compile(r"\b[A-Z]{2,5}\b")
_STOP = {"CPI", "PPI", "PCE", "FOMC", "GDP", "USD", "CEO", "ETF", "AI", "US", "OK", "EPS", "FED", "WTI"}


def _get(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def latest_market_update():
    root = ET.fromstring(_get(RSS))
    ns = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}
    for e in root.findall("a:entry", ns):
        title = (e.findtext("a:title", default="", namespaces=ns) or "").strip()
        vid = e.findtext("yt:videoId", default="", namespaces=ns)
        if vid and not any(k in title.lower() for k in EXCLUDE):
            return vid, title
    return None, None


def fetch_text(video_id: str) -> str:
    from youtube_transcript_api import YouTubeTranscriptApi
    fetched = YouTubeTranscriptApi().fetch(video_id, languages=["en", "en-US", "en-GB"])
    snippets = fetched.snippets if hasattr(fetched, "snippets") else fetched
    return " ".join(s.text.strip() for s in snippets if s.text.strip())


def trim_spotlight(text: str) -> str:
    lowered = text.lower()
    n = len(lowered)
    best = None
    for m in SPOTLIGHT:
        i = lowered.find(m, int(n * 0.4))
        if i != -1 and (best is None or i < best):
            best = i
    return text[:best].rstrip() if best else text


def digest(title: str, text: str) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", text)
    out = [f"# {title}\n", f"_Macro digest · {len(text.split())} words (spotlight trimmed)_\n"]
    for theme, kws in THEMES.items():
        hits = [s.strip() for s in sentences if any(k in s.lower() for k in kws)]
        if not hits:
            continue
        out.append(f"## {theme}")
        # prefer sentences with numbers (data points), then the rest
        data = [s for s in hits if re.search(r"\d", s)]
        for s in (data[:3] or hits[:2]):
            out.append(f"- {s[:280]}")
        out.append("")
    tickers = sorted({t for t in _TICKER.findall(text) if t not in _STOP})
    if tickers:
        out.append("## Tickers mentioned")
        out.append(", ".join(tickers[:30]))
    return "\n".join(out)


def main():
    vid = sys.argv[1] if len(sys.argv) > 1 else None
    title = "Market update"
    if not vid:
        vid, title = latest_market_update()
        if not vid:
            sys.exit("Could not find a recent market update in the RSS feed.")
    try:
        text = trim_spotlight(fetch_text(vid))
    except Exception as exc:
        sys.exit(f"Transcript fetch failed ({type(exc).__name__}). "
                 f"Run this from a residential IP — YouTube blocks datacenter IPs. {exc}")
    print(digest(title, text))


if __name__ == "__main__":
    main()
