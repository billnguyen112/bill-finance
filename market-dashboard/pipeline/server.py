"""Tiny Flask backend for the dashboard.

Serves the aggregated data and exposes a /api/refresh endpoint that the
dashboard's "Refresh" button calls to run the scrape+analyse pipeline on demand.
Also serves the built frontend (frontend/dist) when present.
"""

from __future__ import annotations

import json
import threading

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

import config
import run as pipeline

app = Flask(__name__, static_folder=None)
CORS(app)

# Guard against overlapping refreshes (the pipeline is not concurrency-safe).
_refresh_lock = threading.Lock()

_DIST = config.PROJECT_DIR / "frontend" / "dist"


def _read_json(path, default):
    try:
        return json.loads(path.read_text())
    except (OSError, json.JSONDecodeError):
        return default


@app.get("/api/health")
def health():
    return jsonify({"ok": True, "provider": config.AI_PROVIDER})


@app.get("/api/index")
def index():
    return jsonify(_read_json(config.INDEX_PATH, {"videos": [], "count": 0}))


@app.get("/api/trends")
def trends():
    return jsonify(_read_json(config.TRENDS_PATH, {"sentiment_over_time": []}))


@app.get("/api/video/<video_id>")
def video(video_id: str):
    path = config.ANALYSES_DIR / f"{video_id}.json"
    data = _read_json(path, None)
    if data is None:
        return jsonify({"error": "not found"}), 404
    return jsonify(data)


@app.post("/api/refresh")
def refresh():
    if not _refresh_lock.acquire(blocking=False):
        return jsonify({"error": "a refresh is already running"}), 409
    try:
        body = request.get_json(silent=True) or {}
        limit = int(body.get("limit", 1))
        video_ids = body.get("videos")  # optional list of ids/urls
        provider = body.get("provider")  # optional override
        force = bool(body.get("force", False))
        summary = pipeline.refresh(
            limit=limit, video_ids=video_ids, provider_name=provider, force=force
        )
        return jsonify(summary)
    except Exception as exc:  # surface a clean error to the UI
        return jsonify({"error": f"{type(exc).__name__}: {exc}"}), 500
    finally:
        _refresh_lock.release()


# --- Serve the built frontend (production) ---------------------------------
@app.get("/")
@app.get("/<path:path>")
def static_files(path: str = ""):
    if not _DIST.exists():
        return jsonify({"error": "frontend not built; run `npm run build` in frontend/"}), 404
    target = _DIST / path
    if path and target.exists():
        return send_from_directory(_DIST, path)
    return send_from_directory(_DIST, "index.html")


if __name__ == "__main__":
    config.ensure_dirs()
    app.run(host=config.SERVER_HOST, port=config.SERVER_PORT, debug=True)
