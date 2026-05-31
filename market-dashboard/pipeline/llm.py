"""Optional Claude analysis of the whole dashboard — one call per refresh that
reads every section (and the curve and the ETF table) on its own and vs last
week, then synthesises a whole-regime outlook.

Gated by ANTHROPIC_API_KEY; build.py falls back to the rule-based section
summaries when it's absent. The system prompt bakes in my fixed rule set so the
model reads the numbers the way I do, in the desk's own voice — it never names
any external analyst.
"""

from __future__ import annotations

import json

import config

_SYSTEM = (
    "You are the in-house strategist for a personal macro dashboard. Write in the first "
    "person plural ('we'/'our read') as the desk's own voice. NEVER name or cite any external "
    "analyst, pundit, or YouTuber — the analysis is ours. Apply this fixed rule set:\n"
    "- Liquidity regime is the master switch: net liquidity (Fed balance sheet − TGA − reverse "
    "repo) and bank reserves (~$3T floor). Abundant/expanding liquidity supports risk even with "
    "high rates; draining is the real headwind.\n"
    "- The 10-year Treasury and oil are the two data points to check first every week.\n"
    "- Read the Fed off the implied policy path, not the spot rate; a pivot from cutting back "
    "toward hiking is the sell signal.\n"
    "- Breadth: small caps (IWM) and regional banks (KRE) tell you if risk appetite is broad or "
    "narrow/fragile. Watch defensives (XLP/XLU) leadership as a risk-off tell.\n"
    "- Credit: HY spreads >4.5% and widening = stress; tight = calm/complacent. VIX: 15-20 calm, "
    "20-30 elevated, >30 fear; sub-15 can be complacency.\n"
    "- Valuation: CAPE and the equity risk premium (earnings yield − 10Y). A thin/negative premium "
    "= stocks richly valued vs bonds.\n"
    "- Growth quality: headline GDP vs final sales; jobless claims for the first labor crack; "
    "Empire/Philly as the ISM-style factory pulse.\n"
    "- Inflation: core PCE is what the Fed weighs; watch breakevens and 1y household expectations "
    "for un-anchoring.\n"
    "- Leverage/froth: rising margin debt = speculative excess; a rollover from the peak warns of "
    "forced selling.\n"
    "Be sharp and opinionated. Cite the actual figures. Flag anything that doesn't fit "
    "(divergences, moves that contradict each other). Clear enough for a finance novice. No "
    "hedging boilerplate, no disclaimers."
)

_INSTRUCTION = (
    "Below is the current dashboard with each section's readings, their week-over-week (wk), "
    "1-month (mo) and 1-year (yr) changes, plus the yield curve and the ETF table. Analyse it "
    "and return a JSON object with EXACTLY these keys:\n"
    '- "regime": a short tag for the macro regime right now (e.g. "Late-cycle, liquidity-supported").\n'
    '- "outlook": 2-4 sentences — the whole-regime read, taking EVERYTHING into account: where we '
    "are, what shifted this week, and the single biggest risk or tension.\n"
    '- "sections": an object whose keys are EXACTLY the section keys provided below (including '
    '"curve" and "etfs" if present). Each value is 1-3 sentences that (a) interpret the current '
    "numbers, (b) note the most important week-over-week move, and (c) flag anything that doesn't "
    "make sense or diverges. Skip a key only if it has no data.\n"
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
    if isinstance(d, dict) and d.get("outlook"):
        d.setdefault("sections", {})
        d.setdefault("regime", "")
        return d
    return None


def analyze_macro(payload: dict) -> dict | None:
    """payload = {overall, posture, gauges, sections:{key:{...}}}. Returns
    {regime, outlook, sections:{key:text}, source:'llm'} or None for fallback."""
    if not config.ANTHROPIC_API_KEY or not payload.get("sections"):
        return None
    try:
        import anthropic
    except ImportError:
        return None
    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
    user = f"{_INSTRUCTION}\n\n{json.dumps(payload, separators=(',', ':'))}"
    try:
        resp = client.messages.create(
            model=config.ANTHROPIC_MODEL,
            max_tokens=2048,
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
