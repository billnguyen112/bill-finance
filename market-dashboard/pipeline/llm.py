"""Optional LLM summarisation of transcripts into an MD-grade brief.

Uses the official Anthropic SDK. Gated by ANTHROPIC_API_KEY — when absent, the
caller falls back to the keyword/extractive digest. The system prompt is cached
so summarising several transcripts in one run reuses the cached prefix.
"""

from __future__ import annotations

import json

import config

_SYSTEM = (
    "You are a senior macro strategist writing a tight brief for a managing director, "
    "summarising a weekly market-update video transcript. Capture the analyst's ACTUAL "
    "views, arguments and conclusions — not merely the topics they touched. Be specific and "
    "faithful: include the concrete figures and levels they cited. Ignore filler, tangents, "
    "and the closing single-company 'spotlight' deep-dive. Write clean, professional prose — "
    "no 'uh/um', no transcript artifacts, no hedging boilerplate."
)

_INSTRUCTION = (
    "Summarise the transcript below into a JSON object with EXACTLY these keys:\n"
    '- "thesis": string — the analyst\'s core market view this week (1-2 sentences).\n'
    '- "stance": one of "bullish","cautiously bullish","neutral","cautious","bearish".\n'
    '- "key_points": array of 3-6 strings — his actual arguments/conclusions.\n'
    '- "data_points": array of strings — specific figures/levels he cited.\n'
    '- "risks": array of strings — risks/concerns he flagged.\n'
    '- "positioning": array of strings — what he is doing or suggests (cash, sectors, hedges).\n'
    "Respond with ONLY the JSON object — no prose, no markdown fences."
)


def _extract_json(txt: str) -> dict | None:
    txt = txt.strip()
    if "{" in txt and "}" in txt:
        txt = txt[txt.find("{"):txt.rfind("}") + 1]
    try:
        d = json.loads(txt)
        return d if isinstance(d, dict) and d.get("thesis") else None
    except json.JSONDecodeError:
        return None


def summarize(channel: str, title: str, text: str) -> dict | None:
    if not config.ANTHROPIC_API_KEY or not text:
        return None
    try:
        import anthropic
    except ImportError:
        return None
    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
    user = f"{_INSTRUCTION}\n\nChannel: {channel}\nTitle: {title}\n\nTranscript:\n{text[:80000]}"
    try:
        resp = client.messages.create(
            model=config.ANTHROPIC_MODEL,
            max_tokens=4000,
            thinking={"type": "adaptive"},
            system=[{"type": "text", "text": _SYSTEM, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": user}],
        )
    except Exception:
        return None
    txt = next((b.text for b in resp.content if getattr(b, "type", None) == "text"), "")
    return _extract_json(txt)
