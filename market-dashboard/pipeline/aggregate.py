"""Roll per-video analyses up into index.json (list view) and trends.json
(cross-week sentiment / theme / ticker aggregation) that the dashboard reads.
"""

from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timezone

import config


def _load_all_analyses() -> list[dict]:
    items = []
    for path in config.ANALYSES_DIR.glob("*.json"):
        try:
            items.append(json.loads(path.read_text()))
        except (json.JSONDecodeError, OSError):
            continue
    # newest first
    items.sort(key=lambda a: a.get("published_at", ""), reverse=True)
    return items


def rebuild() -> dict:
    """Regenerate index.json and trends.json from the analyses on disk."""
    config.ensure_dirs()
    analyses = _load_all_analyses()
    now = datetime.now(timezone.utc).isoformat()

    index = {
        "channel": {"id": config.CHANNEL_ID, "name": config.CHANNEL_NAME},
        "updated_at": now,
        "count": len(analyses),
        "videos": [
            {
                "video_id": a.get("video_id"),
                "title": a.get("title"),
                "published_at": a.get("published_at"),
                "url": a.get("url"),
                "thumbnail": a.get("thumbnail"),
                "analyzed_at": a.get("analyzed_at"),
                "provider": a.get("analysis", {}).get("_provider"),
                "tldr": a.get("analysis", {}).get("tldr"),
                "overall_sentiment": a.get("analysis", {}).get("overall_sentiment"),
            }
            for a in analyses
        ],
    }
    config.INDEX_PATH.write_text(json.dumps(index, indent=2))

    # Trends
    sentiment_series = []
    theme_counter: Counter[str] = Counter()
    ticker_counter: Counter[str] = Counter()
    for a in reversed(analyses):  # chronological for the time series
        an = a.get("analysis", {})
        sent = an.get("overall_sentiment") or {}
        sentiment_series.append(
            {
                "video_id": a.get("video_id"),
                "title": a.get("title"),
                "date": (a.get("published_at") or "")[:10],
                "score": sent.get("score", 0),
                "label": sent.get("label", "neutral"),
            }
        )
        for sec in an.get("sections", []):
            if sec.get("topic"):
                theme_counter[sec["topic"]] += 1
        for tk in an.get("tickers_mentioned", []):
            ticker_counter[tk.upper()] += 1

    trends = {
        "updated_at": now,
        "sentiment_over_time": sentiment_series,
        "recurring_themes": [
            {"theme": t, "count": c} for t, c in theme_counter.most_common(20)
        ],
        "ticker_frequency": [
            {"ticker": t, "count": c} for t, c in ticker_counter.most_common(25)
        ],
    }
    config.TRENDS_PATH.write_text(json.dumps(trends, indent=2))

    return {"videos": len(analyses)}


if __name__ == "__main__":
    print(rebuild())
