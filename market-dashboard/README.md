# Market Monitor

A dashboard that produces a weekly macro market read **independently** — the
kind of walk-through Mark Meldrum does in his videos, but built from raw data
the app scrapes itself, interpreted by a transparent rule engine.

**No API keys. No LLM.** All data comes from public, key-free sources, and the
"analysis" is explicit, auditable thresholds you can read and tune.

It covers the same ground he does each week:

> Rates & the Fed · Inflation (CPI/PCE/PPI) · Credit spreads (IG & HY OAS) ·
> Equities & volatility (S&P, Nasdaq, VIX, CAPE) · Housing · Labor & growth ·
> Commodities & the dollar — plus the Treasury yield curve and an overall
> risk-on/risk-off read.

## How it works

```
FRED  fredgraph.csv?id=…  (no key) ─┐
multpl.com  (Shiller CAPE)         ─┤→ sources.py   scrape series
                                    │  indicators.py compute latest, 1w/1m/1y
                                    │                changes, YoY, sparkline, stats
                                    │  analyze.py    rule engine → per-series signals,
                                    │                section summaries, overall read
                                    │  build.py      → data/snapshot.json + history.json
                                    │
            server.py (Flask) ──────┤  /api/snapshot  /api/history  /api/refresh
                                    │
React + Vite dashboard ─────────────┘  risk gauge · yield curve · metric tiles
                                       with sparklines · computed commentary
```

The overall read is a weighted blend of regime signals — yield-curve inversion,
HY credit spreads, VIX, the 10Y real yield, equity momentum vs the 1-year high,
core inflation vs target, and the labor trend — scored from -1 (risk-off) to
+1 (risk-on). Every number on screen carries a one-line, rule-derived note.

## Quick start

### 1. Pull the data (Python)

```bash
cd market-dashboard
python -m venv .venv && source .venv/bin/activate
pip install -r pipeline/requirements.txt

cd pipeline
python run.py refresh        # scrape all series, compute, write data/snapshot.json
```

`refresh` prints a per-series status and the overall read. No keys needed.

### 2. Run the dashboard

Build the frontend once, then let Flask serve everything from one port:

```bash
cd frontend && npm install && npm run build
cd ../pipeline && python server.py        # open http://127.0.0.1:8000
```

The **↻ Refresh data** button re-scrapes and recomputes on demand.

For frontend development with hot reload (proxies the API to Flask on :8000):

```bash
cd pipeline && python server.py           # terminal 1
cd frontend && npm run dev                # terminal 2 -> http://localhost:5174
```

## What you can tune

Everything lives in plain Python, no magic:

- **`pipeline/config.py`** — the `SERIES` catalog (add/remove any FRED series),
  the section layout, and the yield-curve tenors.
- **`pipeline/analyze.py`** — the `signal_for()` rules (thresholds for "hot"
  inflation, "stress" credit spreads, VIX regimes, etc.) and the
  `_REGIME_WEIGHTS` that drive the overall score.

Want another indicator he watches? Find its FRED series id (e.g. `T10Y3M`,
`UMCSENT`, `RSAFS`) and add a row to `SERIES`.

## Data sources

- **FRED** (Federal Reserve Bank of St. Louis) — full history for any series.
  - **Locally:** uses the public `fredgraph.csv` endpoint, no key needed.
  - **Cloud/CI:** FRED throttles that endpoint from datacenter IPs, so set a
    free **FRED API key** (`FRED_API_KEY`) and the pipeline uses the official
    API instead — fast and reliable. Get one in ~2 min:
    https://fredaccount.stlouisfed.org/apikeys
- **multpl.com** — current Shiller CAPE (best-effort scrape).

## Deploying to GitHub Pages (no local tools)

The included workflow (`.github/workflows/market-dashboard.yml`) scrapes,
builds, and publishes the dashboard entirely in GitHub's cloud — operate it
from the browser:

1. **Get a free FRED key:** https://fredaccount.stlouisfed.org/apikeys
2. **Add it as a repo secret:** Settings → Secrets and variables → Actions →
   New repository secret → name `FRED_API_KEY`, paste the key.
3. **Enable Pages:** Settings → Pages → Source → **GitHub Actions**.
4. **Run it:** Actions tab → *Market Dashboard* → **Run workflow** (also runs
   weekly). When green, open `https://<user>.github.io/<repo>/`.

## Layout

```
market-dashboard/
├── pipeline/
│   ├── config.py       # series catalog, sections, curve tenors, settings
│   ├── sources.py      # FRED CSV + CAPE scrapers (retries, no keys)
│   ├── indicators.py   # latest / changes / YoY / sparkline / 1y-5y stats
│   ├── analyze.py      # rule engine: per-series signals + overall read
│   ├── build.py        # orchestrate -> snapshot.json + history.json
│   ├── run.py          # CLI: refresh / serve
│   └── server.py       # Flask API + serves the built frontend
├── frontend/           # React + Vite dashboard
└── data/               # generated snapshot/history (gitignored)
```

## Scheduling (optional)

`python run.py refresh` is a plain command, so a weekly cron or GitHub Action
that runs it and commits `data/` makes the dashboard update itself. Set up as
manual-trigger (button + CLI) for now.

---

*Signals are rule-based and for informational use only — not financial advice.
Independent project, not affiliated with Mark Meldrum.*
