# Meldrum Market Monitor

A dashboard that automatically pulls **Mark Meldrum's weekly market-update
videos**, scrapes their transcripts, uses AI to break down and structure the
**macro commentary** (deliberately ignoring the closing company spotlight /
deep-dive), aggregates it week over week, and presents it in a dashboard.

> Independent project — not affiliated with Mark Meldrum. It only processes
> public captions and metadata.

## How it works

```
                    ┌─────────────────────────── pipeline/ (Python) ───────────────────────────┐
RSS feed (no key) → youtube.py ─ find weekly "market update" uploads
oEmbed   (no key) → youtube.py ─ per-video metadata
                    transcript.py ─ scrape captions (no key) → trim off the spotlight deep-dive
                    providers/   ─ Claude API breaks it into structured JSON (cached prompt)
                    aggregate.py ─ roll up → data/index.json + data/trends.json
                    └──────────────────────────────────────────────────────────────────────────┘
                                            │  served by
                    server.py (Flask) ──────┤  /api/index /api/trends /api/video/:id /api/refresh
                                            │
frontend/ (React + Vite) ───────────────────┘  list of weeks · AI breakdown · sentiment-over-time
```

**Token-efficient by design:** the transcript is fetched by Python scraping
(not by an AI agent), and only the trimmed macro text is sent to Claude. The
stable analysis prompt carries a prompt-cache breakpoint, so analysing several
weeks in one run reuses the cached prefix.

## Quick start

### 1. Pipeline (Python)

```bash
cd market-dashboard
python -m venv .venv && source .venv/bin/activate
pip install -r pipeline/requirements.txt

cp .env.example .env        # add your ANTHROPIC_API_KEY
```

Pull and analyse the latest weekly update:

```bash
cd pipeline
python run.py refresh                 # newest unprocessed weekly update
python run.py refresh --limit 4       # backfill up to 4 recent weeks
python run.py refresh --video 6e-FuZncUKw   # a specific video (id or URL)
python run.py list                    # see recent uploads + classification (✓ = analysed)
```

No API key handy? Run with the no-cost fallback to exercise everything:

```bash
AI_PROVIDER=stub python run.py refresh
```

### 2. Dashboard

Start the backend (serves data + the refresh button):

```bash
cd pipeline && python server.py        # http://127.0.0.1:8000
```

Dev frontend with hot reload (proxies the API to Flask):

```bash
cd frontend && npm install && npm run dev   # http://localhost:5174
```

For a single-process deployment, build the frontend and let Flask serve it:

```bash
cd frontend && npm run build
cd ../pipeline && python server.py     # open http://127.0.0.1:8000
```

The **↻ Pull latest** button runs the scrape+analyse pipeline on demand; the
text box analyses any specific video id/URL.

## ⚠️ Transcript scraping & cloud IPs

`youtube-transcript-api` works without an API key, but **YouTube blocks
transcript requests from datacenter/cloud IPs** (AWS, GCP, Azure, CI runners).

- **On your own machine / a residential IP:** works out of the box.
- **In the cloud:** set a residential proxy in `.env` — Webshare
  (`WEBSHARE_PROXY_USERNAME` / `_PASSWORD`) or a generic proxy
  (`YT_HTTP_PROXY` / `YT_HTTPS_PROXY`). See `transcript.py`.

Everything else (video discovery, metadata, analysis, dashboard) is unaffected.

## Spotlight trimming

The user only wants the macro section, not the per-company deep dive that closes
each video. `transcript.py` cuts the transcript at the first "spotlight company"
marker occurring after `SPOTLIGHT_MIN_FRACTION` (default 0.4) of the text, and
the analysis prompt re-enforces "ignore the company deep-dive" as a backstop.
Markers and the threshold are configurable in `config.py` / `.env`.

## Video classification

His channel mixes weekly macro videos (creative titles) with Q&A, Pre-Market,
Mid-Day, and CFA-exam content. Detection is **include-unless-excluded** to favour
recall (see `EXCLUDE_KEYWORDS` in `config.py`). Anything misclassified can always
be analysed explicitly with `run.py refresh --video <id>` or the dashboard box.

## Layout

```
market-dashboard/
├── pipeline/
│   ├── config.py         # all settings (env-overridable)
│   ├── youtube.py        # RSS discovery + oEmbed metadata (no API key)
│   ├── transcript.py     # caption scraping + spotlight trimming
│   ├── providers/        # pluggable AI + schema/prompt: base.py, anthropic_provider.py, stub_provider.py
│   ├── aggregate.py      # build index.json + trends.json
│   ├── run.py            # CLI orchestrator (refresh / list / aggregate)
│   └── server.py         # Flask API + serves the built frontend
├── frontend/             # React + Vite dashboard
└── data/                 # generated transcripts + analyses (gitignored)
```

## Scheduling (optional)

The pipeline is just a CLI, so a weekly cron / GitHub Action that runs
`python run.py refresh` and commits `data/` is trivial to add later if you want
it fully automatic. (Set up as manual-trigger for now.)
