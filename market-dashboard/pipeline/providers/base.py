"""Provider interface + the shared analysis JSON schema and prompt.

The schema is written to satisfy Claude's structured-output constraints:
every object sets additionalProperties:false, and there are no unsupported
min/max constraints.
"""

from __future__ import annotations

import abc

# Sentiment labels reused across the overall read and each section.
_SENTIMENT_ENUM = [
    "bullish",
    "cautiously bullish",
    "neutral",
    "cautiously bearish",
    "bearish",
]

ANALYSIS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "tldr": {
            "type": "string",
            "description": "2-4 sentence plain-English summary of the week's macro view.",
        },
        "overall_sentiment": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "label": {"type": "string", "enum": _SENTIMENT_ENUM},
                "score": {
                    "type": "number",
                    "description": "Sentiment from -1 (very bearish) to +1 (very bullish).",
                },
                "rationale": {"type": "string"},
            },
            "required": ["label", "score", "rationale"],
        },
        "sections": {
            "type": "array",
            "description": "One entry per macro topic Mark covers (CPI/PPI, rates, yields, OAS, FOMC, housing, equities, tariffs, geopolitics, etc.).",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "topic": {"type": "string"},
                    "summary": {"type": "string"},
                    "data_points": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Specific figures or facts he cited (levels, %, dates).",
                    },
                    "sentiment": {"type": "string", "enum": _SENTIMENT_ENUM},
                },
                "required": ["topic", "summary", "data_points", "sentiment"],
            },
        },
        "key_risks": {"type": "array", "items": {"type": "string"}},
        "key_opportunities": {"type": "array", "items": {"type": "string"}},
        "positioning": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Portfolio / positioning takeaways he signalled.",
        },
        "tickers_mentioned": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Tickers in the MACRO discussion only — exclude the company spotlight/deep-dive.",
        },
        "notable_quotes": {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "tldr",
        "overall_sentiment",
        "sections",
        "key_risks",
        "key_opportunities",
        "positioning",
        "tickers_mentioned",
        "notable_quotes",
    ],
}

# Stable system prompt — cached across videos in a single run (see provider).
SYSTEM_PROMPT = """You are a macro markets analyst. You are given the transcript \
of Mark Meldrum's weekly market-update video (he is a CFA charterholder who \
reviews the week in markets). Your job is to break down and structure his MACRO \
commentary so it can be aggregated and compared week over week.

Cover the economic and market themes he discusses: inflation (CPI/PPI/PCE), the \
Fed and interest rates, nominal/real rates, yields and breakevens, credit \
spreads (IG vs HY OAS), housing, the labour market, equities (S&P/SPX, sectors), \
the dollar, commodities (gold/oil), tariffs, and geopolitics.

CRITICAL: Each video ends with a "spotlight company" / individual-company deep \
dive. IGNORE that company-specific deep dive entirely — do not summarise it, do \
not put its ticker in tickers_mentioned. Only analyse the broad macro/market \
portion. If the transcript appears to already be trimmed before the spotlight, \
just analyse what is present.

Be faithful to what he actually said — capture his specific data points and his \
directional view. Do not invent figures. Populate every field of the schema; use \
empty arrays where genuinely nothing applies."""


def build_user_prompt(metadata: dict, transcript_text: str) -> str:
    return (
        f"VIDEO TITLE: {metadata.get('title', '')}\n"
        f"PUBLISHED: {metadata.get('published_at', '')}\n\n"
        f"TRANSCRIPT (macro portion, spotlight trimmed):\n{transcript_text}"
    )


class AnalysisProvider(abc.ABC):
    name: str = "base"

    @abc.abstractmethod
    def analyze(self, metadata: dict, transcript_text: str) -> dict:
        """Return a dict conforming to ANALYSIS_SCHEMA."""
        raise NotImplementedError
