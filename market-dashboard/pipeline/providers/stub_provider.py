"""Zero-cost, no-key fallback provider.

Produces a deterministic, schema-valid analysis using simple keyword extraction.
It is NOT a real analysis — it exists so the full pipeline + dashboard can be
exercised end to end without an API key. Swap AI_PROVIDER=anthropic for the
real breakdown.
"""

from __future__ import annotations

import re

from .base import AnalysisProvider

_TOPIC_KEYWORDS = {
    "Inflation (CPI / PPI / PCE)": ["inflation", "cpi", "ppi", "pce", "price"],
    "Fed & Interest Rates": ["fed", "fomc", "powell", "rate cut", "rate hike", "federal reserve"],
    "Yields & Rates": ["yield", "treasury", "10-year", "real rate", "breakeven"],
    "Credit Spreads": ["spread", "oas", "high yield", "investment grade", "credit"],
    "Equities": ["s&p", "spx", "equit", "stock", "nasdaq", "earnings", "cape"],
    "Housing": ["housing", "home sales", "mortgage", "pending home"],
    "Labour Market": ["unemployment", "jobs", "payroll", "labour", "labor"],
    "Commodities & Dollar": ["gold", "oil", "dollar", "commodit", "crude"],
    "Tariffs & Geopolitics": ["tariff", "trump", "xi", "china", "iran", "geopolit"],
}
_TICKER_RE = re.compile(r"\b[A-Z]{2,5}\b")
_TICKER_STOP = {"CPI", "PPI", "PCE", "FOMC", "GDP", "USD", "CEO", "ETF", "IPO", "AI", "US", "OK"}


class StubProvider(AnalysisProvider):
    name = "stub"

    def analyze(self, metadata: dict, transcript_text: str) -> dict:
        text = transcript_text
        lowered = text.lower()
        sentences = re.split(r"(?<=[.!?])\s+", text)

        sections = []
        for topic, kws in _TOPIC_KEYWORDS.items():
            hits = [s for s in sentences if any(k in s.lower() for k in kws)]
            if not hits:
                continue
            sections.append(
                {
                    "topic": topic,
                    "summary": " ".join(hits[:2])[:400] or f"Discussion of {topic.lower()}.",
                    "data_points": [s.strip()[:160] for s in hits[:3] if re.search(r"\d", s)],
                    "sentiment": "neutral",
                }
            )

        tickers = sorted(
            {t for t in _TICKER_RE.findall(text) if t not in _TICKER_STOP}
        )[:12]

        return {
            "tldr": (
                "Heuristic summary (no AI key configured). "
                + (sentences[0][:280] if sentences else "No transcript content.")
            ),
            "overall_sentiment": {
                "label": "neutral",
                "score": 0.0,
                "rationale": "Stub provider does not assess sentiment; set AI_PROVIDER=anthropic.",
            },
            "sections": sections,
            "key_risks": [],
            "key_opportunities": [],
            "positioning": [],
            "tickers_mentioned": tickers,
            "notable_quotes": [s.strip() for s in sentences[:3] if len(s.strip()) > 40],
            "_provider": self.name,
            "_model": "stub-extractive",
            "_usage": {},
        }
