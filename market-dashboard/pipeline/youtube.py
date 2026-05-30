"""Discover Mark Meldrum's weekly market-update videos via public, key-free
sources: the channel RSS feed (recent uploads) and the oEmbed endpoint
(per-video metadata). No YouTube Data API key required.
"""

from __future__ import annotations

import json
import urllib.request
import urllib.parse
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Optional
from xml.etree import ElementTree as ET

import config

_ATOM = "{http://www.w3.org/2005/Atom}"
_YT = "{http://www.youtube.com/xml/schemas/2015}"
_MEDIA = "{http://search.yahoo.com/mrss/}"

_UA = {"User-Agent": "Mozilla/5.0 (market-dashboard pipeline)"}


@dataclass
class Video:
    video_id: str
    title: str
    published_at: str          # ISO 8601
    url: str
    thumbnail: str
    is_market_update: bool

    def to_dict(self) -> dict:
        return asdict(self)


def _get(url: str, timeout: int = 30) -> bytes:
    req = urllib.request.Request(url, headers=_UA)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def classify_title(title: str) -> bool:
    """Heuristic: is this a weekly macro market update? Include-unless-excluded
    to favour recall (his weekly videos have unpredictable titles)."""
    t = title.lower()
    return not any(k in t for k in config.EXCLUDE_KEYWORDS)


def fetch_recent_videos(limit: int = 30) -> list[Video]:
    """Return recent uploads (newest first) parsed from the channel RSS feed."""
    raw = _get(config.RSS_URL)
    root = ET.fromstring(raw)
    videos: list[Video] = []
    for entry in root.findall(f"{_ATOM}entry"):
        vid = entry.findtext(f"{_YT}videoId") or ""
        title = (entry.findtext(f"{_ATOM}title") or "").strip()
        published = entry.findtext(f"{_ATOM}published") or ""
        if not vid:
            continue
        group = entry.find(f"{_MEDIA}group")
        thumb = ""
        if group is not None:
            thumb_el = group.find(f"{_MEDIA}thumbnail")
            if thumb_el is not None:
                thumb = thumb_el.get("url", "")
        videos.append(
            Video(
                video_id=vid,
                title=title,
                published_at=published,
                url=f"https://www.youtube.com/watch?v={vid}",
                thumbnail=thumb or f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
                is_market_update=classify_title(title),
            )
        )
        if len(videos) >= limit:
            break
    return videos


def fetch_market_updates(limit: int = 30) -> list[Video]:
    return [v for v in fetch_recent_videos(limit) if v.is_market_update]


def fetch_metadata(video_id: str) -> Optional[Video]:
    """Look up a single video by ID via oEmbed (works even if it has aged out
    of the RSS feed). Returns None if the video can't be resolved."""
    url = "https://www.youtube.com/oembed?" + urllib.parse.urlencode(
        {"url": f"https://www.youtube.com/watch?v={video_id}", "format": "json"}
    )
    try:
        data = json.loads(_get(url))
    except Exception:
        return None
    title = data.get("title", "").strip()
    return Video(
        video_id=video_id,
        title=title,
        published_at=datetime.now(timezone.utc).isoformat(),
        url=f"https://www.youtube.com/watch?v={video_id}",
        thumbnail=data.get("thumbnail_url", f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"),
        is_market_update=classify_title(title),
    )


if __name__ == "__main__":
    for v in fetch_recent_videos(15):
        flag = "MKT" if v.is_market_update else "   "
        print(f"[{flag}] {v.published_at[:10]} {v.video_id}  {v.title}")
