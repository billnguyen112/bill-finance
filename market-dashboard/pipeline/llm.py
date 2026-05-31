"""Optional Claude call that analyses what changed since the last refresh.

Gated by ANTHROPIC_API_KEY — when absent, build.py falls back to a deterministic
rule-based summary. The system prompt bakes in my fixed rule set (the framework
I track every week) so the model reads the numbers the way I do; it never names
any external analyst. One small, cached call per refresh.
"""

from __future__ import annotations

import json

import config

# My standing playbook, baked into a cached system prompt.
_SYSTEM = (
    "You are the in-house analyst for a personal macro dashboard. Write in the first "
    "person plural ('we'/'our read') as the desk's own voice. NEVER name or cite any "
    "external analyst, pundit, or YouTuber. Apply this fixed rule set when reading the "
    "numbers:\n"
    "- Liquidity regime is the master switch: net liquidity (Fed balance sheet − TGA − "
    "reverse repo), bank reserves toward ~$3T. Abundant/expanding liquidity supports risk; "
    "draining is a headwind.\n"
    "- The 10-year Treasury and oil are the two key data points to check every week.\n"
    "- Read the Fed off the implied policy path, not the spot rate; a pivot from cutting "
    "back toward hiking is the sell signal.\n"
    "- Small-cap breadth (IWM) and regional banks (KRE) tell you if risk appetite is broad "
    "or narrow/fragile.\n"
    "- Credit: HY spreads >4.5% and widening = stress; tight = calm. VIX bands: 15-20 calm, "
    "20-30 elevated, >30 fear; sub-15 can be complacency.\n"
    "- Valuation: CAPE and the equity risk premium (earnings yield − 10Y). A thin/negative "
    "premium means stocks are richly valued vs bonds.\n"
    "- Growth quality: compare headline GDP to final sales; watch jobless claims for the "
    "first labor crack; ISM-style regional surveys (Empire/Philly) for the factory pulse.\n"
    "- Leverage/froth: rising margin debt = speculative excess; a rollover from the peak "
    "warns of forced selling.\n"
    "Be precise, cite the actual figures you're given, and stay clear enough for a finance "
    "novice. No hedging boilerplate, no disclaimers."
)

_INSTRUCTION = (
    "Below is what changed on the dashboard since the previous refresh, plus current "
    "levels. Write a tight briefing as a JSON object with EXACTLY these keys:\n"
    '- "headline": one sentence — the single most important takeaway from the changes.\n'
    '- "bullets": array of 2-5 strings — each names what moved (with the numbers) and what '
    "it means under our rules. Group related moves; skip anything that didn't change.\n"
    "Respond with ONLY the JSON object — no prose, no markdown fences."
)


def _extract_json(txt: str) -> dict | None:
    txt = txt.strip()
    if "{" in txt and "}" in txt:
        txt = txt[txt.find("{"):txt.rfind("}") + 1]
    try:
        d = json.loads(txt)
    except json.JSONDecodeError:
        return None
    if isinstance(d, dict) and d.get("headline"):
        d.setdefault("bullets", [])
        return d
    return None


def analyze_changes(payload: dict) -> dict | None:
    """payload = {changes: [...], levels: {...}, posture: str}. Returns
    {headline, bullets, source:'llm'} or None to signal fallback."""
    if not config.ANTHROPIC_API_KEY or not payload.get("changes"):
        return None
    try:
        import anthropic
    except ImportError:
        return None
    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
    user = f"{_INSTRUCTION}\n\n{json.dumps(payload, indent=2)}"
    try:
        resp = client.messages.create(
            model=config.ANTHROPIC_MODEL,
            max_tokens=1024,
            system=[{"type": "text", "text": _SYSTEM, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": user}],
        )
    except Exception:
        return None
    txt = next((b.text for b in resp.content if getattr(b, "type", None) == "text"), "")
    out = _extract_json(txt)
    if out:
        out["source"] = "llm"
    return out
