"""Configuration for the market dashboard.

The dashboard independently reproduces the kind of weekly macro read Mark
Meldrum does — but from raw data, scraped without API keys, and interpreted by
a transparent rule engine (no LLM).

Primary source: FRED (Federal Reserve Economic Data) — its CSV download
endpoint `fredgraph.csv?id=<series>` is public and needs no key.
"""

import os
from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = PIPELINE_DIR.parent
DATA_DIR = Path(os.environ.get("DATA_DIR", PROJECT_DIR / "data"))
SNAPSHOT_PATH = DATA_DIR / "snapshot.json"   # latest full read (dashboard reads this)
HISTORY_PATH = DATA_DIR / "history.json"     # overall score over time

FRED_CSV = "https://fred.stlouisfed.org/graph/fredgraph.csv?id={id}"

# Network resilience (FRED is reliable from normal IPs; tune for slow links).
HTTP_TIMEOUT = int(os.environ.get("HTTP_TIMEOUT", "30"))
HTTP_RETRIES = int(os.environ.get("HTTP_RETRIES", "4"))

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

    ("wti",           "DCOILWTICO",         "WTI Crude",           "commodities", "price",     "$",    "none"),
    ("brent",         "DCOILBRENTEU",       "Brent Crude",         "commodities", "price",     "$",    "none"),
    ("gold",          "GOLDPMGBD228NLBM",   "Gold (London PM)",    "commodities", "price",     "$",    "none"),
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
