"""Configuration for the market dashboard.

A macro market read built from raw data and a transparent rule engine (no LLM).

Sources:
- FRED (Federal Reserve Economic Data) — macro series. CSV endpoint is keyless
  locally; cloud/CI uses the free FRED API (FRED_API_KEY).
- FINRA margin statistics — scraped, no key.
- Financial Modeling Prep (FMP) — sector performance, earnings, valuation.
  Needs a free key (FMP_API_KEY) to populate the sector/earnings/valuation
  signals; without it those signals report "awaiting data".
"""

import os
from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = PIPELINE_DIR.parent
DATA_DIR = Path(os.environ.get("DATA_DIR", PROJECT_DIR / "data"))
SNAPSHOT_PATH = DATA_DIR / "snapshot.json"   # latest full read (dashboard reads this)
HISTORY_PATH = DATA_DIR / "history.json"     # overall score over time

FRED_CSV = "https://fred.stlouisfed.org/graph/fredgraph.csv?id={id}"
# Free key from https://fredaccount.stlouisfed.org/apikeys — required for cloud/CI
# runs (FRED throttles the keyless CSV endpoint from datacenter IPs).
# .strip() guards against a stray newline/space pasted into the secret.
FRED_API_KEY = (os.environ.get("FRED_API_KEY") or "").strip() or None

# --- FINRA margin statistics (no key) --------------------------------------
FINRA_MARGIN_URL = "https://www.finra.org/investors/learn-to-invest/advanced-investing/margin-statistics"

# --- Financial Modeling Prep (free key) ------------------------------------
# Get one at https://site.financialmodelingprep.com/developer/docs (Free plan).
# Unlocks the leading-sectors, sector/tech earnings, and tech valuation signals.
FMP_API_KEY = (os.environ.get("FMP_API_KEY") or "").strip() or None
FMP_BASE = "https://financialmodelingprep.com/stable"
# Semiconductor / big-tech basket for the valuation + earnings-plateau signals.
SEMIS_BASKET = ["NVDA", "AVGO", "AMD", "TSM", "MU", "QCOM"]
# One bellwether per FMP sector name, for "leaders' earnings growth".
SECTOR_BELLWETHERS = {
    "Technology": "MSFT",
    "Communication Services": "GOOGL",
    "Financial Services": "JPM",
    "Energy": "XOM",
    "Healthcare": "UNH",
    "Consumer Cyclical": "AMZN",
    "Industrials": "CAT",
    "Consumer Defensive": "PG",
    "Utilities": "NEE",
    "Basic Materials": "LIN",
    "Real Estate": "PLD",
}
# A semis basket trailing P/E above this reads as "crazy" valuation.
VALUATION_PE_EXTREME = float(os.environ.get("VALUATION_PE_EXTREME", "45"))
# Median semis YoY revenue growth below this reads as an earnings "plateau".
PLATEAU_REV_GROWTH = float(os.environ.get("PLATEAU_REV_GROWTH", "5"))

# --- Transcript digests ("Their Views") ------------------------------------
# Supadata fetches YouTube captions server-side (works from cloud/CI, unlike
# direct scraping). Free key from https://supadata.ai
SUPADATA_API_KEY = (os.environ.get("SUPADATA_API_KEY") or "").strip() or None
CHANNELS = [
    {"name": "Mark Meldrum", "channel_id": "UCAHr-sT0AjrD3sBwr1eRUNg", "trim_spotlight": True},
    {"name": "Defiant Gatekeeper", "channel_id": "UC_x-4nLmrEVrInhQ09x70RA", "trim_spotlight": False},
]
# Videos that are NOT the weekly macro update (skip when finding the latest one).
EXCLUDE_KEYWORDS = [
    "q&a", "q & a", "non-market", "pre-market", "premarket", "mid-day", "midday",
    "cfa", "level 1", "level 2", "level 3", "level i ", "level ii", "level iii",
    "ask me anything", "webinar", "announcement", "members only",
]
# Cut the transcript at the closing company "spotlight" deep-dive (Meldrum).
SPOTLIGHT_MARKERS = [
    "spotlight company", "spotlight stock", "company spotlight", "this week's spotlight",
    "our spotlight", "the spotlight", "deep dive into", "individual company",
]
SPOTLIGHT_MIN_FRACTION = 0.4

# Network resilience (FRED is reliable from normal IPs; tune for slow links).
HTTP_TIMEOUT = int(os.environ.get("HTTP_TIMEOUT", "25"))
HTTP_RETRIES = int(os.environ.get("HTTP_RETRIES", "3"))
# Series are fetched concurrently; total time ≈ the slowest single feed.
# Kept moderate so a burst doesn't trip FRED's rate limiter (a sequential
# straggler-retry pass in build.py recovers any that still drop).
FETCH_WORKERS = int(os.environ.get("FETCH_WORKERS", "5"))

SERVER_HOST = os.environ.get("SERVER_HOST", "127.0.0.1")
SERVER_PORT = int(os.environ.get("SERVER_PORT", "8000"))

