import { useState, useMemo, useEffect, useCallback } from "react";

// ── Data ──────────────────────────────────────────────
const ACCOUNTS = [
  { name: "IBKR ISA", type: "Brokerage", balance: 7712.68, change: -0.5, currency: "USD" },
  { name: "Kraken", type: "Crypto", balance: 0, change: 0, currency: "GBP" },
  { name: "Republic", type: "Private Equity", balance: 1500, change: null, currency: "USD" },
];

const HOLDINGS = [
  { ticker: "SIVE", name: "Sivers Semiconductors", value: 758, costBasis: 950, pnl: -20.2, account: "IBKR", sparkline: [12, 11, 10, 10, 11, 10, 10, 10] },
  { ticker: "META", name: "Meta Platforms", value: 2030, costBasis: 2670, pnl: -24.0, account: "IBKR", sparkline: [560, 550, 540, 535, 530, 534, 533, 534] },
  { ticker: "SOI", name: "S.O.I.T.E.C.", value: 1100, costBasis: 1295, pnl: -15.1, account: "IBKR", sparkline: [55, 54, 53, 52, 52, 51, 52, 52] },
  { ticker: "LNSR", name: "Lensar Inc", value: 891, costBasis: 1168, pnl: -23.7, account: "IBKR", sparkline: [7, 6.5, 6.2, 6, 5.9, 5.8, 5.8, 5.84] },
  { ticker: "TSEM", name: "Tower Semiconductor", value: 601, costBasis: 793, pnl: -24.2, account: "IBKR", sparkline: [165, 162, 160, 158, 159, 158, 158, 158] },
];

const CATEGORIES = [
  { id: "family", label: "Family", icon: "\u{1F468}\u200D\u{1F469}\u200D\u{1F466}", color: "#34d399", budget: 245 },
  { id: "personal_care", label: "Personal Care", icon: "\u{2764}\uFE0F", color: "#f472b6", budget: 19 },
  { id: "eating_out", label: "Eating Out", icon: "\u{1F37D}\uFE0F", color: "#22d3ee", budget: 400 },
  { id: "entertainment", label: "Entertainment", icon: "\u{1F3AC}", color: "#a855f7", budget: 15 },
  { id: "bills", label: "Bills", icon: "\u{1F4A1}", color: "#fb923c", budget: 24 },
  { id: "transport", label: "Transport", icon: "\u{1F697}", color: "#ef4444", budget: 30 },
  { id: "shopping", label: "Shopping", icon: "\u{1F6CD}\uFE0F", color: "#818cf8", budget: 8 },
  { id: "groceries", label: "Groceries", icon: "\u{1F6D2}", color: "#14b8a6", budget: 120 },
  { id: "housing", label: "Housing", icon: "\u{1F3E0}", color: "#6366f1", budget: 1050 },
  { id: "subscriptions", label: "Subscriptions", icon: "\u{1F4FA}", color: "#c084fc", budget: 30 },
  { id: "income", label: "Income", icon: "\u{1F4B0}", color: "#34d399", budget: 0 },
  { id: "work_travel", label: "Work Travel", icon: "\u2708\uFE0F", color: "#38bdf8", budget: 0 },
  { id: "transfer", label: "Transfer", icon: "\u{1F504}", color: "#71717a", budget: 0 },
  { id: "investment", label: "Investment", icon: "\u{1F4C8}", color: "#6366f1", budget: 0 },
  { id: "general", label: "General", icon: "\u{1F4CC}", color: "#a1a1aa", budget: 0 },
];

const EXCLUDED_FROM_SPENDING = ["income", "work_travel", "transfer", "investment"];
const EXCLUDED_FROM_INCOME = ["transfer", "investment"];

const DEFAULT_RECURRING = [
  { id: "r1", merchant: "Rightmove Rent", amount: 1050, categoryId: "housing", frequency: "Monthly", nextDate: "27 Apr" },
  { id: "r2", merchant: "Emma", amount: 9.99, categoryId: "subscriptions", frequency: "Monthly", nextDate: "29 Apr" },
  { id: "r3", merchant: "Netflix", amount: 10.99, categoryId: "subscriptions", frequency: "Monthly", nextDate: "25 Apr" },
  { id: "r4", merchant: "TfL Auto Top-up", amount: 20, categoryId: "transport", frequency: "Weekly", nextDate: "2 Apr" },
  { id: "r5", merchant: "Vietnam Family Transfer", amount: 245.35, categoryId: "family", frequency: "Monthly", nextDate: "24 Apr" },
];

const NET_WORTH_HISTORY = [
  { month: "Oct", value: 28200 },
  { month: "Nov", value: 29100 },
  { month: "Dec", value: 28600 },
  { month: "Jan", value: 30400 },
  { month: "Feb", value: 31200 },
  { month: "Mar", value: 32426 },
];

const MONTHLY_SAVINGS = [
  { month: "Oct", rate: 58 },
  { month: "Nov", rate: 62 },
  { month: "Dec", rate: 45 },
  { month: "Jan", rate: 65 },
  { month: "Feb", rate: 68 },
  { month: "Mar", rate: 0 },
];

