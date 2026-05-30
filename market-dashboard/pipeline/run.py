"""Orchestrator: discover -> scrape transcript -> trim spotlight -> analyse ->
store -> aggregate. Drives both the CLI and the dashboard's refresh button.

Usage:
  python run.py refresh                 # newest unprocessed market update
  python run.py refresh --limit 3       # up to 3 newest unprocessed
  python run.py refresh --video 6e-FuZncUKw   # a specific video id/url
  python run.py refresh --force         # re-analyse even if already stored
  python run.py list                    # show recent videos + classification
  python run.py aggregate               # rebuild index/trends only
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone

import config
import youtube
import aggregate
from transcript import fetch_transcript, TranscriptError
from providers import get_provider


def _video_id(s: str) -> str:
    m = re.search(r"(?:v=|youtu\.be/|/watch\?v=|embed/)([\w-]{11})", s)
    return m.group(1) if m else s


def _already_done(video_id: str) -> bool:
    return (config.ANALYSES_DIR / f"{video_id}.json").exists()


def process_video(video: youtube.Video, provider, force: bool = False) -> dict:
    """Scrape, analyse and persist a single video. Returns a status dict."""
    config.ensure_dirs()
    if _already_done(video.video_id) and not force:
        return {"video_id": video.video_id, "status": "skipped", "reason": "already analysed"}

    transcript = fetch_transcript(video.video_id)

    raw_record = {
        **video.to_dict(),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "word_count": transcript.word_count,
        "spotlight_trimmed_at": transcript.trimmed_at,
        "transcript": transcript.text,
    }
    (config.RAW_DIR / f"{video.video_id}.json").write_text(json.dumps(raw_record, indent=2))

    analysis = provider.analyze(video.to_dict(), transcript.text)

    record = {
        "video_id": video.video_id,
        "title": video.title,
        "published_at": video.published_at,
        "url": video.url,
        "thumbnail": video.thumbnail,
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "spotlight_trimmed_at": transcript.trimmed_at,
        "word_count": transcript.word_count,
        "analysis": analysis,
    }
    (config.ANALYSES_DIR / f"{video.video_id}.json").write_text(json.dumps(record, indent=2))

    return {
        "video_id": video.video_id,
        "title": video.title,
        "status": "analysed",
        "provider": analysis.get("_provider"),
        "sentiment": analysis.get("overall_sentiment", {}).get("label"),
    }


def refresh(limit: int = 1, video_ids: list[str] | None = None,
            provider_name: str | None = None, force: bool = False) -> dict:
    provider = get_provider(provider_name)
    results = []

    if video_ids:
        targets = []
        for raw in video_ids:
            vid = _video_id(raw)
            meta = youtube.fetch_metadata(vid)
            if meta is None:
                results.append({"video_id": vid, "status": "error", "reason": "metadata not found"})
                continue
            targets.append(meta)
    else:
        updates = youtube.fetch_market_updates(limit=30)
        targets = []
        for v in updates:
            if not _already_done(v.video_id) or force:
                targets.append(v)
            if len(targets) >= limit:
                break

    for v in targets:
        try:
            results.append(process_video(v, provider, force=force))
        except TranscriptError as exc:
            results.append({"video_id": v.video_id, "status": "error", "reason": str(exc)})
        except Exception as exc:  # provider / write errors
            results.append(
                {"video_id": v.video_id, "status": "error",
                 "reason": f"{type(exc).__name__}: {exc}"}
            )

    agg = aggregate.rebuild()
    return {
        "provider": provider.name,
        "processed": results,
        "analysed": sum(1 for r in results if r.get("status") == "analysed"),
        "errors": sum(1 for r in results if r.get("status") == "error"),
        "total_videos": agg["videos"],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Mark Meldrum market-update pipeline")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_refresh = sub.add_parser("refresh", help="scrape + analyse new market updates")
    p_refresh.add_argument("--limit", type=int, default=1)
    p_refresh.add_argument("--video", action="append", help="specific video id/url (repeatable)")
    p_refresh.add_argument("--provider", choices=["anthropic", "stub"], default=None)
    p_refresh.add_argument("--force", action="store_true")

    sub.add_parser("list", help="list recent uploads and classification")
    sub.add_parser("aggregate", help="rebuild index.json / trends.json")

    args = parser.parse_args()

    if args.cmd == "list":
        for v in youtube.fetch_recent_videos(20):
            flag = "MKT" if v.is_market_update else "   "
            done = "✓" if _already_done(v.video_id) else " "
            print(f"[{flag}]{done} {v.published_at[:10]} {v.video_id}  {v.title}")
    elif args.cmd == "aggregate":
        print(json.dumps(aggregate.rebuild(), indent=2))
    elif args.cmd == "refresh":
        summary = refresh(
            limit=args.limit,
            video_ids=args.video,
            provider_name=args.provider,
            force=args.force,
        )
        print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