# --- Section + series catalog ----------------------------------------------
# kind drives how a series is read & interpreted:
#   rate       value is a % yield/rate                 (level shown as %)
#   spread     value is a % spread                     (level shown as %)
#   index_yoy  index level; headline = year-over-year % change
#   price      price level (equities, commodities, FX)
#   level      raw level (VIX, sales counts, claims)
#   level_chg  raw level; headline = change vs prior observation
#
# better: which direction is "good" for risk assets — used to colour deltas
#   "up" higher is risk-on, "down" lower is risk-on, "none" neutral.

SECTIONS = [
    ("rates", "Rates & the Fed"),
    ("inflation", "Inflation"),
    ("credit", "Credit Spreads"),
    ("equities", "Equities & Volatility"),
    ("housing", "Housing"),
    ("labor", "Labor & Growth"),
    ("growth", "Growth & GDP Quality"),
    ("commodities", "Commodities & Dollar"),
]

SERIES = [
    # key,            fred_id,              label,                 section,       kind,        unit,   better
    ("fed_funds",     "DFF",                "Fed Funds Rate",      "rates",       "rate",      "%",    "none"),
    ("ust_2y",        "DGS2",               "2Y Treasury",         "rates",       "rate",      "%",    "none"),
    ("ust_10y",       "DGS10",              "10Y Treasury",        "rates",       "rate",      "%",    "none"),
    ("ust_30y",       "DGS30",              "30Y Treasury",        "rates",       "rate",      "%",    "none"),
    ("curve_2s10s",   "T10Y2Y",             "2s10s Curve",         "rates",       "spread",    "%",    "up"),
    ("real_10y",      "DFII10",             "10Y Real (TIPS)",     "rates",       "rate",      "%",    "down"),

    ("cpi",           "CPIAUCSL",           "CPI",                 "inflation",   "index_yoy", "% y/y","down"),
    ("core_cpi",      "CPILFESL",           "Core CPI",            "inflation",   "index_yoy", "% y/y","down"),
    ("pce",           "PCEPI",              "PCE",                 "inflation",   "index_yoy", "% y/y","down"),
    ("core_pce",      "PCEPILFE",           "Core PCE",            "inflation",   "index_yoy", "% y/y","down"),
    ("ppi",           "PPIFIS",             "PPI (Final Demand)",  "inflation",   "index_yoy", "% y/y","down"),
    ("breakeven_10y", "T10YIE",             "10Y Breakeven",       "inflation",   "rate",      "%",    "down"),

    ("ig_oas",        "BAMLC0A0CM",         "IG OAS",              "credit",      "spread",    "%",    "down"),
    ("hy_oas",        "BAMLH0A0HYM2",       "HY OAS",              "credit",      "spread",    "%",    "down"),

    ("sp500",         "SP500",              "S&P 500",             "equities",    "price",     "",     "up"),
    ("nasdaq",        "NASDAQCOM",          "Nasdaq Composite",    "equities",    "price",     "",     "up"),
    ("vix",           "VIXCLS",             "VIX",                 "equities",    "level",     "",     "down"),

    ("new_home_sales","HSN1F",              "New Home Sales",      "housing",     "level",     "k",    "up"),
    ("housing_starts","HOUST",              "Housing Starts",      "housing",     "level",     "k",    "up"),
    ("mortgage_30y",  "MORTGAGE30US",       "30Y Mortgage Rate",   "housing",     "rate",      "%",    "down"),
    ("case_shiller",  "CSUSHPINSA",         "Case-Shiller HPI",    "housing",     "index_yoy", "% y/y","up"),

    ("unemployment",  "UNRATE",             "Unemployment Rate",   "labor",       "rate",      "%",    "down"),
    ("payrolls",      "PAYEMS",             "Nonfarm Payrolls",    "labor",       "level_chg", "k",    "up"),
    ("claims",        "ICSA",               "Initial Jobless Claims","labor",     "level",     "",     "down"),

    ("real_gdp",      "A191RL1Q225SBEA",    "Real GDP growth",     "growth",      "rate",      "%",    "up"),
    ("final_sales",   "A653RL1Q225SBEA",    "Real Final Sales (priv. dom.)", "growth", "rate",  "%",    "up"),

    ("wti",           "DCOILWTICO",         "WTI Crude",           "commodities", "price",     "$",    "none"),
    ("brent",         "DCOILBRENTEU",       "Brent Crude",         "commodities", "price",     "$",    "none"),
    # Gold: FRED discontinued its London-fix series, so it's sourced from FMP
    # (GCUSD) in build.py instead of here.
    ("dollar",        "DTWEXBGS",           "Broad Dollar Index",  "commodities", "price",     "",     "none"),
]

# Tenors (FRED ids) used to draw the Treasury yield curve.
CURVE = [
    ("1M", "DGS1MO"), ("3M", "DGS3MO"), ("6M", "DGS6MO"), ("1Y", "DGS1"),
    ("2Y", "DGS2"), ("3Y", "DGS3"), ("5Y", "DGS5"), ("7Y", "DGS7"),
    ("10Y", "DGS10"), ("20Y", "DGS20"), ("30Y", "DGS30"),
]


def ensure_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