function getCat(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

function fmt(n) { return Math.abs(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
// Smart format: -£12 not -£12.00, but -£12.95 stays
function fmtSmart(n) {
  const abs = Math.abs(n);
  if (abs === Math.floor(abs)) return abs.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return abs.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Components ────────────────────────────────────────
function MiniChart({ data, width = 120, height = 40 }) {
  const values = data.map((d) => typeof d === "number" ? d : d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id="cf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6ee7b7" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${width},${height}`} fill="url(#cf)" />
      <polyline points={points} fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Sparkline({ data, width = 60, height = 24, color = "#34d399" }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 2) - 1}`).join(" ");
  const isUp = data[data.length - 1] >= data[0];
  const c = isUp ? color : "#ef4444";
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={points} fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SavingsGauge({ rate, size = 80 }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(rate, 0), 100) / 100;
  const color = rate >= 50 ? "#34d399" : rate >= 30 ? "#fbbf24" : "#ef4444";
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.6s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color }}>{rate}%</div>
      </div>
    </div>
  );
}

function DonutChart({ segments, centerAmount, centerLabel, size = 200 }) {
  const r = (size - 24) / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let offset = 0;
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="16" />
        {segments.map((seg, i) => {
          const pct = total > 0 ? seg.value / total : 0;
          const dash = pct * circ;
          const o = offset;
          offset += pct;
          return (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={seg.color} strokeWidth="16"
              strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={`${-o * circ}`} strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease" }} />
          );
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{centerAmount}</div>
        <div style={{ fontSize: 11, color: "#71717a", marginTop: 2 }}>{centerLabel}</div>
      </div>
    </div>
  );
}

function BarChart({ income, spending, maxVal }) {
  const barH = 140;
  const incH = maxVal > 0 ? (income / maxVal) * barH : 0;
  const spendH = maxVal > 0 ? (spending / maxVal) * barH : 0;
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 28, alignItems: "flex-end", height: barH + 10, marginTop: 10 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#22d3ee" }}>{"\u00A3"}{fmt(income)}</div>
        <div style={{ width: 56, height: incH, background: "linear-gradient(180deg, #22d3ee 0%, #06b6d4 100%)", borderRadius: "8px 8px 4px 4px", transition: "height 0.5s ease" }} />
        <div style={{ fontSize: 11, color: "#71717a" }}>Income</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#f472b6" }}>{"\u00A3"}{fmt(spending)}</div>
        <div style={{ width: 56, height: spendH, background: "linear-gradient(180deg, #f472b6 0%, #ec4899 100%)", borderRadius: "8px 8px 4px 4px", transition: "height 0.5s ease" }} />
        <div style={{ fontSize: 11, color: "#71717a" }}>Spending</div>
      </div>
    </div>
  );
}

function CategoryPicker({ onSelect, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 430, background: "#18181b", borderRadius: "20px 20px 0 0", padding: "20px 20px 30px", maxHeight: "60vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, margin: "0 auto 16px" }} />
        <div style={{ fontSize: 16, fontWeight: 600, textAlign: "center", marginBottom: 16 }}>Choose category</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {CATEGORIES.map((cat) => (
            <button key={cat.id} onClick={() => onSelect(cat.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, cursor: "pointer", color: "#e4e4e7", fontSize: 13, textAlign: "left" }}>
              <span style={{ fontSize: 18 }}>{cat.icon}</span><span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Bottom sheet component
function BottomSheet({ onClose, children, title }) {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 430, background: "#131320", borderRadius: "20px 20px 0 0", padding: "16px 20px 32px", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, margin: "0 auto 16px" }} />
        {title && <div style={{ fontSize: 18, fontWeight: 700, textAlign: "center", marginBottom: 16 }}>{title}</div>}
        {children}
      </div>
    </div>
  );
}

// ── Merchant Logo System ─────────────────────────────
// Uses regex patterns (not substring) to avoid false positives like "netflix" matching "tfl"
const MERCHANT_LOGO_RULES = [
  // Food & Drink
  { p: /\bpret\b/i, d: "pret.co.uk" },
  { p: /\bstarbucks\b/i, d: "starbucks.co.uk" },
  { p: /\bcosta\s*(coffee)?\b/i, d: "costa.co.uk" },
  { p: /\bmcdonald/i, d: "mcdonalds.co.uk" },
  { p: /\bnando/i, d: "nandos.co.uk" },
  { p: /\bwagamama/i, d: "wagamama.com" },
  { p: /\bdeliveroo/i, d: "deliveroo.co.uk" },
  { p: /\buber\s*eats/i, d: "ubereats.com" },
  { p: /\bjust\s*eat/i, d: "just-eat.co.uk" },
  { p: /\bgreggs/i, d: "greggs.co.uk" },
  { p: /\bsubway\b/i, d: "subway.com" },
  { p: /\bkfc\b/i, d: "kfc.co.uk" },
  { p: /\bdomino/i, d: "dominos.co.uk" },
  { p: /\bfive\s*guys/i, d: "fiveguys.co.uk" },
  { p: /\bleon\b/i, d: "leon.co" },
  { p: /\bitsu\b/i, d: "itsu.com" },
  { p: /\bwasabi\b/i, d: "wasabi.uk.com" },
  { p: /\bpizza\s*hut/i, d: "pizzahut.co.uk" },
  { p: /\bpizza\s*express/i, d: "pizzaexpress.com" },
  { p: /\bmarugame/i, d: "marugame-udon.com" },
  { p: /\bdishoom/i, d: "dishoom.com" },
  { p: /\bhonest\s*(burger|group)/i, d: "honestburgers.co.uk" },
  { p: /\btortilla\b/i, d: "tortilla.co.uk" },
  { p: /\bchipotle/i, d: "chipotle.co.uk" },
  { p: /\bshake\s*shack/i, d: "shakeshack.com" },
  { p: /\byo\s*sushi/i, d: "yosushi.com" },
  { p: /\bgail/i, d: "gailsbread.co.uk" },
  { p: /\bjoe\s.*juice/i, d: "joejuice.com" },
  { p: /\bcaffe\s*nero/i, d: "caffenero.com" },
  { p: /\bwingstop/i, d: "wingstop.co.uk" },
  { p: /\bpopeyes/i, d: "popeyes.co.uk" },
  { p: /\bfrankie/i, d: "frankieandbennys.com" },
  { p: /\bsimmons\s*bar/i, d: "simmonsbar.co.uk" },
  { p: /\baxa\b/i, d: "axa.co.uk" },
  // Groceries
  { p: /\btesco/i, d: "tesco.com" },
  { p: /\bsainsbury/i, d: "sainsburys.co.uk" },
  { p: /\basda\b/i, d: "asda.com" },
  { p: /\baldi\b/i, d: "aldi.co.uk" },
  { p: /\blidl\b/i, d: "lidl.co.uk" },
  { p: /\bwaitrose/i, d: "waitrose.com" },
  { p: /\bmorrisons/i, d: "morrisons.com" },
  { p: /\bco-?op\b/i, d: "coop.co.uk" },
  { p: /\bocado/i, d: "ocado.com" },
  { p: /\bmarks.*spencer|m&s\b/i, d: "marksandspencer.com" },
  { p: /\biceland\b/i, d: "iceland.co.uk" },
  { p: /\bwhole\s*foods/i, d: "wholefoods.com" },
  // Transport
  { p: /\btfl\b/i, d: "tfl.gov.uk" },
  { p: /\buber\b(?!\s*eat)/i, d: "uber.com" },
  { p: /\bbolt\s*(ride|taxi|trip)/i, d: "bolt.eu" },
  { p: /\blime\s*(scooter|bike|ride)/i, d: "li.me" },
  { p: /\btrainline/i, d: "thetrainline.com" },
  { p: /\bshell\b/i, d: "shell.co.uk" },
  { p: /\bbp\b/i, d: "bp.com" },
  { p: /\bcitymapper/i, d: "citymapper.com" },
  // Shopping
  { p: /\bamazon/i, d: "amazon.co.uk" },
  { p: /\bebay\b/i, d: "ebay.co.uk" },
  { p: /\basos\b/i, d: "asos.com" },
  { p: /\bzara\b/i, d: "zara.com" },
  { p: /\bh&m\b|h\s*&\s*m/i, d: "hm.com" },
  { p: /\bprimark/i, d: "primark.com" },
  { p: /\bnike\b/i, d: "nike.com" },
  { p: /\badidas/i, d: "adidas.co.uk" },
  { p: /\buniqlo/i, d: "uniqlo.com" },
  { p: /\bjohn\s*lewis/i, d: "johnlewis.com" },
  { p: /\bargos\b/i, d: "argos.co.uk" },
  { p: /\bcurrys/i, d: "currys.co.uk" },
  { p: /\bikea\b/i, d: "ikea.com" },
  { p: /\bapple\b/i, d: "apple.com" },
  { p: /\bsamsung/i, d: "samsung.com" },
  { p: /\bboots\b/i, d: "boots.com" },
  { p: /\bsuperdrug/i, d: "superdrug.com" },
  { p: /\btk\s*maxx/i, d: "tkmaxx.com" },
  { p: /\bnext\s*(retail|store|plc|direct)/i, d: "next.co.uk" },
  { p: /\bselfridges/i, d: "selfridges.com" },
  { p: /\bharrods/i, d: "harrods.com" },
  // Entertainment & Subscriptions
  { p: /\bnetflix/i, d: "netflix.com" },
  { p: /\bspotify/i, d: "spotify.com" },
  { p: /\bdisney/i, d: "disneyplus.com" },
  { p: /\bodeon/i, d: "odeon.co.uk" },
  { p: /\bcineworld/i, d: "cineworld.co.uk" },
  { p: /\bvue\b/i, d: "myvue.com" },
  { p: /\bplaystation/i, d: "playstation.com" },
  { p: /\bxbox\b/i, d: "xbox.com" },
  { p: /\bsteam\b/i, d: "store.steampowered.com" },
  { p: /\byoutube/i, d: "youtube.com" },
  { p: /\btwitch/i, d: "twitch.tv" },
  { p: /\bpatreon/i, d: "patreon.com" },
  { p: /\bnotion\b/i, d: "notion.so" },
  { p: /\bfigma\b/i, d: "figma.com" },
  { p: /\badobe\b/i, d: "adobe.com" },
  { p: /\bmicrosoft/i, d: "microsoft.com" },
  { p: /\bicloud/i, d: "icloud.com" },
  { p: /\bgoogle\b/i, d: "google.com" },
  { p: /\bemma\b/i, d: "emma-app.com" },
  { p: /\bchatgpt/i, d: "openai.com" },
  { p: /\bgithub/i, d: "github.com" },
  { p: /\bdropbox/i, d: "dropbox.com" },
  { p: /\b1password/i, d: "1password.com" },
  { p: /\bnordvpn/i, d: "nordvpn.com" },
  { p: /\bsky\b/i, d: "sky.com" },
  { p: /\bsubstack/i, d: "substack.com" },
  { p: /\bcruxcapital/i, d: "cruxcapital.com" },
  // Bills / Telecoms
  { p: /\bvirgin\s*media/i, d: "virginmedia.com" },
  { p: /\bbt\s*(broadband|sport|group|phone|mobile)/i, d: "bt.com" },
  { p: /\bvodafone/i, d: "vodafone.co.uk" },
  { p: /\bee\s*(mobile|phone|ltd)/i, d: "ee.co.uk" },
  { p: /\bthree\s*(mobile|uk)/i, d: "three.co.uk" },
  { p: /\bo2\s*(uk|mobile)/i, d: "o2.co.uk" },
  { p: /\btalktalk/i, d: "talktalk.co.uk" },
  { p: /\bbritish\s*gas/i, d: "britishgas.co.uk" },
  { p: /\boctopus\s*energy/i, d: "octopus.energy" },
  { p: /\bovo\s*energy/i, d: "ovoenergy.com" },
  // Travel
  { p: /\bairbnb/i, d: "airbnb.co.uk" },
  { p: /\bbooking\b/i, d: "booking.com" },
  { p: /\bexpedia/i, d: "expedia.co.uk" },
  { p: /\bryanair/i, d: "ryanair.com" },
  { p: /\beasyjet/i, d: "easyjet.com" },
  { p: /\bbritish\s*air/i, d: "britishairways.com" },
  { p: /\bskyscanner/i, d: "skyscanner.net" },
  // Finance / Banks
  { p: /\btrading\s*212/i, d: "trading212.com" },
  { p: /\binteractive\s*broker/i, d: "interactivebrokers.com" },
  { p: /\bibkr\b/i, d: "interactivebrokers.com" },
  { p: /\bkraken\b/i, d: "kraken.com" },
  { p: /\bcoinbase/i, d: "coinbase.com" },
  { p: /\bbinance/i, d: "binance.com" },
  { p: /\bfreetrade/i, d: "freetrade.io" },
  { p: /\bvanguard/i, d: "vanguardinvestor.co.uk" },
  { p: /\bhargreaves/i, d: "hl.co.uk" },
  { p: /\bseedrs/i, d: "seedrs.com" },
  { p: /\bcrowdcube/i, d: "crowdcube.com" },
  { p: /\bspendesk/i, d: "spendesk.com" },
  { p: /\bmonzo\b/i, d: "monzo.com" },
  { p: /\brevolut/i, d: "revolut.com" },
  { p: /\bwise\b/i, d: "wise.com" },
  { p: /\bstarling/i, d: "starlingbank.com" },
  { p: /\bchase\b/i, d: "chase.co.uk" },
  { p: /\bhsbc\b/i, d: "hsbc.co.uk" },
  { p: /\bbarclays/i, d: "barclays.co.uk" },
  { p: /\bnatwest/i, d: "natwest.com" },
  { p: /\blloyds/i, d: "lloydsbank.com" },
  { p: /\bnationwide/i, d: "nationwide.co.uk" },
  { p: /\bsantander/i, d: "santander.co.uk" },
  { p: /\bhalifax/i, d: "halifax.co.uk" },
  // Work / Tech
  { p: /\banthropic|claude\.ai/i, d: "anthropic.com" },
  { p: /\bopenai\b/i, d: "openai.com" },
  // Health
  { p: /\bspecsaver/i, d: "specsavers.co.uk" },
  { p: /\bpuregym/i, d: "puregym.com" },
  { p: /\bbupa\b/i, d: "bupa.co.uk" },
  // Other
  { p: /\brightmove/i, d: "rightmove.co.uk" },
  { p: /\bzoopla/i, d: "zoopla.co.uk" },
  { p: /\bhonest\s*(burger|group|limited|ltd)/i, d: "honestburgers.co.uk" },
];

// Cache for broken logo URLs to avoid retrying
const brokenLogos = new Set();

// Well-known merchant display names — override messy bank data
const MERCHANT_DISPLAY = [
  { p: /\btfl\b|transport\s*for\s*london/i, name: "Transport for London" },
  { p: /\bsainsbury/i, name: "Sainsbury's" },
  { p: /\btesco/i, name: "Tesco" },
  { p: /\bamazon/i, name: "Amazon" },
  { p: /\bapple\.com|apple\s*store/i, name: "Apple" },
  { p: /\bnetflix/i, name: "Netflix" },
  { p: /\bspotify/i, name: "Spotify" },
  { p: /\byoutube\s*premium/i, name: "YouTube Premium" },
  { p: /\bgoogle\s*youtube/i, name: "YouTube Premium" },
  { p: /\bgoogle\s*one/i, name: "Google One" },
  { p: /\bgoogle\s*storage/i, name: "Google Storage" },
  { p: /\bdeliveroo/i, name: "Deliveroo" },
  { p: /\buber\s*eats/i, name: "Uber Eats" },
  { p: /\bjust\s*eat/i, name: "Just Eat" },
  { p: /\btrading\s*212/i, name: "Trading 212" },
  { p: /\binteractive\s*broker/i, name: "Interactive Brokers" },
  { p: /\bseedr/i, name: "Seedrs" },
  { p: /\bmonzo\b/i, name: "Monzo" },
  { p: /\brevolut/i, name: "Revolut" },
  { p: /\bhsbc\b/i, name: "HSBC" },
  { p: /\bbarclays/i, name: "Barclays" },
  { p: /\bchase\b/i, name: "Chase" },
  { p: /\bwise\b/i, name: "Wise" },
  { p: /\bstarling/i, name: "Starling" },
  { p: /\bnationwide/i, name: "Nationwide" },
  { p: /\banthropic|claude\.ai/i, name: "Anthropic (Claude)" },
  { p: /\bopenai|chatgpt/i, name: "OpenAI" },
  { p: /\bplaystation/i, name: "PlayStation" },
  { p: /\bmarugame/i, name: "Marugame Udon" },
  { p: /\bdishoom/i, name: "Dishoom" },
  { p: /\bhonest\s*(burger|group|limited|ltd)/i, name: "Honest Burgers" },
  { p: /\bleon\b/i, name: "Leon" },
  { p: /\bodeon/i, name: "Odeon" },
  { p: /\bpret\b/i, name: "Pret A Manger" },
  { p: /\bstarbucks/i, name: "Starbucks" },
  { p: /\bcosta\b/i, name: "Costa Coffee" },
  { p: /\bmcdonald/i, name: "McDonald's" },
  { p: /\bnando/i, name: "Nando's" },
  { p: /\bgreggs/i, name: "Greggs" },
  { p: /\bwagamama/i, name: "Wagamama" },
  { p: /\bikea/i, name: "IKEA" },
  { p: /\bemma\b/i, name: "Emma" },
  { p: /\bboots\b/i, name: "Boots" },
  { p: /\bgross\s*interest/i, name: "Bank Interest" },
  { p: /\bemergency\s*fund/i, name: "Emergency Fund" },
  { p: /\bpayment\s*-?\s*thank/i, name: "Card Payment" },
  { p: /\bsubstack/i, name: "Substack" },
  { p: /\bcruxcapital/i, name: "Cruxcapital" },
  { p: /\bregal\s*gaming/i, name: "Regal Gaming" },
  { p: /\bowl\s*and\s*hitchhiker/i, name: "Owl & Hitchhiker" },
  { p: /\bsalad\s*projects/i, name: "Salad Projects" },
  { p: /\bsimmons\s*bar/i, name: "Simmons Bar" },
  { p: /\blanzhou/i, name: "Lanzhou Lamian Noodle" },
  { p: /\baxa\b/i, name: "AXA" },
  { p: /\beyes\s*on\s*broadway/i, name: "Eyes on Broadway" },
];

// Clean up messy TrueLayer merchant names for display
function cleanMerchantName(raw) {
  if (!raw) return raw;

  // 1. Try well-known display names first
  for (const rule of MERCHANT_DISPLAY) {
    if (rule.p.test(raw)) return rule.name;
  }

  // 2. General cleanup for unknown merchants
  let name = raw;
  name = name.replace(/\b(VSA?\d{4,}[\d*]*\S*)/gi, "");
  name = name.replace(/\bU?\d{8,}\b/g, ""); // reference numbers (U23466455)
  name = name.replace(/\bObah[a-z0-9]+/gi, "");
  name = name.replace(/\s*(GB|IE|US|UK|FR|DE|NL|LU|CH)\s*$/i, "");
  name = name.replace(/\s*(CD|CP)\s+\d+/gi, "");
  name = name.replace(/\*+/g, "");
  name = name.replace(/\s*\/\s*(CP|CD|CF|BILL)\s*/gi, " ");
  name = name.replace(/\s+CH\s+/gi, " ");
  name = name.replace(/LIM\w*$/i, "");
  // Remove city names
  name = name.replace(/\s+(London|Manchester|Birmingham|Leeds|Bristol|Edinburgh|Glasgow|Liverpool|Sheffield|Leicester|Oxford|Cambridge|Brighton|Nottingham|Cardiff|Belfast|York|Bath|Reading|Southampton)\b/gi, "");
  // Remove legal suffixes
  name = name.replace(/\s+(Limited|Ltd|PLC|Inc|Corp|UK|Group|Holdings|Services|International|Europe)\b\.?/gi, "");
  name = name.replace(/\s+S$/i, ""); // trailing S
  name = name.replace(/\s+\d{1,5}\s*$/, ""); // trailing numbers
  name = name.replace(/\s+To\s+\d{1,2}\w{3}\d{4}/gi, ""); // date refs
  name = name.replace(/\s+-\s*$/, ""); // trailing dash
  name = name.replace(/\s*\.\s*$/, ""); // trailing dot
  name = name.replace(/\s{2,}/g, " ").trim();
  // Title case if ALL CAPS
  if (name === name.toUpperCase() && name.length > 3) {
    name = name.replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }
  return name || raw;
}

function getMerchantLogo(merchantName, rawMerchant) {
  if (!merchantName && !rawMerchant) return null;
  const combinedText = `${merchantName || ""} ${rawMerchant || ""}`;

  // Brandfetch CDN — high-quality full-size brand logos (500k req/mo free)
  // Returns actual brand logos, not tiny favicons
  for (const rule of MERCHANT_LOGO_RULES) {
    if (rule.p.test(combinedText)) {
      const url = `https://cdn.brandfetch.io/${rule.d}`;
      if (!brokenLogos.has(url)) return url;
    }
  }

  // Try to extract domain from raw text (e.g., "APPLE.COM/BILL" → apple.com)
  const raw = (rawMerchant || merchantName || "").toLowerCase();
  const domainMatch = raw.match(/([a-z0-9-]+\.(com|co\.uk|org|io|net|gov\.uk))/);
  if (domainMatch) {
    const url = `https://cdn.brandfetch.io/${domainMatch[1]}`;
    if (!brokenLogos.has(url)) return url;
  }

  return null;
}

// Deterministic color from string — consistent per merchant
const LETTER_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e",
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
];
function merchantColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return LETTER_COLORS[Math.abs(hash) % LETTER_COLORS.length];
}

// Logo component — full-bleed logo filling the circle, letter fallback
function MerchantIcon({ merchant, rawMerchant, categoryId, size = 44 }) {
  const [imgState, setImgState] = useState("loading"); // loading | loaded | failed
  const logoUrl = useMemo(() => getMerchantLogo(merchant, rawMerchant), [merchant, rawMerchant]);

  const initial = (merchant || "?").replace(/^[^a-zA-Z]*/, "").charAt(0).toUpperCase() || "?";
  const bgColor = merchantColor(merchant);

  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2, flexShrink: 0,
      background: imgState === "loaded" ? "transparent" : bgColor,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.42, fontWeight: 700, color: "#fff",
      position: "relative", overflow: "hidden",
    }}>
      {imgState !== "loaded" && initial}
      {logoUrl && imgState !== "failed" && (
        <img
          src={logoUrl}
          alt=""
          width={size}
          height={size}
          style={{
            position: "absolute", inset: 0,
            width: size, height: size,
            objectFit: "cover", display: "block",
            borderRadius: size / 2,
            opacity: imgState === "loaded" ? 1 : 0,
            transition: "opacity 0.2s ease",
          }}
          onLoad={() => setImgState("loaded")}
          onError={() => { brokenLogos.add(logoUrl); setImgState("failed"); }}
          loading="lazy"
        />
      )}
    </div>
  );
}

