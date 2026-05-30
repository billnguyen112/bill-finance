# Market Monitor

A self-updating macro dashboard that scrapes market & economic data and turns it
into a transparent, **rule-based** read — no LLM, no subjective inputs. Two tabs:

- **Dashboard** — rates, inflation, credit spreads, equities/volatility, housing,
  labor, commodities & the dollar, plus the Treasury yield curve and an overall
  risk-on/risk-off score.
- **Signals** — a data-driven **buy/sell model** (5 buy, 3 sell conditions), each
  computed from a live data source with a Triggered / Not-yet / Awaiting-data state.

Everything on screen is computed; thresholds live in plain Python (`config.py`,
`analyze.py`, `signals.py`) and are fully tunable.

## Data sources & keys

| Source | Used for | Key? |
|---|---|---|
| **FRED** (St. Louis Fed) | All macro series (rates, inflation, credit, equities, housing, labor, commodities) | Free key for cloud/CI — [get one](https://fredaccount.stlouisfed.org/apikeys). Keyless locally. |
| **FINRA** margin statistics | Margin-debt buy signal | None (scraped) |
| **Financial Modeling Prep** (FMP) | Sector performance, sector/tech earnings, tech valuation (3 signals) | Free key — [get one](https://site.financialmodelingprep.com/developer/docs) |
| multpl.com | Shiller CAPE (valuation fallback) | None (scraped) |

Without the FMP key the dashboard still runs; the three sector/earnings signals
just report **“awaiting data”** until you add it.

## Run it with zero local tools (GitHub Pages)

The included workflow scrapes, builds, and publishes everything in GitHub's cloud:

1. **Add repo secrets** (Settings → Secrets and variables → Actions):
   - `FRED_API_KEY` — required for reliable cloud fetches.
   - `FMP_API_KEY` — to populate the sector/earnings/valuation signals.
2. **Enable Pages:** Settings → Pages → Source → **GitHub Actions**.
3. **Run it:** Actions → *Market Dashboard* → **Run workflow** (also runs weekly).
   When green, open `https://<user>.github.io/<repo>/`.

Refresh anytime from the Actions tab; it also auto-refreshes every Monday.

## Run locally

```bash
cd market-dashboard
python -m venv .venv && source .venv/bin/activate
pip install -r pipeline/requirements.txt
cp .env.example .env        # optional: add FRED_API_KEY / FMP_API_KEY

cd pipeline
python run.py refresh        # scrape + compute -> data/snapshot.json
python server.py             # dashboard at http://127.0.0.1:8000
```

Frontend dev with hot reload: `cd frontend && npm install && npm run dev`
(proxies the API to the Flask backend on :8000).

## The buy/sell signal model

**Buy:** ① VIX > 30 ② Fed funds not rising ③ FINRA margin debt falling
④ clear leading sectors ⑤ leading sectors' earnings growth
**Sell:** ① semiconductor earnings plateau ② Fed official easing pivot
③ extreme tech/semi valuation

①–③ buy and ② sell come from FRED + FINRA (no extra key). ④⑤ buy and ①③ sell
use FMP. Thresholds (e.g. `VALUATION_PE_EXTREME`, `PLATEAU_REV_GROWTH`, the semis
basket, sector bellwethers) are in `config.py`.

## Layout

```
market-dashboard/
├── pipeline/
│   ├── config.py       # series catalog, signal thresholds, keys, baskets
│   ├── sources.py      # FRED (API/CSV), FINRA, FMP, CAPE scrapers
│   ├── indicators.py   # latest / changes / YoY / sparkline / stats
│   ├── analyze.py      # macro rule engine (dashboard signals + overall read)
│   ├── signals.py      # buy/sell signal model (Signals tab)
│   ├── explanations.py # plain-English notes per variable/section
│   ├── build.py        # orchestrate -> data/snapshot.json + history.json
│   ├── run.py          # CLI: refresh / serve
│   └── server.py       # Flask API + serves the built frontend
├── frontend/           # React + Vite dashboard (dark / light)
└── data/               # generated snapshot/history (gitignored)
```

*Informational only — not financial advice.*
