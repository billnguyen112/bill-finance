"""Central configuration for the Mark Meldrum market-update pipeline.

Everything here is overridable via environment variables so the same code runs
locally, in CI, or behind the dashboard's refresh button without edits.
"""

import os
from pathlib import Path

# --- Paths -----------------------------------------------------------------
PIPELINE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = PIPELINE_DIR.parent
DATA_DIR = Path(os.environ.get("DATA_DIR", PROJECT_DIR / "data"))
RAW_DIR = DATA_DIR / "raw"            # transcripts + metadata, one json per video
ANALYSES_DIR = DATA_DIR / "analyses"  # AI breakdown, one json per video
INDEX_PATH = DATA_DIR / "index.json"  # aggregated list the dashboard reads first
TRENDS_PATH = DATA_DIR / "trends.json"

# --- Source channel --------------------------------------------------------
# Mark Meldrum, Ph.D — https://www.youtube.com/@MarkMeldrum
CHANNEL_ID = os.environ.get("CHANNEL_ID", "UCAHr-sT0AjrD3sBwr1eRUNg")
CHANNEL_NAME = "Mark Meldrum"
RSS_URL = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}"

# --- Market-update classification ------------------------------------------
# His uploads are mostly weekly macro commentary, with a handful of clearly
# labelled exceptions (CFA-exam content, Q&A, short Pre-Market / Mid-Day clips).
# Title-based detection is inherently fuzzy because the weekly videos have
# creative titles, so we maximise recall: treat a video as a weekly market
# update UNLESS its title matches an exclusion pattern. Anything misclassified
# can be analysed explicitly with `run.py refresh --video <id>`.
EXCLUDE_KEYWORDS = [
    # CFA-exam course content
    "cfa", "level 1", "level 2", "level 3", "level i ", "level ii", "level iii",
    "reading", "ethics", "mock", "curriculum", "study session", "exam prep",
    # not the main weekly macro video
    "q&a", "q & a", "non-market", "pre-market", "premarket", "mid-day", "midday",
    "ask me anything", "ama ", "announcement", "webinar",
]

# --- Spotlight (company deep-dive) trimming --------------------------------
# The user only wants the macro commentary, not the per-company deep dive that
# closes each video. We cut the transcript at the first spotlight marker that
# appears after SPOTLIGHT_MIN_FRACTION of the way through (avoids false hits
# from an intro mention). Best-effort heuristic; the AI prompt also re-enforces
# this so a missed cut still won't pollute the analysis.
SPOTLIGHT_MARKERS = [
    "spotlight company", "spotlight stock", "company spotlight",
    "this week's spotlight", "our spotlight", "let's get into the spotlight",
    "move on to the spotlight", "the spotlight", "deep dive into",
    "individual company", "let's talk about the company",
]
SPOTLIGHT_MIN_FRACTION = float(os.environ.get("SPOTLIGHT_MIN_FRACTION", "0.4"))

# --- AI provider -----------------------------------------------------------
AI_PROVIDER = os.environ.get("AI_PROVIDER", "anthropic")  # "anthropic" | "stub"
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-opus-4-8")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

# --- Optional proxy for transcript scraping --------------------------------
# YouTube blocks transcript requests from datacenter/cloud IPs. Running the
# pipeline from a residential IP works out of the box; in the cloud, set
# Webshare rotating-residential credentials (recommended by the library) or a
# generic HTTP/HTTPS proxy.
WEBSHARE_PROXY_USERNAME = os.environ.get("WEBSHARE_PROXY_USERNAME")
WEBSHARE_PROXY_PASSWORD = os.environ.get("WEBSHARE_PROXY_PASSWORD")
HTTP_PROXY = os.environ.get("YT_HTTP_PROXY")
HTTPS_PROXY = os.environ.get("YT_HTTPS_PROXY")

# --- Server ----------------------------------------------------------------
SERVER_HOST = os.environ.get("SERVER_HOST", "127.0.0.1")
SERVER_PORT = int(os.environ.get("SERVER_PORT", "8000"))


def ensure_dirs() -> None:
    for d in (DATA_DIR, RAW_DIR, ANALYSES_DIR):
        d.mkdir(parents=True, exist_ok=True)