// ── Auto-categorization ──────────────────────────────
// Bank / fintech names — payments TO these are inter-account transfers, not spending
// Uses \b word boundary instead of ^ to match "HSBC BNK" or "Wise London" etc.
const BANK_NAMES = /\b(wise|revolut|monzo|starling|chase\b|hsbc|barclays|natwest|lloyds|nationwide|santander|halifax|first\s*direct|metro\s*bank|virgin\s*money|atom\s*bank|tsb\b|rbs\b|clydesdale|yorkshire|co-?operative\s*bank|triodos|n26\b|bunq|tide\b|cashplus|pockit|loot\b|curve\b|plum\b|chip\b|moneybox|nutmeg|wealthify|pensionbee)\b/i;

// Transaction description patterns that indicate transfers
const TRANSFER_DESC = /transfer|faster\s*payment|standing\s*order|direct\s*debit\s*(to|from)|ft\s*-|fp\s*-|bacs\b|chaps\b|sort\s*code|account\s*(transfer|move)|own\s*account|savings?\s*(pot|goal|account)|pot\s|between\s*accounts|moving\s*money|internal|current\s*account|payment\s*(to|from)\s*(mr|ms|mrs|miss)|sent\s*from|emergency\s*fund|saver\b|payment\s*-\s*thank|\b\d{6}\s+\d{7,8}\b|internet\s*t|bnk\s|on\s*bns\s*saver|huu\s*nguyen|bill\s*nguyen/i;

const SPENDING_RULES = [
  // Housing — very specific
  { pattern: /rent|mortgage|rightmove|openrent|letting|housing\s*benefit/i, categoryId: "housing" },
  // Eating out
  { pattern: /pret|starbucks|costa|mcdonald|burger|nando|wagamama|pizza|kebab|sushi|cafe|coffee|restaurant|dining|deliveroo|uber\s*eats|just\s*eat|dine|grill|kitchen|bistro|brasserie|bar\s|pub\s|salad|greggs|subway|kfc|domino|five\s*guys|leon|itsu|wasabi|eat\b|food\s*hall|canteen|marugame|dishoom|chipotle|shake\s*shack|wingstop|popeyes|tortilla|gail|joe\s.*juice|caffe\s*nero|yo\s*sushi|honest\s*burger|pizza\s*(express|hut)|frankie|shake\s*shack|noodle|ramen|curry|thai|chinese\s*take|indian\s*take|fish\s*&?\s*chip/i, categoryId: "eating_out" },
  // Groceries
  { pattern: /tesco|sainsbury|asda|aldi|lidl|waitrose|morrisons|co-?op\s*(food|store)|ocado|marks.*spencer|m&s\s*food|grocery|supermarket|iceland\s*(food|store)|whole\s*foods/i, categoryId: "groceries" },
  // Transport
  { pattern: /tfl|uber(?!\s*eat)|bolt\s*(ride|taxi)|lime\s*(scoot|bike)|taxi|cab\s|train|rail|bus\s|parking|petrol|fuel|shell\s*(garage|station)|bp\s*(garage|station)|esso|car\s*wash|congestion|oyster|citymapper|trainline|national\s*rail|south\s*western|greater\s*anglia|avanti/i, categoryId: "transport" },
  // Shopping
  { pattern: /amazon|ebay|asos|zara|h&m|primark|nike|adidas|uniqlo|john\s*lewis|argos|currys|ikea|apple\.(com|store)|google\s*store|samsung|boots|superdrug|tk\s*maxx|next\s|river\s*island|new\s*look|topshop|selfridges|harrods|liberty/i, categoryId: "shopping" },
  // Entertainment
  { pattern: /netflix|spotify|disney|cinema|odeon|cineworld|vue|gaming|playstation|xbox|steam|twitch|youtube|apple\s*tv|prime\s*video|sky\s*(tv|go)|now\s*tv|theatre|concert|ticket|gig\s|event|bowling|laser|escape\s*room/i, categoryId: "entertainment" },
  // Subscriptions
  { pattern: /subscri|membership|annual\s*fee|monthly\s*fee|patreon|substack|cruxcapital|notion|figma|adobe|microsoft\s*365|icloud|google\s*one|emma\b|monzo\s*plus|revolut\s*premium|chatgpt|claude|openai|anthropic|github|dropbox|1password|lastpass|nordvpn|express\s*vpn/i, categoryId: "subscriptions" },
  // Bills — only match specific utility/telecoms, NOT bank names
  { pattern: /electric|gas\s*(bill|energy)|water\s*(bill|rate)|council\s*tax|internet\s*(bill|provider)|broadband|phone\s*bill|mobile\s*bill|insurance|tv\s*licen|virgin\s*media|bt\s*(broadband|sport|phone|mobile|group)|ee\s*(mobile|phone|ltd)|vodafone\s*(uk|bill|mobile)|three\s*(mobile|uk)|o2\s*(uk|mobile)|sky\s*(broadband|tv)|talktalk|british\s*gas|edf|eon|sse|octopus\s*energy|bulb|ovo\s*energy|scottish\s*power|thames\s*water|severn\s*trent|united\s*utilities|anglian\s*water/i, categoryId: "bills" },
  // Health
  { pattern: /pharmacy|chemist|doctor|dentist|hospital|optical|optician|specsaver|gym|fitness|health|puregym|david\s*lloyd|virgin\s*active|nuffield|bupa|eyes\s*on\s*broadway/i, categoryId: "personal_care" },
  // Family
  { pattern: /family|transfer.*viet|remittance|wise.*vn|moneygram|western\s*union|world\s*remit/i, categoryId: "family" },
  // Travel
  { pattern: /flight|hotel|airbnb|booking\.com|expedia|travel|airport|airline|ryanair|easyjet|british\s*air|skyscanner|trivago|hostel|luggage/i, categoryId: "work_travel" },
  // Investment platforms (outgoing = investing)
  { pattern: /trading\s*212|t212|ibkr|interactive\s*broker|kraken|coinbase|binance|freetrade|vanguard|hargreaves|aj\s*bell|republic|seedrs|crowdcube|nutmeg|wealthify|pensionbee|moneybox/i, categoryId: "investment" },
];

// Income patterns
const INCOME_PATTERN = /salary|payroll|wages|dividend|refund|cashback|interest\s*(paid|to)|gross\s*interest|freelance|seedrs|spendesk|crowdcube|republic|bonus|commission|reward|compensation|settlement/i;

function categorize(merchantName, description, tlCategory, amount) {
  const text = `${merchantName || ""} ${description || ""}`.toLowerCase();
  const merchant = (merchantName || "").toLowerCase().trim();

  // ── POSITIVE amounts (money IN) ──
  if (amount > 0) {
    if (INCOME_PATTERN.test(text)) return "income";
    return "transfer"; // default: most credits are inter-account moves
  }

  // ── NEGATIVE amounts (money OUT) ──
  // Priority order: Transfer detection → Spending rules → TL fallback

  // 1. TrueLayer explicitly says TRANSFER → trust it
  if (tlCategory === "TRANSFER") return "transfer";

  // 2. Merchant name or description mentions a bank/fintech → transfer
  if (BANK_NAMES.test(text)) return "transfer";

  // 3. Description indicates transfer
  if (TRANSFER_DESC.test(text)) return "transfer";

  // 4. Spending category rules
  for (const rule of SPENDING_RULES) {
    if (rule.pattern.test(text)) return rule.categoryId;
  }

  // 5. TrueLayer category fallback
  if (tlCategory === "BILL_PAYMENT") return "bills";
  if (tlCategory === "PURCHASE") return "shopping";
  return "general";
}

// ── TrueLayer helpers ────────────────────────────────
function mapTx(tx, accountName) {
  const amount = tx.transaction_type === "DEBIT" ? -Math.abs(tx.amount) : Math.abs(tx.amount);
  const ts = new Date(tx.timestamp);
  const rawMerchant = tx.merchant_name || tx.description || "Unknown";
  const catId = categorize(rawMerchant, tx.description, tx.transaction_category, amount);
  // Debug
  console.log(`[${amount > 0 ? "IN" : "OUT"}] ${rawMerchant.substring(0, 35)} | £${Math.abs(amount).toFixed(2)} | TL_cat=${tx.transaction_category} | -> ${catId}`);
  return {
    id: `tl_${tx.transaction_id}`,
    date: ts.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    fullDate: ts.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    timestamp: ts.getTime(),
    merchant: cleanMerchantName(rawMerchant),
    rawMerchant,
    amount,
    categoryId: catId,
    pending: tx.transaction_classification?.includes("PENDING") || false,
    source: "truelayer",
    accountName: accountName || "Bank",
  };
}

