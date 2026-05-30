"""Plain-English explanations of every variable and section.

This is the "AI explanation" layer that sits on top of the deterministic rule
engine. The rule engine says *what the signal is*; these notes say *what the
variable means and how to read it* — authored by Claude, baked in as static
content so the dashboard needs no API key and no runtime model calls.

Each variable has:
  what  — what it is and why it matters
  read  — how to interpret it moving up vs down
"""

VARIABLE = {
    "fed_funds": {
        "what": "The Federal Reserve's policy interest rate — the anchor for all other short-term rates and the Fed's main lever on the economy.",
        "read": "Higher = tighter policy (cooling growth/inflation, headwind for risk assets). Cuts = easing.",
    },
    "ust_2y": {
        "what": "2-year Treasury yield. Tracks where the market expects the Fed funds rate to average over the next two years, so it's the bond market's read on near-term Fed policy.",
        "read": "Rising = market pricing higher-for-longer rates; falling = expecting cuts/slowdown.",
    },
    "ust_10y": {
        "what": "10-year Treasury yield — the benchmark long rate that prices mortgages, corporate debt, and equity valuations (the 'discount rate' for stocks).",
        "read": "Rising long yields pressure rich equity valuations and rate-sensitive sectors; falling yields ease financial conditions.",
    },
    "ust_30y": {
        "what": "30-year Treasury yield — the long end of the curve, sensitive to inflation expectations and the supply of government debt.",
        "read": "A rising long bond often reflects inflation or fiscal/supply worries.",
    },
    "curve_2s10s": {
        "what": "The 10-year minus 2-year yield spread — the most-watched recession indicator. It inverts (goes negative) when short rates exceed long rates, which has preceded most U.S. recessions.",
        "read": "Below 0 = inverted (recession warning). Re-steepening from inversion (often via the short end falling) frequently coincides with the onset of trouble.",
    },
    "real_10y": {
        "what": "The 10-year inflation-protected (TIPS) yield — the 'real' cost of money after inflation. It's the cleanest gauge of how restrictive policy is for the economy.",
        "read": "High real yields (>~2%) are restrictive — a headwind for housing, equities, and growth. Low/negative real yields are stimulative.",
    },
    "cpi": {
        "what": "Consumer Price Index, year-over-year — the headline inflation rate households feel, including food and energy.",
        "read": "Above the Fed's ~2% target keeps policy tight. Accelerating is hawkish; cooling opens the door to cuts.",
    },
    "core_cpi": {
        "what": "CPI excluding volatile food and energy — a cleaner read on the inflation trend the Fed actually responds to.",
        "read": "Sticky core (3%+) is the Fed's main worry; sub-2% would signal disinflation is winning.",
    },
    "pce": {
        "what": "Personal Consumption Expenditures price index — the Fed's preferred inflation gauge (broader and differently weighted than CPI).",
        "read": "This is the number the 2% target literally refers to. Above 2% = mission not accomplished.",
    },
    "core_pce": {
        "what": "Core PCE — the single inflation series the Fed weighs most heavily when setting policy.",
        "read": "Trend toward 2% supports rate cuts; stalling above 2.5–3% keeps policy restrictive.",
    },
    "ppi": {
        "what": "Producer Price Index — prices at the wholesale/producer level, often a leading indicator for consumer inflation down the pipeline.",
        "read": "Rising PPI can foreshadow consumer-price pressure; falling PPI hints disinflation ahead.",
    },
    "breakeven_10y": {
        "what": "10-year breakeven — the inflation rate the bond market is pricing in (nominal yield minus TIPS yield). It's the market's inflation expectation, not realized inflation.",
        "read": "Drifting above ~2.5% means markets doubt inflation will return to target; well-anchored near 2% is reassuring.",
    },
    "ig_oas": {
        "what": "Investment-grade corporate bond option-adjusted spread — the extra yield investors demand over Treasuries to hold high-quality company debt.",
        "read": "Widening = rising perceived risk / tightening financial conditions; tight spreads = calm, risk-on credit.",
    },
    "hy_oas": {
        "what": "High-yield ('junk') bond spread — the premium on the riskiest corporate debt. The market's most sensitive real-time gauge of credit stress and recession risk.",
        "read": "Below ~3% = complacent/calm. Above ~4.5–5% and widening = credit stress, a classic risk-off warning that often leads equities.",
    },
    "sp500": {
        "what": "S&P 500 — the headline U.S. large-cap equity index and the primary 'risk asset' barometer.",
        "read": "Near 1-year highs = strong momentum/risk-on. A drop of 10%+ is a correction; 20%+ is a bear market.",
    },
    "nasdaq": {
        "what": "Nasdaq Composite — tech-heavy index, more sensitive to interest rates and growth expectations than the broad market.",
        "read": "Leads on the way up and down; underperformance vs the S&P often signals rate or growth worries.",
    },
    "vix": {
        "what": "The 'fear gauge' — implied volatility on S&P 500 options over the next 30 days.",
        "read": "Below ~15 = calm/complacent. 20–30 = elevated stress. Above 30 = fear/dislocation.",
    },
    "new_home_sales": {
        "what": "New single-family home sales (annualized, thousands) — a timely read on housing demand, which is highly interest-rate sensitive.",
        "read": "Falling sales signal mortgage rates are biting and housing — a big growth driver — is cooling.",
    },
    "housing_starts": {
        "what": "Housing starts — new residential construction begun (annualized, thousands). Tracks builder confidence and feeds GDP and jobs.",
        "read": "Declining starts point to a slowing construction cycle and softer growth ahead.",
    },
    "mortgage_30y": {
        "what": "Average 30-year fixed mortgage rate — the price of housing finance and the main transmission of Fed policy to households.",
        "read": "Above ~7% squeezes affordability and demand; falling rates revive housing.",
    },
    "case_shiller": {
        "what": "S&P CoreLogic Case-Shiller national home price index, year-over-year — the benchmark for U.S. home-price trends.",
        "read": "Negative y/y means home prices are actually falling — a drag on household wealth and confidence.",
    },
    "unemployment": {
        "what": "Headline unemployment rate — the Fed's other mandate (alongside inflation) and a core recession signal.",
        "read": "A rise of ~0.5pp off the lows (the 'Sahm rule') has historically marked recession onset; low and steady = healthy labor market.",
    },
    "payrolls": {
        "what": "Nonfarm payrolls — net jobs added each month, the single most market-moving labor release.",
        "read": "Below ~100k is soft; negative means outright job losses. Strong prints support consumer spending but can keep the Fed cautious.",
    },
    "claims": {
        "what": "Initial jobless claims — weekly new unemployment filings, the most timely (and least lagging) labor indicator.",
        "read": "A sustained rise is one of the earliest cracks in the labor market; low and stable = no stress yet.",
    },
    "wti": {
        "what": "West Texas Intermediate crude — the U.S. oil benchmark. Energy prices feed inflation and act as a tax on consumers.",
        "read": "Spiking oil is inflationary and growth-negative; falling oil eases inflation but can signal weak demand.",
    },
    "brent": {
        "what": "Brent crude — the global oil benchmark; the Brent-WTI gap reflects global vs U.S. supply/demand.",
        "read": "Same drivers as WTI; watch both for an energy-led inflation impulse.",
    },
    "gold": {
        "what": "Gold (London PM fix) — a hedge against inflation, currency debasement, and tail risk; also sensitive to real yields.",
        "read": "Rising gold often reflects falling real yields, inflation fear, or flight-to-safety demand.",
    },
    "dollar": {
        "what": "Broad trade-weighted U.S. dollar index — the dollar's value against major trading partners. A key driver of commodities, EM, and multinational earnings.",
        "read": "A strong/rising dollar tightens global financial conditions and pressures commodities and non-U.S. assets.",
    },
}

SECTION = {
    "rates": "Where the Fed has set policy and what the bond market expects next. The yield curve and real yields tell you how restrictive conditions are.",
    "inflation": "How far inflation is from the Fed's 2% target. Core PCE is the number that matters most for rate decisions; breakevens show what markets expect.",
    "credit": "Corporate bond spreads — the market's real-time pricing of default and recession risk. Credit usually cracks before equities do.",
    "equities": "The risk-asset barometer: index momentum, volatility (VIX), and valuation (CAPE). Reflects the market's overall appetite for risk.",
    "housing": "Housing is the most rate-sensitive part of the economy and an early indicator of how Fed policy is feeding through to growth.",
    "labor": "The Fed's second mandate. A softening labor market (rising unemployment/claims, weak payrolls) is the clearest recession tell.",
    "commodities": "Energy and the dollar drive inflation and global financial conditions; gold reflects real yields and risk appetite.",
}
