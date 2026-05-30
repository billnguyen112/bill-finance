"""Market-implied read on the Fed's next move — the leading indicator behind a
hawkish (hike) pivot.

The gold standard is CME FedWatch (fed funds futures), but its API is paid and
free futures feeds are unreliable. The 3-month Treasury bill yield is a close,
free proxy for the average fed funds rate the market expects over the next
quarter, so (3M T-bill − effective fed funds) reveals whether the market is
pricing hikes, cuts, or no change into the upcoming FOMC meetings.
"""

from __future__ import annotations

# 2026 FOMC decision dates (second day of each meeting).
FOMC_DECISION_DATES = [
    "2026-01-28", "2026-03-18", "2026-04-29", "2026-06-17",
    "2026-07-29", "2026-09-16", "2026-10-28", "2026-12-09",
]


def next_fomc(today_iso: str) -> str | None:
    upcoming = [d for d in FOMC_DECISION_DATES if d >= today_iso]
    return upcoming[0] if upcoming else None


def build(fed_funds: float | None, t3m: float | None, today_iso: str) -> dict | None:
    """Return the market-implied Fed read, or None if inputs are missing."""
    if fed_funds is None or t3m is None:
        return None
    implied = round(t3m - fed_funds, 2)         # percentage points
    bp = round(implied * 100)                    # basis points
    odds = min(100, round(abs(implied) / 0.25 * 100))  # rough % of a 25bp move priced
    if implied >= 0.10:
        stance, lean = "hike", f"market leaning toward a HIKE (~{odds}% of a 25bp move priced in)"
    elif implied <= -0.10:
        stance, lean = "cut", f"market pricing CUTS (~{odds}% of a 25bp move priced in)"
    else:
        stance, lean = "hold", "market pricing roughly on-hold"
    nf = next_fomc(today_iso)
    reading = (f"3M T-bill {t3m:.2f}% vs fed funds {fed_funds:.2f}% ({bp:+d}bp) — {lean}"
               + (f" · next FOMC {nf}" if nf else ""))
    return {
        "stance": stance, "implied_bp": bp,
        "hike_odds": odds if stance == "hike" else 0,
        "cut_odds": odds if stance == "cut" else 0,
        "next_fomc": nf, "t3m": t3m, "fed_funds": fed_funds, "reading": reading,
    }