async function startBankConnect() {
  const res = await fetch("/api/connect");
  const { url } = await res.json();
  window.location.href = url;
}

// Auto-refresh: if a request returns 401/token_expired, refresh and retry once
async function tlFetch(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();

  if (res.status === 401 || data.error === "token_expired") {
    // Try refreshing
    const newToken = await refreshAccessToken(token);
    if (newToken) {
      const retry = await fetch(url, { headers: { Authorization: `Bearer ${newToken}` } });
      return { data: await retry.json(), newToken };
    }
    return { data: { error: "token_expired" }, newToken: null };
  }
  return { data, newToken: null };
}

async function refreshAccessToken(oldToken) {
  try {
    const res = await fetch("/api/refresh", {
      method: "POST",
      headers: { Authorization: `Bearer ${oldToken}` },
    });
    const data = await res.json();
    if (data.access_token) {
      console.log("[TOKEN] Refreshed successfully");
      return data.access_token;
    }
    console.warn("[TOKEN] Refresh failed:", data.message);
    return null;
  } catch (err) {
    console.warn("[TOKEN] Refresh error:", err.message);
    return null;
  }
}

async function fetchAccounts(token) { return tlFetch("/api/accounts", token); }
async function fetchBalance(token, accountId) { return tlFetch(`/api/accounts/${accountId}/balance`, token); }
async function fetchTransactions(token, accountId) { return tlFetch(`/api/accounts/${accountId}/transactions`, token); }
async function fetchCards(token) { return tlFetch("/api/cards", token); }
async function fetchCardBalance(token, cardId) { return tlFetch(`/api/cards/${cardId}/balance`, token); }
async function fetchCardTransactions(token, cardId) { return tlFetch(`/api/cards/${cardId}/transactions`, token); }

// ── Date helpers ────────────────────────────────────
const MONTHS_MAP = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
function parseTxDate(d) {
  const parts = d.split(" ");
  const now = new Date();
  return new Date(now.getFullYear(), MONTHS_MAP[parts[1]] ?? 0, parseInt(parts[0]) || 1);
}

