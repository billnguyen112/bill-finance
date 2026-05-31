"""Plain-English explanations of every variable and section, plus an analyst
lens — how Mark Meldrum (MM) and/or Defiant Gatekeeper (DG) actually read each
stat and what counts as good vs bad.

This is the "AI explanation" layer on top of the deterministic rule engine. The
rule engine says *what the signal is*; these notes say *what the variable means*
(`what`), *how to read it* (`read`), and *how MM/DG frame it* (`lens`) — authored
by Claude, baked in as static content so the dashboard needs no API key.
"""

VARIABLE = {
    "fed_funds": {
        "what": "The Federal Reserve's policy interest rate — the anchor for all other short-term rates and the Fed's main lever on the economy.",
        "read": "Higher = tighter policy (cooling growth/inflation, headwind for risk assets). Cuts = easing.",
        "lens": "MM: reads the *path*, not the level — off fed-funds futures (ZQ implied probabilities). His sell signal is the Fed pivoting from cutting back to hiking.",
    },
    "ust_2y": {
        "what": "2-year Treasury yield. Tracks where the market expects the Fed funds rate to average over the next two years, so it's the bond market's read on near-term Fed policy.",
        "read": "Rising = market pricing higher-for-longer rates; falling = expecting cuts/slowdown.",
        "lens": "MM: the market's 2-yr Fed path. Rising = 'higher for longer' (bad for risk); falling = cuts being priced.",
    },
    "ust_10y": {
        "what": "10-year Treasury yield — the benchmark long rate that prices mortgages, corporate debt, and equity valuations (the 'discount rate' for stocks).",
        "read": "Rising long yields pressure rich equity valuations and rate-sensitive sectors; falling yields ease financial conditions.",
        "lens": "DG's #1 weekly data point (alongside oil). Up = bad for stocks (higher discount rate, multiple compression); down = good. MM: the anchor for mortgages and equity valuation.",
    },
    "ust_30y": {
        "what": "30-year Treasury yield — the long end of the curve, sensitive to inflation expectations and the supply of government debt.",
        "read": "A rising long bond often reflects inflation or fiscal/supply worries.",
        "lens": "MM: a rising long bond on fiscal/supply or inflation worries is a warning even while the Fed is cutting.",
    },
    "curve_2s10s": {
        "what": "The 10-year minus 2-year yield spread — the most-watched recession indicator. It inverts (goes negative) when short rates exceed long rates, which has preceded most U.S. recessions.",
        "read": "Below 0 = inverted (recession warning). Re-steepening from inversion (often via the short end falling) frequently coincides with the onset of trouble.",
        "lens": "MM: also tracks the 3M→10Y. A *re-steepening* from inversion (long end up or short end down) often marks the trouble actually starting. Inverted = bad.",
    },
    "real_10y": {
        "what": "The 10-year inflation-protected (TIPS) yield — the 'real' cost of money after inflation. It's the cleanest gauge of how restrictive policy is for the economy.",
        "read": "High real yields (>~2%) are restrictive — a headwind for housing, equities, and growth. Low/negative real yields are stimulative.",
        "lens": "MM: the cleanest read on how restrictive policy actually is. >2% real = restrictive (bad for risk); low/negative = stimulative (good).",
    },
    "cpi": {
        "what": "Consumer Price Index, year-over-year — the headline inflation rate households feel, including food and energy.",
        "read": "Above the Fed's ~2% target keeps policy tight. Accelerating is hawkish; cooling opens the door to cuts.",
        "lens": "MM: decomposes the month-over-month print and strips energy to find the trend. Hot/accelerating = hawkish (bad); cooling opens the door to cuts (good).",
    },
    "core_cpi": {
        "what": "CPI excluding volatile food and energy — a cleaner read on the inflation trend the Fed actually responds to.",
        "read": "Sticky core (3%+) is the Fed's main worry; sub-2% would signal disinflation is winning.",
        "lens": "MM: the sticky-core read the Fed responds to. 3%+ keeps policy tight (bad); cooling toward 2% is the bull case (good).",
    },
    "pce": {
        "what": "Personal Consumption Expenditures price index — the Fed's preferred inflation gauge (broader and differently weighted than CPI).",
        "read": "This is the number the 2% target literally refers to. Above 2% = mission not accomplished.",
        "lens": "MM: this is the gauge the 2% target literally refers to. Above target = the Fed can't ease freely (bad for risk).",
    },
    "core_pce": {
        "what": "Core PCE — the single inflation series the Fed weighs most heavily when setting policy.",
        "read": "Trend toward 2% supports rate cuts; stalling above 2.5–3% keeps policy restrictive.",
        "lens": "MM: THE number for Fed policy. Stalling above 2.5–3% keeps rates restrictive (bad); trending to 2% supports cuts (good).",
    },
    "ppi": {
        "what": "Producer Price Index — prices at the wholesale/producer level, often a leading indicator for consumer inflation down the pipeline.",
        "read": "Rising PPI can foreshadow consumer-price pressure; falling PPI hints disinflation ahead.",
        "lens": "MM: pipeline pressure that shows up in CPI later. Rising = future inflation risk (bad); falling hints disinflation ahead (good).",
    },
    "breakeven_10y": {
        "what": "10-year breakeven — the inflation rate the bond market is pricing in (nominal yield minus TIPS yield). It's the market's inflation expectation, not realized inflation.",
        "read": "Drifting above ~2.5% means markets doubt inflation will return to target; well-anchored near 2% is reassuring.",
        "lens": "MM: the market's inflation expectation. Drifting >2.5% = Fed credibility slipping (bad); anchored ~2% is reassuring (good).",
    },
    "infl_exp_1y": {
        "what": "University of Michigan 1-year-ahead inflation expectations — what households expect inflation to be over the next year.",
        "read": "Rising expectations can become self-fulfilling (wage/price setting) and alarm the Fed; falling back toward ~3% is reassuring.",
        "lens": "DG: flags this explicitly (cited 4.8%). Un-anchoring household expectations is a red flag the Fed can't ignore (bad); easing back is good.",
    },
    "ig_oas": {
        "what": "Investment-grade corporate bond option-adjusted spread — the extra yield investors demand over Treasuries to hold high-quality company debt.",
        "read": "Widening = rising perceived risk / tightening financial conditions; tight spreads = calm, risk-on credit.",
        "lens": "Both: high-grade credit stress. Widening = financial conditions tightening (bad); tight = calm, risk-on credit (good).",
    },
    "hy_oas": {
        "what": "High-yield ('junk') bond spread — the premium on the riskiest corporate debt. The market's most sensitive real-time gauge of credit stress and recession risk.",
        "read": "Below ~3% = complacent/calm. Above ~4.5–5% and widening = credit stress, a classic risk-off warning that often leads equities.",
        "lens": "DG: in a credit crunch junk has to pay a 15–20% premium over risk-free — that's the tell. >4.5% & widening = stress (bad); <3% = calm but complacent.",
    },
    "sp500": {
        "what": "S&P 500 — the headline U.S. large-cap equity index and the primary 'risk asset' barometer.",
        "read": "Near 1-year highs = strong momentum/risk-on. A drop of 10%+ is a correction; 20%+ is a bear market.",
        "lens": "Both: the risk barometer. Near 1-yr highs = risk-on (good); −10% correction / −20% bear (bad). MM cross-checks the move against small-cap breadth.",
    },
    "nasdaq": {
        "what": "Nasdaq Composite — tech-heavy index, more sensitive to interest rates and growth expectations than the broad market.",
        "read": "Leads on the way up and down; underperformance vs the S&P often signals rate or growth worries.",
        "lens": "Both: rate-sensitive growth leadership. Leads up and down; lagging the S&P signals rate/growth worry (bad).",
    },
    "vix": {
        "what": "The 'fear gauge' — implied volatility on S&P 500 options over the next 30 days.",
        "read": "Below ~15 = calm/complacent. 20–30 = elevated stress. Above 30 = fear/dislocation.",
        "lens": "DG's fear gauge, with explicit bands: 15–20 = calm/uptrend (good), 20–30 elevated, >30 fear (bad). Sub-15 is calm but can mean complacency.",
    },
    "new_home_sales": {
        "what": "New single-family home sales (annualized, thousands) — a timely read on housing demand, which is highly interest-rate sensitive.",
        "read": "Falling sales signal mortgage rates are biting and housing — a big growth driver — is cooling.",
        "lens": "MM: rate-sensitive demand. Falling = policy is biting and a big growth driver is cooling (bad).",
    },
    "housing_starts": {
        "what": "Housing starts — new residential construction begun (annualized, thousands). Tracks builder confidence and feeds GDP and jobs.",
        "read": "Declining starts point to a slowing construction cycle and softer growth ahead.",
        "lens": "MM: declining starts point to a slowing construction cycle and softer growth and jobs ahead (bad).",
    },
    "mortgage_30y": {
        "what": "Average 30-year fixed mortgage rate — the price of housing finance and the main transmission of Fed policy to households.",
        "read": "Above ~7% squeezes affordability and demand; falling rates revive housing.",
        "lens": "MM: keys off the 10Y, not fed funds — so 'rate cuts' needn't lower it. >7% squeezes housing (bad); falling revives it (good).",
    },
    "case_shiller": {
        "what": "S&P CoreLogic Case-Shiller national home price index, year-over-year — the benchmark for U.S. home-price trends.",
        "read": "Negative y/y means home prices are actually falling — a drag on household wealth and confidence.",
        "lens": "MM: negative y/y means prices are actually falling — a hit to household wealth and confidence (bad).",
    },
    "net_liquidity": {
        "what": "Net liquidity = Fed balance sheet − Treasury General Account (TGA) − overnight reverse repo. The pool of cash sloshing around markets — a powerful driver of risk-asset prices.",
        "read": "Rising net liquidity is a tailwind for stocks; draining liquidity (Fed shrinking, TGA refilling, RRP rising) is a headwind.",
        "lens": "MM's core thesis: 'when liquidity is abundant, the interest rate doesn't really matter.' Expanding = tailwind (good); draining = headwind (bad). DG runs the same liquidity-regime lens.",
    },
    "fed_assets": {
        "what": "Total assets on the Fed's balance sheet. Rising = QE (adding liquidity); falling = QT (draining it).",
        "read": "The slow-moving backdrop for liquidity; QT is a persistent drag.",
        "lens": "MM: '$6.5tn of bonds taken off the market has to go somewhere.' QT shrinking the sheet is a persistent drag (bad); expansion is fuel (good).",
    },
    "tga": {
        "what": "Treasury General Account — the government's checking account at the Fed. When it rises (tax collection, debt issuance), it drains cash from the banking system; when it falls (spending), it injects cash.",
        "read": "A rising TGA pulls liquidity OUT of markets (bearish); a falling TGA pushes it in. Meldrum watches this weekly.",
        "lens": "MM watches this weekly. A rising TGA pulls cash OUT of markets (bad); a falling TGA injects it (good).",
    },
    "reverse_repo": {
        "what": "Overnight reverse repo (RRP) — cash parked at the Fed by money funds. It's drained sharply since 2023.",
        "read": "Falling RRP releases cash into markets; once near zero, that liquidity cushion is gone.",
        "lens": "MM: draining RRP releases cash into markets (good) — but once it's near zero that cushion is gone, and the next drain hits reserves.",
    },
    "bank_reserves": {
        "what": "Reserve balances banks hold at the Fed — the core measure of banking-system liquidity.",
        "read": "Falling reserves toward 'scarce' levels (~$3T) is where funding stress historically appears.",
        "lens": "MM: watches reserves toward the ~$3T 'scarce' line — that's where funding stress historically shows up (bad).",
    },
    "cfnai": {
        "what": "Chicago Fed National Activity Index — a 85-indicator composite of US growth. Zero = trend growth.",
        "read": "Above 0 = above-trend growth; a 3-month average below ~−0.7 has signaled recessions.",
        "lens": "Both: a broad activity composite. >0 = above-trend growth (good); a 3-mo average below −0.7 has flagged recessions (bad).",
    },
    "empire_mfg": {
        "what": "Empire State (NY Fed) manufacturing survey — a timely, free PMI-style read on factory activity.",
        "read": "Above 0 = expansion, below 0 = contraction. A leading growth indicator.",
        "lens": "Both reference ISM; this regional Fed survey is the free stand-in. >0 expansion (good), <0 contraction (bad).",
    },
    "philly_mfg": {
        "what": "Philadelphia Fed manufacturing survey (Current General Activity) — the other key regional PMI-style gauge; a free stand-in for the ISM.",
        "read": "Above 0 = expansion, below 0 = contraction. Read alongside Empire State for the factory pulse.",
        "lens": "Both watch ISM; this is the free equivalent. Read with Empire State for the factory pulse — >0 expansion (good), <0 contraction (bad).",
    },
    "small_caps": {
        "what": "Russell 2000 (IWM) — small-cap stocks. More cyclical and domestic than mega-caps; a cleaner risk-appetite and breadth gauge.",
        "read": "Small caps leading = healthy risk-on breadth; lagging badly = narrow, fragile market (mega-cap-only).",
        "lens": "MM: appeared in 9 of his last 10 updates — his breadth/risk-appetite tell. Leading = healthy risk-on (good); lagging badly = a narrow, fragile market (bad).",
    },
    "regional_banks": {
        "what": "Regional banks ETF (KRE) — the pressure gauge for banking-system and commercial-real-estate stress.",
        "read": "Sharp KRE weakness is an early warning of credit/funding stress (e.g. March 2023).",
        "lens": "MM: the early-warning gauge for bank and commercial-real-estate stress. Sharp KRE weakness = credit trouble brewing (bad).",
    },
    "real_gdp": {
        "what": "Real GDP growth (annualized) — the headline pace of the economy.",
        "read": "Headline GDP can be flattered by inventory builds, government spending, or a shrinking trade deficit — compare it to final sales below to judge the *quality* of the growth.",
        "lens": "MM: headline GDP can be flattered by inventories/government — always judged against final sales. High *quality* growth = good; flattered headline = low quality (bad).",
    },
    "final_sales": {
        "what": "Real final sales to private domestic purchasers — GDP stripped of inventories, trade, and government. The cleanest gauge of underlying private demand.",
        "read": "When this runs well below headline GDP, the growth is 'low quality' (propped up by inventories/government). When it tracks or leads GDP, demand is genuinely solid.",
        "lens": "MM's 'GDP quality' check. Below headline GDP = low-quality growth (bad); tracking or above = genuine private demand (good).",
    },
    "unemployment": {
        "what": "Headline unemployment rate — the Fed's other mandate (alongside inflation) and a core recession signal.",
        "read": "A rise of ~0.5pp off the lows (the 'Sahm rule') has historically marked recession onset; low and steady = healthy labor market.",
        "lens": "Both: a +0.5pp rise off the lows (Sahm rule) has marked recession onset (bad); low and steady = healthy (good).",
    },
    "payrolls": {
        "what": "Nonfarm payrolls — net jobs added each month, the single most market-moving labor release.",
        "read": "Below ~100k is soft; negative means outright job losses. Strong prints support consumer spending but can keep the Fed cautious.",
        "lens": "MM: watches the *composition* (e.g. healthcare-only prints flatter the headline). <100k soft, negative = job losses (bad); broad strength = good.",
    },
    "claims": {
        "what": "Initial jobless claims — weekly new unemployment filings, the most timely (and least lagging) labor indicator.",
        "read": "A sustained rise is one of the earliest cracks in the labor market; low and stable = no stress yet.",
        "lens": "Both: the most timely labor crack. A sustained rise is an early warning (bad); low and stable = no stress yet (good).",
    },
    "wti": {
        "what": "West Texas Intermediate crude — the U.S. oil benchmark. Energy prices feed inflation and act as a tax on consumers.",
        "read": "Spiking oil is inflationary and growth-negative; falling oil eases inflation but can signal weak demand.",
        "lens": "DG's #2 weekly data point (with the 10Y). Spiking oil = an inflationary tax on consumers (bad); easing helps inflation (good), unless it's signalling weak demand.",
    },
    "brent": {
        "what": "Brent crude — the global oil benchmark; the Brent-WTI gap reflects global vs U.S. supply/demand.",
        "read": "Same drivers as WTI; watch both for an energy-led inflation impulse.",
        "lens": "DG: the global half of his two key weekly data points. MM watches the Brent–WTI gap for global vs U.S. supply stress.",
    },
    "gold": {
        "what": "Gold (London PM fix) — a hedge against inflation, currency debasement, and tail risk; also sensitive to real yields.",
        "read": "Rising gold often reflects falling real yields, inflation fear, or flight-to-safety demand.",
        "lens": "Both: a hedge vs real yields, debasement and tail risk. A persistent bid often reflects falling real yields or a flight to safety.",
    },
    "dollar": {
        "what": "Broad trade-weighted U.S. dollar index — the dollar's value against major trading partners. A key driver of commodities, EM, and multinational earnings.",
        "read": "A strong/rising dollar tightens global financial conditions and pressures commodities, EM, and non-U.S. assets.",
        "lens": "MM: a strong/rising dollar tightens global financial conditions and pressures commodities and non-U.S. assets (risk-negative).",
    },
    "erp": {
        "what": "Equity risk premium = the market's earnings yield (here CAPE-based, 1 ÷ Shiller CAPE) minus the 10-year Treasury yield. How much extra you're paid to own stocks over 'risk-free' bonds.",
        "read": "Wide premium = equities well compensated vs bonds. Thin/negative = you're barely (or not) paid to take equity risk — a hallmark of an expensive market.",
        "lens": "DG: compares the earnings yield to the 10Y to judge if prices are justified. A thin or negative premium = poorly compensated vs bonds (bad). MM's CAPE-at-42 'richly valued' read shows up here as a negative premium.",
    },
}

