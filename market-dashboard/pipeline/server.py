"""Flask backend: serves the computed snapshot/history and a /api/refresh
endpoint for the dashboard's refresh button. Also serves the built frontend.
"""

from __future__ import annotations

import json
import threading

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

import config
import build

app = Flask(__name__, static_folder=None)
CORS(app)

_refresh_lock = threading.Lock()
_DIST = config.PROJECT_DIR / "frontend" / "dist"


def _read_json(path, default):
    try:
        return json.loads(path.read_text())
    except (OSError, json.JSONDecodeError):
        return default


@app.get("/api/health")
def health():
    return jsonify({"ok": True})


@app.get("/api/snapshot")
def snapshot():
    data = _read_json(config.SNAPSHOT_PATH, None)
    if data is None:
        return jsonify({"error": "no snapshot yet — run a refresh"}), 404
    return jsonify(data)


@app.get("/api/history")
def history():
    return jsonify(_read_json(config.HISTORY_PATH, {"points": []}))


@app.post("/api/refresh")
def refresh():
    if not _refresh_lock.acquire(blocking=False):
        return jsonify({"error": "a refresh is already running"}), 409
    try:
        snap = build.build()
        return jsonify({
            "ok_count": snap["ok_count"],
            "total_count": snap["total_count"],
            "errors": snap["errors"],
            "overall": snap["overall"],
            "generated_at": snap["generated_at"],
        })
    except Exception as exc:
        return jsonify({"error": f"{type(exc).__name__}: {exc}"}), 500
    finally:
        _refresh_lock.release()


@app.get("/")
@app.get("/<path:path>")
def static_files(path: str = ""):
    if not _DIST.exists():
        return jsonify({"error": "frontend not built; run `npm run build` in frontend/"}), 404
    target = _DIST / path
    if path and target.exists():
        return send_from_directory(_DIST, path)
    return send_from_directory(_DIST, "index.html")


def main() -> None:
    config.ensure_dirs()
    app.run(host=config.SERVER_HOST, port=config.SERVER_PORT, debug=True)


if __name__ == "__main__":
    main()