function formatDateHeader(dateStr) {
  const d = parseTxDate(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
  const isYesterday = d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

// ── Main ──────────────────────────────────────────────
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [editingTx, setEditingTx] = useState(null);
  const [holdingsSort, setHoldingsSort] = useState("pnl_abs");

  // TrueLayer state
  const [tlTokens, setTlTokens] = useState(() => JSON.parse(localStorage.getItem("tl_tokens") || "[]"));
  const [tlAccounts, setTlAccounts] = useState([]);
  const [tlTransactions, setTlTransactions] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState(null);
  const [categoryOverrides, setCategoryOverrides] = useState(() => JSON.parse(localStorage.getItem("tl_cat_overrides") || "{}"));
  const [budgetOverrides, setBudgetOverrides] = useState(() => JSON.parse(localStorage.getItem("budget_overrides") || "{}"));
  const [editingBudget, setEditingBudget] = useState(null);
  const [analyticsRange, setAnalyticsRange] = useState("payday");
  const [recurring, setRecurring] = useState(() => JSON.parse(localStorage.getItem("recurring_items") || "null") || DEFAULT_RECURRING);
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [txSearch, setTxSearch] = useState("");
  const [analyticsView, setAnalyticsView] = useState("category");
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [showAccountFilter, setShowAccountFilter] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState(() => JSON.parse(localStorage.getItem("selected_accounts") || "null"));
  const [drillCategory, setDrillCategory] = useState(null);
  const [drillSource, setDrillSource] = useState("budget"); // "budget" or "analytics"
  const [txCategoryFilter, setTxCategoryFilter] = useState(null);
  const [customMonth, setCustomMonth] = useState(new Date().getMonth());
  const [customYear, setCustomYear] = useState(new Date().getFullYear());
  const [selectedTx, setSelectedTx] = useState(null); // transaction detail sheet
  const [refreshing, setRefreshing] = useState(false);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("tl_token");
    const error = params.get("tl_error");
    window.history.replaceState({}, "", window.location.pathname);
    if (token) {
      setTlTokens((prev) => {
        const updated = [...prev.filter((t) => t !== token), token];
        localStorage.setItem("tl_tokens", JSON.stringify(updated));
        return updated;
      });
    } else if (error) {
      setBankError(error);
    }
  }, []);

  // Helper: unwrap tlFetch result, update token if refreshed
  const unwrap = (result, token, tokenUpdates) => {
    if (result.newToken) {
      tokenUpdates.set(token, result.newToken);
    }
    return result.data;
  };

  // Fetch bank data with auto-refresh
  const loadBankData = useCallback(async () => {
    if (tlTokens.length === 0) return;
    setBankLoading(true);
    setBankError(null);
    const allAccounts = [];
    const allTxns = [];
    const tokenUpdates = new Map(); // old token → new token

    for (let token of tlTokens) {
      // Use refreshed token if we already got one this cycle
      if (tokenUpdates.has(token)) token = tokenUpdates.get(token);

      try {
        let accountsData;
        try { accountsData = unwrap(await fetchAccounts(token), token, tokenUpdates); } catch { accountsData = {}; }
        // Update token reference if it was refreshed
        if (tokenUpdates.has(token)) token = tokenUpdates.get(token);

        if (accountsData.error || accountsData.status === "Failed") {
          console.warn("Token issue:", accountsData.error);
          continue;
        }
        const accounts = accountsData.results || [];
        for (const acc of accounts) {
          try {
            const balData = unwrap(await fetchBalance(token, acc.account_id), token, tokenUpdates);
            const bal = balData.results?.[0];
            allAccounts.push({ ...acc, balance: bal?.current || 0, currency: bal?.currency || "GBP", source: "truelayer" });
          } catch { allAccounts.push({ ...acc, balance: 0, source: "truelayer" }); }
          try {
            const txData = unwrap(await fetchTransactions(token, acc.account_id), token, tokenUpdates);
            (txData.results || []).forEach((tx) => allTxns.push(mapTx(tx, acc.display_name)));
          } catch (e) { console.warn("Failed txns for", acc.display_name, e.message); }
        }

        let cardsData;
        try { cardsData = unwrap(await fetchCards(token), token, tokenUpdates); } catch { cardsData = {}; }
        const cards = cardsData.results || [];
        for (const card of cards) {
          try {
            const balData = unwrap(await fetchCardBalance(token, card.account_id), token, tokenUpdates);
            const bal = balData.results?.[0];
            allAccounts.push({
              ...card,
              display_name: card.display_name || card.card_type || "Credit Card",
              balance: -(bal?.current || 0),
              currency: bal?.currency || "GBP",
              type: "Credit Card",
              source: "truelayer",
            });
          } catch { allAccounts.push({ ...card, balance: 0, type: "Credit Card", source: "truelayer" }); }
          try {
            const txData = unwrap(await fetchCardTransactions(token, card.account_id), token, tokenUpdates);
            (txData.results || []).forEach((tx) => allTxns.push(mapTx(tx, card.display_name)));
          } catch { /* skip */ }
        }
      } catch (err) {
        console.warn("Bank data load error:", err.message);
      }
    }

    // Persist any refreshed tokens
    if (tokenUpdates.size > 0) {
      setTlTokens((prev) => {
        const updated = prev.map((t) => tokenUpdates.get(t) || t);
        localStorage.setItem("tl_tokens", JSON.stringify(updated));
        console.log(`[TOKEN] Updated ${tokenUpdates.size} token(s) in localStorage`);
        return updated;
      });
    }

    allTxns.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    if (allAccounts.length === 0 && tlTokens.length > 0) {
      setBankError("Bank connections expired. Disconnect and reconnect your banks.");
    }

    setTlAccounts(allAccounts);
    setTlTransactions(allTxns);
    setBankLoading(false);
  }, [tlTokens]);

  useEffect(() => { loadBankData(); }, [loadBankData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBankData();
    setRefreshing(false);
  }, [loadBankData]);

  const disconnectBank = () => {
    localStorage.removeItem("tl_tokens");
    setTlTokens([]);
    setTlAccounts([]);
    setTlTransactions([]);
  };

  // Merge accounts
  const bankAccounts = tlAccounts.map((acc) => ({
    name: acc.display_name || acc.provider?.display_name || "Bank Account",
    type: acc.type || "Bank",
    balance: acc.balance,
    change: null,
    currency: acc.currency || "GBP",
    source: "truelayer",
    provider: acc.provider?.display_name || acc.provider?.provider_id || "",
  }));

  const mergedAccounts = tlAccounts.length > 0
    ? [...ACCOUNTS.filter((a) => a.type !== "Bank"), ...bankAccounts]
    : ACCOUNTS;

  // Transactions — use live when connected, apply overrides
  const allTransactions = useMemo(() => {
    const txns = tlTransactions.length > 0 ? tlTransactions : [];
    return txns.map((t) => categoryOverrides[t.id] ? { ...t, categoryId: categoryOverrides[t.id] } : t);
  }, [tlTransactions, categoryOverrides]);

  const totalNetWorth = mergedAccounts.reduce((s, a) => s + a.balance, 0);
  const totalInvested = mergedAccounts.filter((a) => ["Brokerage", "ISA", "Private Equity", "Crypto"].includes(a.type)).reduce((s, a) => s + a.balance, 0);
  const totalCash = mergedAccounts.filter((a) => a.type === "Bank" || a.type === "Credit Card").reduce((s, a) => s + a.balance, 0);

  // Budget period: 27th of last month to 27th of this month
  const budgetCutoff = useMemo(() => {
    const now = new Date();
    const day = now.getDate();
    if (day >= 27) return new Date(now.getFullYear(), now.getMonth(), 27);
    return new Date(now.getFullYear(), now.getMonth() - 1, 27);
  }, []);

  const budgetEnd = useMemo(() => {
    const c = new Date(budgetCutoff);
    return new Date(c.getFullYear(), c.getMonth() + 1, 27);
  }, [budgetCutoff]);

  const budgetPeriodLabel = useMemo(() => {
    return `${budgetCutoff.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} - ${budgetEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
  }, [budgetCutoff, budgetEnd]);

  const periodTransactions = useMemo(() => {
    return allTransactions.filter((t) => parseTxDate(t.date) >= budgetCutoff);
  }, [allTransactions, budgetCutoff]);

  const income = useMemo(() => periodTransactions.filter((t) => t.amount > 0 && !EXCLUDED_FROM_INCOME.includes(t.categoryId)).reduce((s, t) => s + t.amount, 0), [periodTransactions]);
  const spending = useMemo(() => periodTransactions.filter((t) => t.amount < 0 && !EXCLUDED_FROM_SPENDING.includes(t.categoryId)).reduce((s, t) => s + Math.abs(t.amount), 0), [periodTransactions]);
  const netFlow = income - spending;
  const savingsRate = income > 0 ? Math.max(Math.min(Math.round(((income - spending) / income) * 100), 100), -100) : 0;

  MONTHLY_SAVINGS[MONTHLY_SAVINGS.length - 1].rate = savingsRate;

  const categorySpending = useMemo(() => {
    const map = {};
    periodTransactions.filter((t) => t.amount < 0 && !EXCLUDED_FROM_SPENDING.includes(t.categoryId)).forEach((t) => {
      if (!map[t.categoryId]) map[t.categoryId] = { total: 0, count: 0 };
      map[t.categoryId].total += Math.abs(t.amount);
      map[t.categoryId].count += 1;
    });
    return map;
  }, [periodTransactions]);

  const getBudget = (catId) => budgetOverrides[catId] ?? CATEGORIES.find((c) => c.id === catId)?.budget ?? 0;
  const budgetedCats = CATEGORIES.filter((c) => getBudget(c.id) > 0 && !EXCLUDED_FROM_SPENDING.includes(c.id));
  const totalBudget = budgetedCats.reduce((s, c) => s + getBudget(c.id), 0);
  // totalSpend = ALL spending in period (not just budgeted categories)
  const totalSpend = spending; // reuse the 'spending' variable computed above from periodTransactions
  const budgetedSpend = budgetedCats.reduce((s, c) => s + (categorySpending[c.id]?.total || 0), 0);
  const recurringTotal = recurring.reduce((s, r) => s + r.amount, 0);
  const committedCatIds = ["housing", "bills", "subscriptions", "family"];
  const committedSpend = budgetedCats.filter((c) => committedCatIds.includes(c.id)).reduce((s, c) => s + (categorySpending[c.id]?.total || 0), 0);
  const variableSpend = totalSpend - committedSpend;

  // Days calculation
  const daysInPeriod = useMemo(() => Math.ceil((budgetEnd - budgetCutoff) / 86400000), [budgetCutoff, budgetEnd]);
  const dayOfPeriod = useMemo(() => Math.ceil((new Date() - budgetCutoff) / 86400000), [budgetCutoff]);
  const daysLeft = Math.max(daysInPeriod - dayOfPeriod, 1);
  const dailyAllowance = Math.max((totalBudget - totalSpend) / daysLeft, 0);
  const spendingPace = daysInPeriod > 0 ? (totalSpend / dayOfPeriod) * daysInPeriod : 0; // projected spend at current pace

  const saveRecurring = (items) => { setRecurring(items); localStorage.setItem("recurring_items", JSON.stringify(items)); };
  const updateRecurringItem = (id, field, value) => {
    saveRecurring(recurring.map((r) => r.id === id ? { ...r, [field]: field === "amount" ? Number(value) : value } : r));
  };
  const deleteRecurringItem = (id) => saveRecurring(recurring.filter((r) => r.id !== id));
  const addRecurringItem = () => {
    const newItem = { id: `r${Date.now()}`, merchant: "New Item", amount: 0, categoryId: "general", frequency: "Monthly", nextDate: "" };
    saveRecurring([...recurring, newItem]);
    setEditingRecurring(newItem.id);
  };
  const saveBudget = (catId, amount) => {
    setBudgetOverrides((prev) => {
      const updated = { ...prev, [catId]: Number(amount) };
      localStorage.setItem("budget_overrides", JSON.stringify(updated));
      return updated;
    });
    setEditingBudget(null);
  };

  // Holdings
  const totalCurrentValue = HOLDINGS.reduce((s, h) => s + h.value, 0);
  const totalCostBasis = HOLDINGS.reduce((s, h) => s + h.costBasis, 0);
  const totalPnlAbs = totalCurrentValue - totalCostBasis;
  const totalPnlPct = totalCostBasis > 0 ? ((totalPnlAbs / totalCostBasis) * 100) : 0;
  const sortedHoldings = useMemo(() => {
    return [...HOLDINGS].sort((a, b) => {
      if (holdingsSort === "pnl_abs") return (b.value - b.costBasis) - (a.value - a.costBasis);
      if (holdingsSort === "pnl_pct") return b.pnl - a.pnl;
      if (holdingsSort === "value") return b.value - a.value;
      return 0;
    });
  }, [holdingsSort]);

  const handleCategoryChange = (txId, newCatId) => {
    if (String(txId).startsWith("tl_")) {
      setCategoryOverrides((prev) => {
        const updated = { ...prev, [txId]: newCatId };
        localStorage.setItem("tl_cat_overrides", JSON.stringify(updated));
        return updated;
      });
    }
    setEditingTx(null);
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "holdings", label: "Holdings" },
    { id: "transactions", label: "Txns" },
    { id: "budget", label: "Budget" },
    { id: "analytics", label: "Analytics" },
  ];

  const card = { padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.05)" };

  return (
    <div style={{ minHeight: "100vh", background: "#09090f", color: "#e4e4e7", fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 430, margin: "0 auto", paddingBottom: 90 }}>

      {/* Header */}
      <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 13, color: "#52525b", letterSpacing: "0.06em", fontWeight: 500 }}>BILL'S FINANCES</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2, letterSpacing: "-0.01em" }}>Dashboard</div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff" }}>B</div>
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {activeTab === "overview" && (
        <div style={{ padding: "0 20px" }}>
          {/* Net Worth Card */}
          <div style={{ margin: "20px 0 0", padding: 20, background: "linear-gradient(145deg, rgba(99,102,241,0.08) 0%, rgba(129,140,248,0.03) 100%)", border: "1px solid rgba(99,102,241,0.12)", borderRadius: 18 }}>
            <div style={{ fontSize: 12, color: "#71717a", letterSpacing: "0.05em", fontWeight: 500 }}>NET WORTH</div>
            <div style={{ fontSize: 34, fontWeight: 800, marginTop: 4, letterSpacing: "-0.02em", color: "#f4f4f5" }}>{"\u00A3"}{totalNetWorth.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              <span style={{ color: "#34d399", fontSize: 13, fontWeight: 600 }}>{"\u2191"} {"\u00A3"}2,226.75</span>
              <span style={{ color: "#71717a", fontSize: 13 }}>this month (+7.4%)</span>
            </div>
            <div style={{ marginTop: 14 }}><MiniChart data={NET_WORTH_HISTORY} width={340} height={50} /></div>
            <div style={{ display: "flex", gap: 12, marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#71717a" }}>Invested</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{"\u00A3"}{totalInvested.toLocaleString("en-GB")}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#71717a" }}>Cash</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{"\u00A3"}{totalCash.toLocaleString("en-GB")}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#71717a" }}>Alloc</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{totalNetWorth > 0 ? ((totalInvested / totalNetWorth) * 100).toFixed(0) : 0}% / {totalNetWorth > 0 ? ((totalCash / totalNetWorth) * 100).toFixed(0) : 0}%</div>
              </div>
            </div>
          </div>

          {/* Bank connect */}
          <div style={{ fontSize: 12, color: "#52525b", letterSpacing: "0.05em", fontWeight: 500, marginTop: 24, marginBottom: 10 }}>ACCOUNTS</div>
          {tlTokens.length > 0 && (
            <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, borderColor: "rgba(99,102,241,0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 6l7-3 7 3"/><line x1="4" y1="10" x2="4" y2="21"/><line x1="20" y1="10" x2="20" y2="21"/><line x1="8" y1="14" x2="8" y2="17"/><line x1="12" y1="14" x2="12" y2="17"/><line x1="16" y1="14" x2="16" y2="17"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#818cf8" }}>{tlTokens.length} Bank{tlTokens.length !== 1 ? "s" : ""} Connected</div>
                  <div style={{ fontSize: 11, color: "#52525b" }}>{tlAccounts.length} account{tlAccounts.length !== 1 ? "s" : ""} linked</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={loadBankData} disabled={bankLoading}
                  style={{ padding: "6px 10px", fontSize: 11, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#a1a1aa", cursor: "pointer" }}>
                  {bankLoading ? "..." : "\u21BB"}
                </button>
                <button onClick={disconnectBank}
                  style={{ padding: "6px 10px", fontSize: 11, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, color: "#ef4444", cursor: "pointer" }}>
                  {"\u2715"}
                </button>
              </div>
            </div>
          )}
          <button onClick={startBankConnect}
            style={{ width: "100%", padding: "13px 16px", marginBottom: 10, background: tlTokens.length > 0 ? "rgba(99,102,241,0.08)" : "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)", border: tlTokens.length > 0 ? "1px solid rgba(99,102,241,0.2)" : "none", borderRadius: 14, color: tlTokens.length > 0 ? "#818cf8" : "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span>+</span> {tlTokens.length > 0 ? "Add Another Bank" : "Connect Your Bank"}
          </button>
          {bankError && (
            <div style={{ ...card, marginBottom: 10, borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)", color: "#ef4444", fontSize: 12, padding: "12px 16px" }}>
              {"\u26A0"} {bankError}
            </div>
          )}

          {/* Account list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {mergedAccounts.map((acc, i) => {
              // Get logo for bank provider
              const providerLogo = acc.source === "truelayer" ? getMerchantLogo(acc.provider || acc.name, acc.name) : getMerchantLogo(acc.name, acc.name);
              return (
              <div key={acc.name + i} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <MerchantIcon merchant={acc.provider || acc.name} rawMerchant={acc.name} categoryId="general" size={38} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{acc.name}</div>
                    <div style={{ fontSize: 11, color: "#52525b", marginTop: 1 }}>
                      {acc.provider && acc.provider !== acc.name ? acc.provider : acc.type}
                      {acc.source === "truelayer" && <span style={{ marginLeft: 6, fontSize: 9, padding: "1px 5px", background: "rgba(99,102,241,0.12)", color: "#818cf8", borderRadius: 4, fontWeight: 600 }}>LIVE</span>}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{acc.currency === "USD" ? "$" : "\u00A3"}{acc.balance.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</div>
                  {acc.change !== null && acc.change !== 0 && <div style={{ fontSize: 11, color: acc.change >= 0 ? "#34d399" : "#ef4444", marginTop: 1 }}>{acc.change >= 0 ? "\u2191" : "\u2193"} {Math.abs(acc.change)}%</div>}
                </div>
              </div>
              );
            })}
          </div>

          {/* This month summary */}
          <div style={{ fontSize: 12, color: "#52525b", letterSpacing: "0.05em", fontWeight: 500, marginTop: 24, marginBottom: 10 }}>THIS PERIOD</div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ ...card, flex: 1, textAlign: "center", padding: "16px 8px" }}>
              <div style={{ fontSize: 11, color: "#71717a" }}>Income</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#34d399", marginTop: 6 }}>+{"\u00A3"}{fmt(income)}</div>
            </div>
            <div style={{ ...card, flex: 1, textAlign: "center", padding: "16px 8px" }}>
              <div style={{ fontSize: 11, color: "#71717a" }}>Spending</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#f472b6", marginTop: 6 }}>-{"\u00A3"}{fmt(spending)}</div>
            </div>
            <div style={{ ...card, flex: 1, textAlign: "center", padding: "16px 8px" }}>
              <div style={{ fontSize: 11, color: "#71717a" }}>Saved</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: netFlow >= 0 ? "#34d399" : "#ef4444", marginTop: 6 }}>{netFlow >= 0 ? "+" : ""}{"\u00A3"}{fmt(netFlow)}</div>
            </div>
          </div>

          {/* Savings Rate */}
          <div style={{ ...card, padding: 16, marginTop: 10, display: "flex", alignItems: "center", gap: 16 }}>
            <SavingsGauge rate={savingsRate} size={72} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {savingsRate >= 50 ? "Great savings rate!" : savingsRate >= 30 ? "Decent month" : savingsRate > 0 ? "Tight month" : "No income yet"}
              </div>
              <div style={{ fontSize: 12, color: "#71717a", marginTop: 4 }}>
                {income > 0 ? `${savingsRate}% of income saved` : "Connect your bank to track"}
              </div>
              <div style={{ display: "flex", gap: 3, marginTop: 10 }}>
                {MONTHLY_SAVINGS.map((m, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flex: 1 }}>
                    <div style={{
                      height: 20,
                      width: "100%",
                      borderRadius: 3,
                      background: `rgba(${m.rate >= 50 ? '52,211,153' : m.rate >= 30 ? '251,191,36' : '239,68,68'}, ${Math.max(m.rate / 100, 0.06)})`,
                    }} />
                    <span style={{ fontSize: 8, color: "#3f3f46" }}>{m.month}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ HOLDINGS ═══ */}
      {activeTab === "holdings" && (
        <div style={{ padding: "0 20px" }}>
          <div style={{ fontSize: 12, color: "#52525b", letterSpacing: "0.05em", fontWeight: 500, marginTop: 20, marginBottom: 10 }}>PORTFOLIO P&L</div>
          <div style={{ ...card, padding: 18, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div>
                <div style={{ fontSize: 11, color: "#71717a" }}>Current Value</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2 }}>{"\u00A3"}{totalCurrentValue.toLocaleString("en-GB")}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#71717a" }}>Total P&L</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: totalPnlAbs >= 0 ? "#34d399" : "#ef4444", marginTop: 2 }}>
                  {totalPnlAbs >= 0 ? "+" : ""}{"\u00A3"}{totalPnlAbs.toFixed(0)}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: "#71717a" }}>Cost Basis</div><div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{"\u00A3"}{totalCostBasis.toLocaleString("en-GB")}</div></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: "#71717a" }}>Return</div><div style={{ fontSize: 14, fontWeight: 600, color: totalPnlPct >= 0 ? "#34d399" : "#ef4444", marginTop: 2 }}>{totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(1)}%</div></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: "#71717a" }}>Positions</div><div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{HOLDINGS.length}</div></div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {[{ id: "pnl_abs", label: "P&L (\u00A3)" }, { id: "pnl_pct", label: "P&L (%)" }, { id: "value", label: "Value" }].map((s) => (
              <button key={s.id} onClick={() => setHoldingsSort(s.id)}
                style={{ padding: "6px 12px", fontSize: 11, border: "none", borderRadius: 8, cursor: "pointer",
                  background: holdingsSort === s.id ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
                  color: holdingsSort === s.id ? "#818cf8" : "#71717a", fontWeight: holdingsSort === s.id ? 600 : 400 }}>
                {s.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sortedHoldings.map((h) => {
              const pnlAbs = h.value - h.costBasis;
              return (
                <div key={h.ticker} style={{ ...card }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", background: "rgba(99,102,241,0.12)", padding: "2px 7px", borderRadius: 5 }}>{h.ticker}</span>
                          <span style={{ fontSize: 13, color: "#a1a1aa" }}>{h.name}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "#3f3f46", marginTop: 3 }}>{h.account === "T212" ? "Trading 212" : h.account}</div>
                      </div>
                    </div>
                    <Sparkline data={h.sparkline} width={56} height={22} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <div><div style={{ fontSize: 10, color: "#3f3f46" }}>Value</div><div style={{ fontSize: 13, fontWeight: 600 }}>{"\u00A3"}{h.value.toLocaleString()}</div></div>
                    <div><div style={{ fontSize: 10, color: "#3f3f46" }}>Cost</div><div style={{ fontSize: 13, fontWeight: 500, color: "#71717a" }}>{"\u00A3"}{h.costBasis.toLocaleString()}</div></div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#3f3f46" }}>P&L</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: pnlAbs >= 0 ? "#34d399" : "#ef4444" }}>
                        {pnlAbs >= 0 ? "+" : ""}{"\u00A3"}{pnlAbs.toFixed(0)} ({h.pnl >= 0 ? "+" : ""}{h.pnl}%)
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ TRANSACTIONS ═══ */}
      {activeTab === "transactions" && (() => {
        const uniqueCats = [...new Set(allTransactions.map(t => t.categoryId))].map(id => getCat(id));
        const filtered = allTransactions.filter((t) => {
          if (txSearch && !t.merchant.toLowerCase().includes(txSearch.toLowerCase())) return false;
          if (selectedAccounts && selectedAccounts.length > 0 && t.accountName && !selectedAccounts.includes(t.accountName)) return false;
          if (txCategoryFilter && t.categoryId !== txCategoryFilter) return false;
          return true;
        });
        const groups = {};
        filtered.forEach((t) => {
          const key = t.date;
          if (!groups[key]) groups[key] = { txns: [], total: 0 };
          groups[key].txns.push(t);
          groups[key].total += t.amount;
        });
        const dateKeys = Object.keys(groups);

        return (
        <div style={{ padding: "0 20px" }}>
          {/* Header */}
          <div style={{ fontSize: 26, fontWeight: 800, padding: "20px 0 4px", letterSpacing: "-0.02em" }}>Transactions</div>

          {/* Search bar — clean Revolut style */}
          <div style={{ marginTop: 16, marginBottom: 20 }}>
            <div style={{ position: "relative" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input placeholder="Search" value={txSearch} onChange={(e) => setTxSearch(e.target.value)}
                style={{ width: "100%", padding: "12px 12px 12px 42px", background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 14, color: "#e4e4e7", fontSize: 15, outline: "none" }} />
              {/* Filter buttons */}
              <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 4 }}>
                {txCategoryFilter && (
                  <button onClick={() => setTxCategoryFilter(null)}
                    style={{ padding: "4px 10px", fontSize: 11, border: "none", borderRadius: 8, cursor: "pointer",
                      background: `${getCat(txCategoryFilter).color}20`, color: getCat(txCategoryFilter).color, fontWeight: 600 }}>
                    {getCat(txCategoryFilter).icon} {"\u2715"}
                  </button>
                )}
                <button onClick={() => setShowAccountFilter(true)}
                  style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, cursor: "pointer" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Category filter chips — horizontal scroll */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none" }}>
            <button onClick={() => setTxCategoryFilter(null)}
              style={{ padding: "8px 16px", fontSize: 13, border: "none", borderRadius: 20, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                background: !txCategoryFilter ? "#e4e4e7" : "rgba(255,255,255,0.06)",
                color: !txCategoryFilter ? "#09090f" : "#71717a", fontWeight: 600 }}>
              All
            </button>
            {uniqueCats.map((cat) => (
              <button key={cat.id} onClick={() => setTxCategoryFilter(txCategoryFilter === cat.id ? null : cat.id)}
                style={{ padding: "8px 14px", fontSize: 13, border: "none", borderRadius: 20, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                  background: txCategoryFilter === cat.id ? cat.color : "rgba(255,255,255,0.06)",
                  color: txCategoryFilter === cat.id ? "#09090f" : "#71717a", fontWeight: txCategoryFilter === cat.id ? 700 : 500 }}>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Refresh bar */}
          {tlTokens.length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <button onClick={handleRefresh} disabled={refreshing}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 20px", background: "rgba(255,255,255,0.04)", border: "none", borderRadius: 20, cursor: "pointer", color: refreshing ? "#52525b" : "#71717a", fontSize: 13, fontWeight: 500 }}>
                <span style={{ display: "inline-block", transition: "transform 0.3s", transform: refreshing ? "rotate(360deg)" : "none" }}>{"\u21BB"}</span>
                {refreshing ? "Refreshing..." : "Pull to refresh"}
              </button>
            </div>
          )}

          {/* Transaction groups — Revolut style */}
          {dateKeys.map((date) => {
            const group = groups[date];
            return (
              <div key={date} style={{ marginBottom: 24 }}>
                {/* Date header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 0 12px" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#e4e4e7" }}>{formatDateHeader(date)}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: group.total >= 0 ? "#34d399" : "#52525b" }}>
                    {group.total >= 0 ? "+" : "-"}{"\u00A3"}{fmtSmart(group.total)}
                  </span>
                </div>
                {/* Transaction rows */}
                <div style={{ background: "rgba(255,255,255,0.025)", borderRadius: 16, overflow: "hidden" }}>
                  {group.txns.map((tx, i) => {
                    const cat = getCat(tx.categoryId);
                    let time = "";
                    if (tx.timestamp) {
                      const d = new Date(tx.timestamp);
                      if (d.getHours() >= 2) time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                    }
                    const isExcluded = EXCLUDED_FROM_SPENDING.includes(tx.categoryId);
                    return (
                      <div key={tx.id}
                        onClick={() => setEditingTx(tx.id)}
                        style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: i < group.txns.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", cursor: "pointer", opacity: tx.pending ? 0.6 : 1 }}>
                        <MerchantIcon merchant={tx.merchant} rawMerchant={tx.rawMerchant} categoryId={tx.categoryId} size={44} />
                        <div style={{ flex: 1, marginLeft: 14, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 15, fontWeight: 500, color: "#f4f4f5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.merchant}</span>
                            {tx.pending && <span style={{ fontSize: 9, fontWeight: 600, color: "#fbbf24", background: "rgba(251,191,36,0.12)", padding: "1px 6px", borderRadius: 4, flexShrink: 0 }}>PENDING</span>}
                          </div>
                          <div style={{ fontSize: 12, color: "#52525b", marginTop: 3 }}>{time || cat.label}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: tx.amount >= 0 ? "#34d399" : "#e4e4e7" }}>
                            {tx.amount >= 0 ? "+" : "-"}{"\u00A3"}{fmtSmart(tx.amount)}
                          </div>
                          {isExcluded && <div style={{ fontSize: 10, color: "#52525b", marginTop: 2 }}>Excluded</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#3f3f46" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>{"\u{1F4B3}"}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#71717a" }}>{allTransactions.length === 0 ? "No transactions yet" : "No matching transactions"}</div>
              <div style={{ fontSize: 13, marginTop: 6, color: "#3f3f46" }}>{allTransactions.length === 0 ? "Connect your bank to see transactions" : "Try adjusting your search or filters"}</div>
            </div>
          )}
        </div>
        );
      })()}

      {/* ═══ BUDGET ═══ */}
      {activeTab === "budget" && (
        <div style={{ padding: "0 20px" }}>
          {/* Period badge */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "20px 0 16px" }}>
            <div style={{ padding: "7px 18px", background: "rgba(99,102,241,0.1)", borderRadius: 20, fontSize: 13, color: "#818cf8", fontWeight: 500 }}>
              {budgetPeriodLabel}
            </div>
          </div>

          {/* Donut chart with multi-segment */}
          <div style={{ ...card, padding: "24px 16px", marginBottom: 14, textAlign: "center" }}>
            <DonutChart
              segments={[
                ...budgetedCats.filter(c => categorySpending[c.id]?.total > 0).map(c => ({
                  value: categorySpending[c.id]?.total || 0,
                  color: c.color,
                })),
                ...(totalBudget > totalSpend ? [{ value: totalBudget - totalSpend, color: "rgba(255,255,255,0.04)" }] : []),
              ]}
              centerAmount={totalSpend > totalBudget
                ? `\u00A3${fmt(totalSpend - totalBudget)}`
                : `\u00A3${fmt(totalBudget - totalSpend)}`
              }
              centerLabel={totalSpend > totalBudget ? "over budget" : `left of \u00A3${totalBudget.toFixed(0)}`}
              size={200}
            />

            {/* Legend */}
            <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#818cf8" }} />
                <div style={{ fontSize: 12, color: "#a1a1aa" }}>Spent {"\u00A3"}{fmt(variableSpend)}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#c084fc" }} />
                <div style={{ fontSize: 12, color: "#a1a1aa" }}>Committed {"\u00A3"}{fmt(committedSpend)}</div>
              </div>
            </div>
          </div>

          {/* Daily allowance + pace */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <div style={{ ...card, flex: 1, padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#71717a", marginBottom: 6 }}>Daily Budget</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: dailyAllowance > 15 ? "#34d399" : dailyAllowance > 0 ? "#fbbf24" : "#ef4444" }}>
                {"\u00A3"}{dailyAllowance.toFixed(2)}
              </div>
              <div style={{ fontSize: 11, color: "#52525b", marginTop: 4 }}>{daysLeft} days left</div>
            </div>
            <div style={{ ...card, flex: 1, padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#71717a", marginBottom: 6 }}>Spending Pace</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: spendingPace <= totalBudget ? "#34d399" : "#ef4444" }}>
                {spendingPace <= totalBudget ? "On Track" : "Over"}
              </div>
              <div style={{ fontSize: 11, color: "#52525b", marginTop: 4 }}>
                {dayOfPeriod > 0 ? `\u00A3${(totalSpend / dayOfPeriod).toFixed(0)}/day avg` : ""}
              </div>
            </div>
          </div>

          {/* Recurring */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, marginTop: 20 }}>
            <div style={{ fontSize: 12, color: "#52525b", letterSpacing: "0.05em", fontWeight: 500 }}>RECURRING</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#71717a", fontSize: 12, fontWeight: 500 }}>{"\u00A3"}{recurringTotal.toFixed(2)}/mo</span>
              <button onClick={() => setEditingRecurring(editingRecurring === "all" ? null : "all")}
                style={{ background: "none", border: "none", color: "#818cf8", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                {editingRecurring === "all" ? "Done" : "Edit"}
              </button>
            </div>
          </div>
          <div style={{ ...card, padding: 0, overflow: "hidden", marginBottom: 14 }}>
            {recurring.map((r, i) => {
              const cat = getCat(r.categoryId);
              return (
                <div key={r.id} style={{ display: "flex", alignItems: "center", padding: "13px 16px", borderBottom: i < recurring.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                  <MerchantIcon merchant={r.merchant} categoryId={r.categoryId} size={38} />
                  <div style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                    {editingRecurring === "all" ? (
                      <input defaultValue={r.merchant} onBlur={(e) => updateRecurringItem(r.id, "merchant", e.target.value)}
                        style={{ width: "100%", padding: "2px 4px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, color: "#e4e4e7", fontSize: 14 }} />
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{r.merchant}</div>
                    )}
                    <div style={{ fontSize: 11, color: "#3f3f46", marginTop: 2 }}>{r.frequency}{r.nextDate ? ` \u00B7 ${r.nextDate}` : ""}</div>
                  </div>
                  {editingRecurring === "all" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 12, color: "#52525b" }}>{"\u00A3"}</span>
                      <input type="number" defaultValue={r.amount} onBlur={(e) => updateRecurringItem(r.id, "amount", e.target.value)}
                        style={{ width: 60, padding: "4px 6px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, color: "#e4e4e7", fontSize: 13, textAlign: "right" }} />
                      <button onClick={() => deleteRecurringItem(r.id)}
                        style={{ background: "none", border: "none", color: "#ef4444", fontSize: 14, cursor: "pointer", padding: "0 2px" }}>{"\u2715"}</button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#a1a1aa" }}>{"\u00A3"}{r.amount.toFixed(2)}</div>
                  )}
                </div>
              );
            })}
          </div>
          {editingRecurring === "all" && (
            <button onClick={addRecurringItem}
              style={{ width: "100%", padding: "12px", marginBottom: 14, background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 14, color: "#818cf8", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
              + Add recurring item
            </button>
          )}

          {/* Category budgets */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, marginTop: 20 }}>
            <div style={{ fontSize: 12, color: "#52525b", letterSpacing: "0.05em", fontWeight: 500 }}>CATEGORY BUDGETS</div>
            <button onClick={() => setEditingBudget(editingBudget === "all" ? null : "all")}
              style={{ background: "none", border: "none", color: "#818cf8", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
              {editingBudget === "all" ? "Done" : "Edit"}
            </button>
          </div>
          <div style={{ ...card, padding: 0, overflow: "hidden" }}>
            {CATEGORIES.filter((c) => !EXCLUDED_FROM_SPENDING.includes(c.id))
              .sort((a, b) => (categorySpending[b.id]?.total || 0) - (categorySpending[a.id]?.total || 0))
              .map((cat, i, arr) => {
              const budget = getBudget(cat.id);
              const spent = categorySpending[cat.id]?.total || 0;
              const isOver = budget > 0 && spent > budget;
              const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
              if (!editingBudget && budget === 0 && spent === 0) return null;
              return (
                <div key={cat.id}
                  onClick={() => !editingBudget && spent > 0 && (() => { setDrillCategory(cat.id); setDrillSource("budget"); })()}
                  style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)", cursor: spent > 0 && !editingBudget ? "pointer" : "default" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${cat.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{cat.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{cat.label}</span>
                        {editingBudget === "all" ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 12, color: "#52525b" }}>{"\u00A3"}</span>
                            <input type="number" defaultValue={budget} onBlur={(e) => saveBudget(cat.id, e.target.value)}
                              style={{ width: 70, padding: "4px 6px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, color: "#e4e4e7", fontSize: 14, fontWeight: 600, textAlign: "right" }} />
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: isOver ? "#ef4444" : "#e4e4e7" }}>
                              {"\u00A3"}{fmt(spent)}
                            </span>
                            {spent > 0 && <span style={{ color: "#3f3f46", fontSize: 14 }}>{"\u203A"}</span>}
                          </div>
                        )}
                      </div>
                      {budget > 0 && !editingBudget && (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                            <span style={{ fontSize: 11, color: isOver ? "#ef4444" : "#52525b" }}>
                              {isOver ? `\u00A3${fmt(spent - budget)} over` : `\u00A3${fmt(budget - spent)} left`}
                            </span>
                            <span style={{ fontSize: 11, color: "#3f3f46" }}>of {"\u00A3"}{budget}</span>
                          </div>
                          <div style={{ marginTop: 6, height: 4, background: "rgba(255,255,255,0.04)", borderRadius: 2 }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: isOver ? "#ef4444" : cat.color, borderRadius: 2, transition: "width 0.4s" }} />
                          </div>
                        </>
                      )}
                      {budget === 0 && !editingBudget && spent > 0 && (
                        <div style={{ fontSize: 11, color: "#3f3f46", marginTop: 2 }}>No budget set</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ ANALYTICS ═══ */}
      {activeTab === "analytics" && (() => {
        const now = new Date();
        const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        // Calculate cutoff dates based on selected range
        let cutoff, cutoffEnd = now;
        if (analyticsRange === "payday") {
          // 27th to 27th
          if (now.getDate() >= 27) {
            cutoff = new Date(now.getFullYear(), now.getMonth(), 27);
          } else {
            cutoff = new Date(now.getFullYear(), now.getMonth() - 1, 27);
          }
        } else if (analyticsRange === "month") {
          cutoff = new Date(customYear, customMonth, 1);
          cutoffEnd = new Date(customYear, customMonth + 1, 0, 23, 59, 59);
        } else if (analyticsRange === "90d") {
          cutoff = new Date(now.getTime() - 90 * 86400000);
        } else if (analyticsRange === "all") {
          cutoff = new Date(2020, 0, 1);
        } else {
          cutoff = new Date(now.getTime() - 30 * 86400000);
        }

        const filteredTxns = allTransactions.filter((t) => {
          const d = t.timestamp ? new Date(t.timestamp) : parseTxDate(t.date);
          if (selectedAccounts && selectedAccounts.length > 0 && t.accountName && !selectedAccounts.includes(t.accountName)) return false;
          return d >= cutoff && d <= cutoffEnd;
        });
        const spendTxns = filteredTxns.filter((t) => t.amount < 0 && !EXCLUDED_FROM_SPENDING.includes(t.categoryId));
        const incomeTxns = filteredTxns.filter((t) => t.amount > 0 && !EXCLUDED_FROM_INCOME.includes(t.categoryId));
        const fIncome = incomeTxns.reduce((s, t) => s + t.amount, 0);
        const fSpending = spendTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
        const fNet = fIncome - fSpending;

        const catMap = {};
        spendTxns.forEach((t) => {
          if (!catMap[t.categoryId]) catMap[t.categoryId] = { total: 0, count: 0 };
          catMap[t.categoryId].total += Math.abs(t.amount);
          catMap[t.categoryId].count += 1;
        });
        const sortedCats = CATEGORIES.filter((c) => catMap[c.id]).sort((a, b) => (catMap[b.id]?.total || 0) - (catMap[a.id]?.total || 0));

        const merchantMap = {};
        spendTxns.forEach((t) => {
          if (!merchantMap[t.merchant]) merchantMap[t.merchant] = { total: 0, count: 0, categoryId: t.categoryId };
          merchantMap[t.merchant].total += Math.abs(t.amount);
          merchantMap[t.merchant].count += 1;
        });
        const sortedMerchants = Object.entries(merchantMap).sort((a, b) => b[1].total - a[1].total);

        // Income by source
        const incomeMap = {};
        incomeTxns.forEach((t) => {
          const key = t.merchant;
          if (!incomeMap[key]) incomeMap[key] = { total: 0, count: 0 };
          incomeMap[key].total += t.amount;
          incomeMap[key].count += 1;
        });
        const sortedIncome = Object.entries(incomeMap).sort((a, b) => b[1].total - a[1].total);

        const daysInRange = Math.max(Math.ceil((cutoffEnd - cutoff) / 86400000), 1);
        const dailyAvg = fSpending / Math.min(daysInRange, 365);

        // Period label
        let periodLabel;
        if (analyticsRange === "payday") periodLabel = "Payday Period";
        else if (analyticsRange === "month") periodLabel = `${MONTH_NAMES[customMonth]} ${customYear}`;
        else if (analyticsRange === "90d") periodLabel = "Last 3 Months";
        else if (analyticsRange === "all") periodLabel = "All Time";
        else periodLabel = "Last 30 Days";

        const savingsRateAnalytics = fIncome > 0 ? Math.max(Math.min(Math.round((fNet / fIncome) * 100), 100), -100) : 0;

        return (
        <div style={{ padding: "0 20px" }}>
          {/* Period selector — Emma style horizontal scroll */}
          <div style={{ margin: "16px 0 4px" }}>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
              {[
                { id: "payday", label: "Payday" },
                { id: "month", label: "Monthly" },
                { id: "90d", label: "3 Months" },
                { id: "all", label: "All" },
              ].map((r) => (
                <button key={r.id} onClick={() => { setAnalyticsRange(r.id); setShowPeriodPicker(r.id === "month"); }}
                  style={{ padding: "8px 18px", fontSize: 13, border: "none", borderRadius: 20, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                    background: analyticsRange === r.id ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
                    color: analyticsRange === r.id ? "#818cf8" : "#71717a", fontWeight: analyticsRange === r.id ? 600 : 400 }}>
                  {r.label}
                </button>
              ))}
              <button onClick={() => setShowAccountFilter(true)}
                style={{ padding: "8px 14px", fontSize: 13, border: "none", borderRadius: 20, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                  background: selectedAccounts && selectedAccounts.length > 0 ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.04)",
                  color: selectedAccounts && selectedAccounts.length > 0 ? "#818cf8" : "#71717a" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg> Filter
              </button>
            </div>
          </div>

          {/* Month/Year picker — only shown for "Monthly" */}
          {analyticsRange === "month" && (
            <div style={{ ...card, padding: "14px 12px", marginTop: 8, marginBottom: 4 }}>
              {/* Year row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 12 }}>
                <button onClick={() => setCustomYear(y => y - 1)}
                  style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "none", color: "#a1a1aa", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {"\u2039"}
                </button>
                <span style={{ fontSize: 16, fontWeight: 700, minWidth: 60, textAlign: "center" }}>{customYear}</span>
                <button onClick={() => setCustomYear(y => Math.min(y + 1, now.getFullYear()))}
                  style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "none", color: "#a1a1aa", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {"\u203A"}
                </button>
              </div>
              {/* Month grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {MONTH_SHORT.map((m, i) => {
                  const isFuture = customYear === now.getFullYear() && i > now.getMonth();
                  const isSelected = customMonth === i;
                  return (
                    <button key={m} onClick={() => !isFuture && setCustomMonth(i)} disabled={isFuture}
                      style={{ padding: "10px 0", fontSize: 13, border: "none", borderRadius: 10, cursor: isFuture ? "default" : "pointer",
                        background: isSelected ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                        color: isFuture ? "#27272a" : isSelected ? "#818cf8" : "#a1a1aa",
                        fontWeight: isSelected ? 700 : 400 }}>
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Period label */}
          <div style={{ textAlign: "center", padding: "10px 0 8px" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#818cf8" }}>{periodLabel}</span>
            <span style={{ fontSize: 12, color: "#52525b", marginLeft: 8 }}>{filteredTxns.length} transactions</span>
          </div>

          {/* Summary card with bar chart */}
          <div style={{ ...card, padding: "20px 16px", marginBottom: 14 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "#71717a", fontWeight: 500 }}>Net Flow</div>
              <div style={{ fontSize: 32, fontWeight: 800, marginTop: 4, color: fNet >= 0 ? "#34d399" : "#ef4444" }}>
                {fNet >= 0 ? "+" : "-"}{"\u00A3"}{fmt(fNet)}
              </div>
            </div>
            <BarChart income={fIncome} spending={fSpending} maxVal={Math.max(fIncome, fSpending) * 1.15 || 1} />
          </div>

          {/* Quick stats row */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <div style={{ ...card, flex: 1, textAlign: "center", padding: "14px 8px" }}>
              <div style={{ fontSize: 11, color: "#71717a" }}>Daily Avg</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#f472b6", marginTop: 4 }}>{"\u00A3"}{dailyAvg.toFixed(2)}</div>
            </div>
            <div style={{ ...card, flex: 1, textAlign: "center", padding: "14px 8px" }}>
              <div style={{ fontSize: 11, color: "#71717a" }}>Txns</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{spendTxns.length}</div>
            </div>
            <div style={{ ...card, flex: 1, textAlign: "center", padding: "14px 8px" }}>
              <div style={{ fontSize: 11, color: "#71717a" }}>Savings</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: fIncome > 0 ? (savingsRateAnalytics > 20 ? "#34d399" : "#fbbf24") : "#71717a", marginTop: 4 }}>
                {savingsRateAnalytics}%
              </div>
            </div>
          </div>

          {/* Category / Merchant toggle */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 3, marginBottom: 14 }}>
            {[{ id: "category", label: "By Category" }, { id: "merchant", label: "By Merchant" }].map((v) => (
              <button key={v.id} onClick={() => setAnalyticsView(v.id)}
                style={{ flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 10, cursor: "pointer",
                  background: analyticsView === v.id ? "rgba(99,102,241,0.12)" : "transparent",
                  color: analyticsView === v.id ? "#818cf8" : "#52525b" }}>
                {v.label}
              </button>
            ))}
          </div>

          {/* Spending breakdown */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "#52525b", letterSpacing: "0.05em", fontWeight: 500 }}>SPENDING</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#f472b6" }}>-{"\u00A3"}{fmt(fSpending)}</span>
          </div>

          {/* Category view with percentage bars */}
          {analyticsView === "category" && (
            <div style={{ ...card, padding: 0, overflow: "hidden", marginBottom: 16 }}>
              {sortedCats.map((cat, i) => {
                const data = catMap[cat.id];
                const pct = fSpending > 0 ? (data.total / fSpending) * 100 : 0;
                return (
                  <div key={cat.id} onClick={() => { setDrillCategory(cat.id); setDrillSource("analytics"); }}
                    style={{ padding: "14px 16px", borderBottom: i < sortedCats.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${cat.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{cat.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 14, fontWeight: 500 }}>{cat.label}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 600 }}>{"\u00A3"}{fmt(data.total)}</span>
                            <span style={{ color: "#3f3f46", fontSize: 14 }}>{"\u203A"}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                          <span style={{ fontSize: 11, color: "#52525b" }}>{data.count} txn{data.count !== 1 ? "s" : ""}</span>
                          <span style={{ fontSize: 11, color: cat.color, fontWeight: 500 }}>{pct.toFixed(1)}%</span>
                        </div>
                        <div style={{ marginTop: 6, height: 3, background: "rgba(255,255,255,0.04)", borderRadius: 2 }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: cat.color, borderRadius: 2, transition: "width 0.4s" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {sortedCats.length === 0 && (
                <div style={{ padding: "30px 16px", textAlign: "center", color: "#3f3f46", fontSize: 13 }}>No spending data for this period</div>
              )}
            </div>
          )}

          {/* Merchant view */}
          {analyticsView === "merchant" && (
            <div style={{ ...card, padding: 0, overflow: "hidden", marginBottom: 16 }}>
              {sortedMerchants.map(([name, data], i) => {
                const pct = fSpending > 0 ? (data.total / fSpending) * 100 : 0;
                const cat = getCat(data.categoryId);
                return (
                  <div key={name} style={{ padding: "14px 16px", borderBottom: i < sortedMerchants.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <MerchantIcon merchant={name} categoryId={data.categoryId} size={40} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, flexShrink: 0 }}>{"\u00A3"}{fmt(data.total)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                          <span style={{ fontSize: 11, color: "#52525b" }}>{data.count} txn{data.count !== 1 ? "s" : ""} {"\u00B7"} {cat.label}</span>
                          <span style={{ fontSize: 11, color: "#52525b" }}>{pct.toFixed(1)}%</span>
                        </div>
                        <div style={{ marginTop: 6, height: 3, background: "rgba(255,255,255,0.04)", borderRadius: 2 }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: cat.color, borderRadius: 2, transition: "width 0.4s" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Income section */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "#52525b", letterSpacing: "0.05em", fontWeight: 500 }}>INCOME</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#34d399" }}>+{"\u00A3"}{fmt(fIncome)}</span>
          </div>
          {sortedIncome.length > 0 ? (
            <div style={{ ...card, padding: 0, overflow: "hidden", marginBottom: 16 }}>
              {sortedIncome.map(([name, data], i) => (
                <div key={name} style={{ display: "flex", alignItems: "center", padding: "13px 16px", borderBottom: i < sortedIncome.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                  <MerchantIcon merchant={name} categoryId="income" size={40} />
                  <div style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{name}</div>
                    <div style={{ fontSize: 11, color: "#52525b" }}>{data.count} payment{data.count !== 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#34d399" }}>+{"\u00A3"}{fmt(data.total)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ ...card, padding: "24px 16px", textAlign: "center", color: "#3f3f46", fontSize: 13, marginBottom: 16 }}>
              No income recorded this period
            </div>
          )}

          {/* Insights */}
          {sortedCats.length > 0 && (
            <>
              <div style={{ fontSize: 12, color: "#52525b", letterSpacing: "0.05em", fontWeight: 500, marginBottom: 10 }}>INSIGHTS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                <div style={{ ...card, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 24 }}>{sortedCats[0].icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Biggest category</div>
                    <div style={{ fontSize: 12, color: "#71717a", marginTop: 2 }}>
                      {sortedCats[0].label} accounts for {fSpending > 0 ? ((catMap[sortedCats[0].id].total / fSpending) * 100).toFixed(0) : 0}% of spending ({"\u00A3"}{fmt(catMap[sortedCats[0].id].total)})
                    </div>
                  </div>
                </div>
                {sortedMerchants.length > 0 && (
                  <div style={{ ...card, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 24 }}>{"\u{1F3AA}"}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Most frequent</div>
                      <div style={{ fontSize: 12, color: "#71717a", marginTop: 2 }}>
                        {sortedMerchants[0][0]} {"\u2014"} {sortedMerchants[0][1].count} visit{sortedMerchants[0][1].count !== 1 ? "s" : ""}, {"\u00A3"}{fmt(sortedMerchants[0][1].total)}
                      </div>
                    </div>
                  </div>
                )}
                {sortedCats.filter((c) => getBudget(c.id) > 0 && catMap[c.id].total > getBudget(c.id)).length > 0 && (
                  <div style={{ ...card, padding: 14, borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.03)", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 24 }}>{"\u26A0\uFE0F"}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#ef4444" }}>Over budget</div>
                      <div style={{ fontSize: 12, color: "#71717a", marginTop: 2 }}>
                        {sortedCats.filter((c) => getBudget(c.id) > 0 && catMap[c.id].total > getBudget(c.id)).map((c) => `${c.icon} ${c.label}`).join(", ")}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        );
      })()}

      {/* ═══ MODALS ═══ */}

      {/* Account filter modal */}
      {showAccountFilter && (() => {
        const accountNames = [...new Set(allTransactions.map((t) => t.accountName).filter(Boolean))];
        const selected = selectedAccounts || accountNames;
        const toggle = (name) => {
          const updated = selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name];
          setSelectedAccounts(updated);
          localStorage.setItem("selected_accounts", JSON.stringify(updated));
        };
        return (
          <BottomSheet onClose={() => setShowAccountFilter(false)} title="Filter by Account">
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <button onClick={() => { const all = selected.length === accountNames.length ? [] : accountNames; setSelectedAccounts(all); localStorage.setItem("selected_accounts", JSON.stringify(all)); }}
                style={{ background: "none", border: "none", color: "#818cf8", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                {selected.length === accountNames.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 14, overflow: "hidden" }}>
              {accountNames.map((name, i) => (
                <div key={name} onClick={() => toggle(name)} style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: i < accountNames.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", cursor: "pointer" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${selected.includes(name) ? "#818cf8" : "rgba(255,255,255,0.12)"}`, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12, background: selected.includes(name) ? "rgba(99,102,241,0.15)" : "transparent" }}>
                    {selected.includes(name) && <span style={{ color: "#818cf8", fontSize: 12, fontWeight: 700 }}>{"\u2713"}</span>}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{name}</span>
                </div>
              ))}
            </div>
            {accountNames.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px", color: "#3f3f46", fontSize: 13 }}>No accounts available</div>
            )}
            <button onClick={() => setShowAccountFilter(false)}
              style={{ width: "100%", padding: "14px", marginTop: 16, background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)", border: "none", borderRadius: 14, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
              Apply
            </button>
          </BottomSheet>
        );
      })()}

      {/* Category drill-down modal */}
      {drillCategory && (() => {
        const cat = getCat(drillCategory);
        const source = drillSource === "budget" ? periodTransactions : allTransactions;
        const catTxns = source.filter((t) => t.categoryId === drillCategory);
        const catSpend = catTxns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
        const catIncome = catTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
        const budget = getBudget(drillCategory);
        const isOver = budget > 0 && catSpend > budget;

        // Group by date
        const groups = {};
        catTxns.forEach((t) => {
          if (!groups[t.date]) groups[t.date] = [];
          groups[t.date].push(t);
        });

        return (
          <BottomSheet onClose={() => setDrillCategory(null)}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: `${cat.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{cat.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{cat.label}</div>
                <div style={{ fontSize: 13, color: "#71717a" }}>{catTxns.length} transaction{catTxns.length !== 1 ? "s" : ""}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                {catSpend > 0 && <div style={{ fontSize: 20, fontWeight: 700 }}>-{"\u00A3"}{fmt(catSpend)}</div>}
                {catIncome > 0 && <div style={{ fontSize: 16, fontWeight: 600, color: "#34d399" }}>+{"\u00A3"}{fmt(catIncome)}</div>}
              </div>
            </div>

            {/* Budget progress */}
            {budget > 0 && (
              <div style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: isOver ? "#ef4444" : "#71717a" }}>
                    {isOver ? `\u00A3${fmt(catSpend - budget)} over budget` : `\u00A3${fmt(budget - catSpend)} remaining`}
                  </span>
                  <span style={{ fontSize: 12, color: "#52525b" }}>{"\u00A3"}{budget} budget</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3 }}>
                  <div style={{ width: `${Math.min((catSpend / budget) * 100, 100)}%`, height: "100%", background: isOver ? "#ef4444" : cat.color, borderRadius: 3 }} />
                </div>
              </div>
            )}

            {/* Transactions grouped by date */}
            {Object.entries(groups).map(([date, txns]) => (
              <div key={date}>
                <div style={{ fontSize: 12, color: "#52525b", fontWeight: 500, padding: "10px 0 6px" }}>{formatDateHeader(date)}</div>
                {txns.map((tx) => (
                  <div key={tx.id} style={{ display: "flex", alignItems: "center", padding: "11px 0", borderBottom: "1px solid rgba(255,255,255,0.03)", gap: 10 }}>
                    <MerchantIcon merchant={tx.merchant} rawMerchant={tx.rawMerchant} categoryId={tx.categoryId} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.merchant}</div>
                      <div style={{ fontSize: 11, color: "#3f3f46", marginTop: 2 }}>{tx.accountName || ""}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: tx.amount >= 0 ? "#34d399" : "#e4e4e7", flexShrink: 0 }}>
                      {tx.amount >= 0 ? "+" : "-"}{"\u00A3"}{fmt(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {catTxns.length === 0 && (
              <div style={{ textAlign: "center", padding: "30px 0", color: "#3f3f46", fontSize: 13 }}>No transactions in this category</div>
            )}
          </BottomSheet>
        );
      })()}

      {editingTx !== null && <CategoryPicker onSelect={(catId) => handleCategoryChange(editingTx, catId)} onClose={() => setEditingTx(null)} />}

      {/* Bottom tab bar — fixed, SVG icons */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "rgba(9,9,15,0.97)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", padding: "8px 0 24px", zIndex: 100 }}>
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          const color = active ? "#818cf8" : "#52525b";
          const icons = {
            overview: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
            holdings: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
            transactions: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
            budget: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 118 2.83"/><path d="M22 12A10 10 0 0012 2v10z"/></svg>,
            analytics: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
          };
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "4px 0" }}>
              {icons[tab.id]}
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, color }}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "10px 20px 0", fontSize: 10, color: "#27272a" }}>
        {tlTokens.length > 0 ? "Live data via TrueLayer" : "Connect your bank to start"} {"\u00B7"} v0.7
      </div>
    </div>
  );
}