SECTION = {
    "rates": "Where the Fed has set policy and what the bond market expects next. The yield curve and real yields tell you how restrictive conditions are.",
    "inflation": "How far inflation is from the Fed's 2% target. Core PCE is the number that matters most for rate decisions; breakevens and Michigan expectations show what markets and households expect.",
    "credit": "Corporate bond spreads — the market's real-time pricing of default and recession risk. Credit usually cracks before equities do.",
    "liquidity": "The cash sloshing through markets — Fed balance sheet minus the Treasury's account (TGA) and reverse repo. Net liquidity is a powerful driver of risk assets; a heavy focus for Meldrum.",
    "equities": "The risk-asset barometer: index momentum, breadth (small caps), volatility (VIX), and valuation (CAPE, equity risk premium). Reflects the market's overall appetite for risk.",
    "housing": "Housing is the most rate-sensitive part of the economy and an early indicator of how Fed policy is feeding through to growth.",
    "labor": "The Fed's second mandate. A softening labor market (rising unemployment/claims, weak payrolls) is the clearest recession tell.",
    "growth": "The pace AND quality of growth. Headline GDP vs final sales to private domestic purchasers shows whether growth is genuine private demand or propped up by inventories/government.",
    "commodities": "Energy and the dollar drive inflation and global financial conditions; gold reflects real yields and risk appetite. Oil is one of Defiant's two key weekly data points.",
}
