"""Scrape a video transcript (no API key) and trim off the closing company
spotlight / deep-dive so only the macro market commentary is analysed.
"""

from __future__ import annotations

from dataclasses import dataclass

import config


class TranscriptError(RuntimeError):
    pass


@dataclass
class Transcript:
    text: str            # full transcript (after spotlight trim)
    full_text: str       # untrimmed, kept for reference
    trimmed_at: float | None  # fraction (0-1) where spotlight was cut, else None
    word_count: int


def _build_api():
    """Construct a YouTubeTranscriptApi, wiring in a proxy if configured.

    YouTube blocks transcript requests from datacenter IPs, so cloud runs need
    a residential proxy. Locally, no proxy is needed.
    """
    from youtube_transcript_api import YouTubeTranscriptApi

    proxy_config = None
    if config.WEBSHARE_PROXY_USERNAME and config.WEBSHARE_PROXY_PASSWORD:
        from youtube_transcript_api.proxies import WebshareProxyConfig

        proxy_config = WebshareProxyConfig(
            proxy_username=config.WEBSHARE_PROXY_USERNAME,
            proxy_password=config.WEBSHARE_PROXY_PASSWORD,
        )
    elif config.HTTP_PROXY or config.HTTPS_PROXY:
        from youtube_transcript_api.proxies import GenericProxyConfig

        proxy_config = GenericProxyConfig(
            http_url=config.HTTP_PROXY,
            https_url=config.HTTPS_PROXY or config.HTTP_PROXY,
        )

    if proxy_config is not None:
        return YouTubeTranscriptApi(proxy_config=proxy_config)
    return YouTubeTranscriptApi()


def _trim_spotlight(text: str) -> tuple[str, float | None]:
    """Cut the transcript at the first spotlight marker occurring after
    SPOTLIGHT_MIN_FRACTION of the text. Returns (trimmed_text, cut_fraction)."""
    lowered = text.lower()
    n = len(lowered)
    min_pos = int(n * config.SPOTLIGHT_MIN_FRACTION)
    best = None
    for marker in config.SPOTLIGHT_MARKERS:
        idx = lowered.find(marker, min_pos)
        if idx != -1 and (best is None or idx < best):
            best = idx
    if best is None:
        return text, None
    return text[:best].rstrip(), best / n if n else None


def fetch_transcript(video_id: str, languages: list[str] | None = None) -> Transcript:
    languages = languages or ["en", "en-US", "en-GB"]
    try:
        api = _build_api()
        fetched = api.fetch(video_id, languages=languages)
    except Exception as exc:  # IpBlocked, NoTranscriptFound, etc.
        raise TranscriptError(
            f"Could not fetch transcript for {video_id}: {type(exc).__name__}: {exc}"
        ) from exc

    snippets = fetched.snippets if hasattr(fetched, "snippets") else fetched
    full_text = " ".join(s.text.strip() for s in snippets if s.text.strip())
    full_text = " ".join(full_text.split())  # normalise whitespace

    trimmed, frac = _trim_spotlight(full_text)
    return Transcript(
        text=trimmed,
        full_text=full_text,
        trimmed_at=frac,
        word_count=len(trimmed.split()),
    )


if __name__ == "__main__":
    import sys

    vid = sys.argv[1] if len(sys.argv) > 1 else "6e-FuZncUKw"
    t = fetch_transcript(vid)
    print(f"words={t.word_count} trimmed_at={t.trimmed_at}")
    print(t.text[:500])
