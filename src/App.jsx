import { useState, useMemo, useEffect, useCallback } from "react";

// ── Data ──────────────────────────────────────────────
const ACCOUNTS = [
  { name: "IBKR ISA", type: "Brokerage", balance: 7712.68, change: -0.5, currency: "USD" },
  { name: "Trading 212 ISA", type: "ISA", balance: 918, change: null, currency: "GBP" },
  { name: "Kraken", type: "Crypto", balance: 0, change: 0, currency: "GBP" },
  { name: "Monzo", type: "Bank", balance: 2145.8, change: null, currency: "GBP" },
  { name: "HSBC", type: "Bank", balance: 5620.3, change: null, currency: "GBP" },
  { name: "Republic", type: "Private Equity", balance: 1500, change: null, currency: "USD" },
];

const HOLDINGS = [
  { ticker: "SIVE", name: "Sivers Semiconductors", value: 758, costBasis: 950, pnl: -20.2, account: "IBKR", sparkline: [12, 11, 10, 10, 11, 10, 10, 10] },
  { ticker: "META", name: "Meta Platforms", value: 2030, costBasis: 2670, pnl: -24.0, account: "IBKR", sparkline: [560, 550, 540, 535, 530, 534, 533, 534] },
  { ticker: "SOI", name: "S.O.I.T.E.C.", value: 1100, costBasis: 1295, pnl: -15.1, account: "IBKR", sparkline: [55, 54, 53, 52, 52, 51, 52, 52] },
  { ticker: "LNSR", name: "Lensar Inc", value: 891, costBasis: 1168, pnl: -23.7, account: "IBKR", sparkline: [7, 6.5, 6.2, 6, 5.9, 5.8, 5.8, 5.84] },
  { ticker: "TSEM", name: "Tower Semiconductor", value: 601, costBasis: 793, pnl: -24.2, account: "IBKR", sparkline: [165, 162, 160, 158, 159, 158, 158, 158] },
  { ticker: "IQE", name: "IQE plc", value: 918, costBasis: 1050, pnl: -12.6, account: "T212", sparkline: [0.25, 0.24, 0.23, 0.23, 0.22, 0.23, 0.23, 0.23] },
];

const CATEGORIES = [
  { id: "housing", label: "Housing", icon: "\u{1F3E0}", color: "#818cf8", budget: 1050 },
  { id: "family", label: "Family", icon: "\u{1F468}\u200D\u{1F469}\u200D\u{1F466}", color: "#34d399", budget: 245 },
  { id: "eating_out", label: "Eating Out", icon: "\u{1F37D}\uFE0F", color: "#22d3ee", budget: 400 },
  { id: "groceries", label: "Groceries", icon: "\u{1F6D2}", color: "#4ade80", budget: 120 },
  { id: "transport", label: "Transport", icon: "\u{1F687}", color: "#60a5fa", budget: 80 },
  { id: "shopping", label: "Shopping", icon: "\u{1F6CD}\uFE0F", color: "#f0abfc", budget: 50 },
  { id: "entertainment", label: "Entertainment", icon: "\u{1F3AC}", color: "#fbbf24", budget: 50 },
  { id: "bills", label: "Bills", icon: "\u{1F4A1}", color: "#fb923c", budget: 30 },
  { id: "subscriptions", label: "Subscriptions", icon: "\u{1F4FA}", color: "#c084fc", budget: 30 },
  { id: "health", label: "Health", icon: "\u{1F48A}", color: "#f87171", budget: 40 },
  { id: "income", label: "Income", icon: "\u{1F4B0}", color: "#34d399", budget: 0 },
  { id: "work_travel", label: "Work Travel", icon: "\u2708\uFE0F", color: "#38bdf8", budget: 0 },
  { id: "transfer", label: "Transfer", icon: "\u{1F504}", color: "#71717a", budget: 0 },
  { id: "investment", label: "Investment", icon: "\u{1F4C8}", color: "#6366f1", budget: 0 },
  { id: "general", label: "General", icon: "\u{1F4CC}", color: "#a1a1aa", budget: 0 },
];

// Categories excluded from spending analytics and budgets
const EXCLUDED_FROM_SPENDING = ["income", "work_travel", "transfer", "investment"];

const DEFAULT_RECURRING = [
  { id: "r1", merchant: "Rightmove Rent", amount: 1050, categoryId: "housing", frequency: "Monthly", nextDate: "27 Apr" },
  { id: "r2", merchant: "Emma", amount: 9.99, categoryId: "subscriptions", frequency: "Monthly", nextDate: "29 Apr" },
  { id: "r3", merchant: "Netflix", amount: 10.99, categoryId: "subscriptions", frequency: "Monthly", nextDate: "25 Apr" },
  { id: "r4", merchant: "TfL Auto Top-up", amount: 20, categoryId: "transport", frequency: "Weekly", nextDate: "2 Apr" },
  { id: "r5", merchant: "Vietnam Family Transfer", amount: 245.35, categoryId: "family", frequency: "Monthly", nextDate: "24 Apr" },
];

const initialTransactions = [
  { id: 1, date: "29 Mar", merchant: "Odeon", amount: -29.0, categoryId: "entertainment", pending: true },
  { id: 2, date: "29 Mar", merchant: "Salad Projects", amount: -12.95, categoryId: "eating_out", pending: true },
  { id: 3, date: "29 Mar", merchant: "Emma", amount: -9.99, categoryId: "subscriptions", pending: true },
  { id: 4, date: "29 Mar", merchant: "Owl And Hitchhiker", amount: -15.0, categoryId: "eating_out", pending: true },
  { id: 5, date: "29 Mar", merchant: "Regal Gaming", amount: -1.5, categoryId: "entertainment", pending: true },
  { id: 6, date: "29 Mar", merchant: "Owl And Hitchhiker", amount: -21.45, categoryId: "eating_out", pending: true },
  { id: 7, date: "29 Mar", merchant: "Eyes On Broadway", amount: -75.0, categoryId: "health", pending: true },
  { id: 8, date: "27 Mar", merchant: "Seedrs", amount: 33.0, categoryId: "work_travel", pending: false },
  { id: 9, date: "27 Mar", merchant: "Seedrs Ltd", amount: 3200.0, categoryId: "income", pending: false },
  { id: 10, date: "27 Mar", merchant: "Rightmove Rent", amount: -1050.0, categoryId: "housing", pending: false },
  { id: 11, date: "26 Mar", merchant: "Tesco Express", amount: -8.45, categoryId: "groceries", pending: false },
  { id: 12, date: "26 Mar", merchant: "TfL", amount: -2.8, categoryId: "transport", pending: false },
  { id: 13, date: "25 Mar", merchant: "Pret A Manger", amount: -5.9, categoryId: "eating_out", pending: false },
  { id: 14, date: "25 Mar", merchant: "Amazon", amount: -24.99, categoryId: "shopping", pending: false },
  { id: 15, date: "25 Mar", merchant: "Netflix", amount: -10.99, categoryId: "subscriptions", pending: false },
  { id: 16, date: "24 Mar", merchant: "Sainsbury's", amount: -32.1, categoryId: "groceries", pending: false },
  { id: 17, date: "24 Mar", merchant: "Vietnam Family Transfer", amount: -245.35, categoryId: "family", pending: false },
  { id: 18, date: "23 Mar", merchant: "Seedrs Ltd", amount: 1796.84, categoryId: "income", pending: false },
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

function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const isOver = value > max;
  return (
    <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: isOver ? "#ef4444" : color, borderRadius: 3, transition: "width 0.6s ease" }} />
    </div>
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

function DonutChart({ spent, committed, total, size = 180 }) {
  const r = (size - 20) / 2;
  const circ = 2 * Math.PI * r;
  const spentPct = Math.min(spent / total, 1);
  const committedPct = Math.min(committed / total, 1);
  const remaining = Math.max(total - spent - committed, 0);
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#c084fc" strokeWidth="14" strokeDasharray={`${committedPct * circ} ${circ}`} strokeDashoffset={`${-spentPct * circ}`} strokeLinecap="round" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#818cf8" strokeWidth="14" strokeDasharray={`${spentPct * circ} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{"\u00A3"}{remaining.toFixed(2)}</div>
        <div style={{ fontSize: 11, color: "#71717a" }}>left of {"\u00A3"}{total.toFixed(0)}</div>
      </div>
    </div>
  );
}

function BarChart({ income, spending, maxVal }) {
  const barH = 140;
  const incH = (income / maxVal) * barH;
  const spendH = (spending / maxVal) * barH;
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 28, alignItems: "flex-end", height: barH + 10, marginTop: 10 }}>
      <div style={{ width: 80, height: incH, background: "linear-gradient(180deg, #22d3ee 0%, #06b6d4 100%)", borderRadius: "8px 8px 4px 4px", transition: "height 0.5s ease" }} />
      <div style={{ width: 80, height: spendH, background: "linear-gradient(180deg, #f472b6 0%, #ec4899 100%)", borderRadius: "8px 8px 4px 4px", transition: "height 0.5s ease" }} />
    </div>
  );
}

function CategoryPicker({ onSelect, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 430, background: "#18181b", borderRadius: "20px 20px 0 0", padding: "20px 20px 30px", maxHeight: "60vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Choose category</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#71717a", fontSize: 20, cursor: "pointer" }}>{"\u2715"}</button>
        </div>
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

// ── Auto-categorization ──────────────────────────────
const CATEGORY_RULES = [
  // Housing
  { pattern: /rent|mortgage|rightmove|openrent|letting|housing/i, categoryId: "housing" },
  // Eating out
  { pattern: /pret|starbucks|costa|mcdonald|burger|nando|wagamama|pizza|kebab|sushi|cafe|coffee|restaurant|dining|deliveroo|uber\s*eats|just\s*eat|dine|grill|kitchen|bistro|brasserie|bar\s|pub\s|salad|greggs|subway|kfc|domino|five\s*guys|leon|itsu|wasabi|eat\b|food\s*hall|canteen/i, categoryId: "eating_out" },
  // Groceries
  { pattern: /tesco|sainsbury|asda|aldi|lidl|waitrose|morrisons|co-?op|ocado|marks.*spencer|m&s\s*food|grocery|supermarket|iceland/i, categoryId: "groceries" },
  // Transport
  { pattern: /tfl|uber(?!\s*eat)|bolt|lime|taxi|cab|train|rail|bus|parking|petrol|fuel|shell|bp\s|esso|car\s*wash|congestion|oyster|citymapper/i, categoryId: "transport" },
  // Shopping
  { pattern: /amazon|ebay|asos|zara|h&m|primark|nike|adidas|uniqlo|john\s*lewis|argos|currys|ikea|apple\.com|google\s*store|samsung/i, categoryId: "shopping" },
  // Entertainment
  { pattern: /netflix|spotify|disney|cinema|odeon|cineworld|vue|gaming|playstation|xbox|steam|twitch|youtube|apple\s*tv|prime\s*video|sky\s|now\s*tv|theatre|concert|ticket/i, categoryId: "entertainment" },
  // Subscriptions
  { pattern: /subscri|membership|annual\s*fee|monthly\s*fee|patreon|substack|notion|figma|adobe|microsoft\s*365|icloud|google\s*one|emma\b|monzo\s*plus|revolut\s*premium/i, categoryId: "subscriptions" },
  // Bills
  { pattern: /electric|gas\b|water|council\s*tax|internet|broadband|phone\s*bill|mobile\s*bill|insurance|tv\s*licen|virgin|bt\s|ee\s|vodafone|three\s|o2\s/i, categoryId: "bills" },
  // Health
  { pattern: /pharmacy|chemist|doctor|dentist|hospital|optical|eye|boots\s*optician|specsaver|gym|fitness|health/i, categoryId: "health" },
  // Family
  { pattern: /family|transfer.*viet|remittance|wise.*vn|moneygram|western\s*union/i, categoryId: "family" },
  // Work/Travel
  { pattern: /flight|hotel|airbnb|booking\.com|expedia|travel|airport|airline|ryanair|easyjet|british\s*air/i, categoryId: "work_travel" },
  // Income
  { pattern: /salary|payroll|wages|dividend|refund|cashback|interest\s*paid|freelance/i, categoryId: "income" },
  // Transfers (net-zero moves between own accounts)
  { pattern: /transfer|pot\s|savings\s*goal|monzo.*monzo|revolut.*revolut|internal|between\s*accounts|moving\s*money/i, categoryId: "transfer" },
  // Investments
  { pattern: /trading\s*212|t212|ibkr|interactive\s*broker|kraken|coinbase|binance|freetrade|vanguard|hargreaves|aj\s*bell|republic|seedrs|crowdcube/i, categoryId: "investment" },
];

function categorize(merchantName, description, tlCategory, amount) {
  // Income detection
  if (amount > 0) return "income";

  const text = `${merchantName || ""} ${description || ""}`.toLowerCase();

  // Try keyword matching
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(text)) return rule.categoryId;
  }

  // Fallback to TrueLayer category
  if (tlCategory === "TRANSFER") return "transfer";
  if (tlCategory === "PURCHASE") return "shopping";
  if (tlCategory === "BILL_PAYMENT") return "bills";

  return "general";
}

// ── TrueLayer helpers ────────────────────────────────
function mapTx(tx, accountName) {
  const amount = tx.transaction_type === "DEBIT" ? -Math.abs(tx.amount) : Math.abs(tx.amount);
  return {
    id: `tl_${tx.transaction_id}`,
    date: new Date(tx.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    merchant: tx.merchant_name || tx.description || "Unknown",
    amount,
    categoryId: categorize(tx.merchant_name, tx.description, tx.transaction_category, amount),
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

async function exchangeCode(code) {
  const res = await fetch("/api/callback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  return res.json();
}

async function fetchAccounts(token) {
  const res = await fetch("/api/accounts", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function fetchBalance(token, accountId) {
  const res = await fetch(`/api/accounts/${accountId}/balance`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function fetchTransactions(token, accountId) {
  const res = await fetch(`/api/accounts/${accountId}/transactions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function fetchCards(token) {
  const res = await fetch("/api/cards", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function fetchCardBalance(token, cardId) {
  const res = await fetch(`/api/cards/${cardId}/balance`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function fetchCardTransactions(token, cardId) {
  const res = await fetch(`/api/cards/${cardId}/transactions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

// ── Main ──────────────────────────────────────────────
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [transactions, setTransactions] = useState(initialTransactions);
  const [editingTx, setEditingTx] = useState(null);
  const [holdingsSort, setHoldingsSort] = useState("pnl_abs");
  const budgetPeriod = { start: "27 Mar", end: "27 Apr" };

  // TrueLayer state — array of tokens, one per connected bank
  const [tlTokens, setTlTokens] = useState(() => JSON.parse(localStorage.getItem("tl_tokens") || "[]"));
  const tlToken = tlTokens[0] || null; // for backwards compat
  const [tlAccounts, setTlAccounts] = useState([]);
  const [tlTransactions, setTlTransactions] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState(null);
  const [categoryOverrides, setCategoryOverrides] = useState(() => JSON.parse(localStorage.getItem("tl_cat_overrides") || "{}"));
  const [budgetOverrides, setBudgetOverrides] = useState(() => JSON.parse(localStorage.getItem("budget_overrides") || "{}"));
  const [editingBudget, setEditingBudget] = useState(null);
  const [analyticsRange, setAnalyticsRange] = useState("payday"); // payday, 30d, 90d, custom, all
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [recurring, setRecurring] = useState(() => JSON.parse(localStorage.getItem("recurring_items") || "null") || DEFAULT_RECURRING);
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [txSearch, setTxSearch] = useState("");
  const [budgetView, setBudgetView] = useState("category"); // category or merchant
  const [analyticsView, setAnalyticsView] = useState("category"); // category or merchant
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [showAccountFilter, setShowAccountFilter] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState(() => JSON.parse(localStorage.getItem("selected_accounts") || "null"));

  // Handle OAuth callback — token comes back from Express server via redirect
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

  // Fetch bank data across all connected tokens
  const loadBankData = useCallback(async () => {
    if (tlTokens.length === 0) return;
    setBankLoading(true);
    setBankError(null);
    const allAccounts = [];
    const allTxns = [];

    for (const token of tlTokens) {
      try {
        // Fetch current/savings accounts
        const accountsRes = await fetchAccounts(token);
        const accounts = accountsRes.results || [];
        for (const acc of accounts) {
          try {
            const balRes = await fetchBalance(token, acc.account_id);
            const bal = balRes.results?.[0];
            allAccounts.push({ ...acc, balance: bal?.current || 0, currency: bal?.currency || "GBP", source: "truelayer" });
          } catch { allAccounts.push({ ...acc, balance: 0, source: "truelayer" }); }
          try {
            const txRes = await fetchTransactions(token, acc.account_id);
            (txRes.results || []).forEach((tx) => allTxns.push(mapTx(tx, acc.display_name)));
          } catch { /* skip */ }
        }

        // Fetch credit cards
        const cardsRes = await fetchCards(token);
        const cards = cardsRes.results || [];
        for (const card of cards) {
          try {
            const balRes = await fetchCardBalance(token, card.account_id);
            const bal = balRes.results?.[0];
            allAccounts.push({
              ...card,
              display_name: card.display_name || card.card_type || "Credit Card",
              balance: -(bal?.current || 0), // credit card balance is what you owe
              currency: bal?.currency || "GBP",
              type: "Credit Card",
              source: "truelayer",
            });
          } catch { allAccounts.push({ ...card, balance: 0, type: "Credit Card", source: "truelayer" }); }
          try {
            const txRes = await fetchCardTransactions(token, card.account_id);
            (txRes.results || []).forEach((tx) => allTxns.push(mapTx(tx, card.display_name)));
          } catch { /* skip */ }
        }
      } catch (err) {
        if (err.message?.includes("401")) {
          setTlTokens((prev) => { const updated = prev.filter((t) => t !== token); localStorage.setItem("tl_tokens", JSON.stringify(updated)); return updated; });
        }
      }
    }

    setTlAccounts(allAccounts);
    setTlTransactions(allTxns);
    setBankLoading(false);
  }, [tlTokens]);

  useEffect(() => {
    loadBankData();
  }, [loadBankData]);

  const disconnectBank = () => {
    localStorage.removeItem("tl_tokens");
    setTlTokens([]);
    setTlAccounts([]);
    setTlTransactions([]);
  };

  // Merge TrueLayer accounts with hardcoded ones
  const bankAccounts = tlAccounts.map((acc) => ({
    name: acc.display_name || acc.provider?.display_name || "Bank Account",
    type: acc.type || "Bank",
    balance: acc.balance,
    change: null,
    currency: acc.currency || "GBP",
    source: "truelayer",
  }));

  // Replace hardcoded Bank entries with live ones; keep investments
  const mergedAccounts = tlAccounts.length > 0
    ? [...ACCOUNTS.filter((a) => a.type !== "Bank"), ...bankAccounts]
    : ACCOUNTS;

  // Use live transactions when connected, fallback to manual for demo
  // Apply any manual category overrides
  const allTransactions = useMemo(() => {
    const txns = tlTransactions.length > 0 ? tlTransactions : transactions;
    return txns.map((t) => categoryOverrides[t.id] ? { ...t, categoryId: categoryOverrides[t.id] } : t);
  }, [tlTransactions, transactions, categoryOverrides]);

  const totalNetWorth = mergedAccounts.reduce((s, a) => s + a.balance, 0);
  const totalInvested = mergedAccounts.filter((a) => ["Brokerage", "ISA", "Private Equity", "Crypto"].includes(a.type)).reduce((s, a) => s + a.balance, 0);
  const totalCash = mergedAccounts.filter((a) => a.type === "Bank").reduce((s, a) => s + a.balance, 0);

  const income = useMemo(() => allTransactions.filter((t) => t.amount > 0 && !EXCLUDED_FROM_SPENDING.includes(t.categoryId)).reduce((s, t) => s + t.amount, 0), [allTransactions]);
  const spending = useMemo(() => allTransactions.filter((t) => t.amount < 0 && !EXCLUDED_FROM_SPENDING.includes(t.categoryId)).reduce((s, t) => s + Math.abs(t.amount), 0), [allTransactions]);
  const netFlow = income - spending;
  const savingsRate = income > 0 ? Math.round(((income - spending) / income) * 100) : 0;

  MONTHLY_SAVINGS[MONTHLY_SAVINGS.length - 1].rate = savingsRate;

  const categorySpending = useMemo(() => {
    const map = {};
    allTransactions.filter((t) => t.amount < 0 && !EXCLUDED_FROM_SPENDING.includes(t.categoryId)).forEach((t) => {
      if (!map[t.categoryId]) map[t.categoryId] = { total: 0, count: 0 };
      map[t.categoryId].total += Math.abs(t.amount);
      map[t.categoryId].count += 1;
    });
    return map;
  }, [allTransactions]);

  const getBudget = (catId) => budgetOverrides[catId] ?? CATEGORIES.find((c) => c.id === catId)?.budget ?? 0;
  const budgetedCats = CATEGORIES.filter((c) => getBudget(c.id) > 0 && !EXCLUDED_FROM_SPENDING.includes(c.id));
  const totalBudget = budgetedCats.reduce((s, c) => s + getBudget(c.id), 0);
  const discretionarySpend = budgetedCats.reduce((s, c) => s + (categorySpending[c.id]?.total || 0), 0);
  const recurringTotal = recurring.reduce((s, r) => s + r.amount, 0);
  const committedSpend = recurringTotal;
  const variableSpend = discretionarySpend - Math.min(committedSpend, discretionarySpend);
  const daysInPeriod = 31;
  const dayOfPeriod = new Date().getDate();
  const daysLeft = Math.max(daysInPeriod - dayOfPeriod, 1);
  const dailyAllowance = Math.max((totalBudget - discretionarySpend) / daysLeft, 0);

  const saveRecurring = (items) => {
    setRecurring(items);
    localStorage.setItem("recurring_items", JSON.stringify(items));
  };

  const updateRecurringItem = (id, field, value) => {
    const updated = recurring.map((r) => r.id === id ? { ...r, [field]: field === "amount" ? Number(value) : value } : r);
    saveRecurring(updated);
  };

  const deleteRecurringItem = (id) => {
    saveRecurring(recurring.filter((r) => r.id !== id));
  };

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

  // Holdings P&L
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
    // For hardcoded transactions
    setTransactions((prev) => prev.map((t) => (t.id === txId ? { ...t, categoryId: newCatId } : t)));
    // For TrueLayer transactions — store override
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

  const sectionLabel = { fontSize: 12, color: "#71717a", letterSpacing: "0.05em", marginBottom: 10, marginTop: 24 };
  const card = { padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e4e4e7", fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 430, margin: "0 auto", paddingBottom: 30 }}>

      {/* Header */}
      <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 13, color: "#71717a", letterSpacing: "0.05em" }}>DASHBOARD</div>
          <div style={{ fontSize: 20, fontWeight: 600, marginTop: 2 }}>Finances</div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #34d399 0%, #059669 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#0a0a0f" }}>B</div>
      </div>

      {/* Net Worth */}
      <div style={{ margin: "20px 20px 0", padding: 20, background: "linear-gradient(145deg, rgba(52,211,153,0.08) 0%, rgba(16,185,129,0.03) 100%)", border: "1px solid rgba(52,211,153,0.15)", borderRadius: 16 }}>
        <div style={{ fontSize: 12, color: "#71717a", letterSpacing: "0.05em" }}>NET WORTH</div>
        <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4, letterSpacing: "-0.02em", color: "#f4f4f5" }}>{"\u00A3"}{totalNetWorth.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
          <span style={{ color: "#34d399", fontSize: 13, fontWeight: 600 }}>{"\u2191"} {"\u00A3"}2,226.75</span>
          <span style={{ color: "#71717a", fontSize: 13 }}>this month (+7.4%)</span>
        </div>
        <div style={{ marginTop: 14 }}><MiniChart data={NET_WORTH_HISTORY} width={340} height={50} /></div>
        <div style={{ display: "flex", gap: 16, marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: "#71717a" }}>Invested</div><div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>{"\u00A3"}{totalInvested.toLocaleString("en-GB")}</div></div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: "#71717a" }}>Cash</div><div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>{"\u00A3"}{totalCash.toLocaleString("en-GB")}</div></div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: "#71717a" }}>Alloc</div><div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>{((totalInvested / totalNetWorth) * 100).toFixed(0)}% / {((totalCash / totalNetWorth) * 100).toFixed(0)}%</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, margin: "20px 20px 0", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3 }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 8, fontSize: 12, fontWeight: activeTab === tab.id ? 600 : 400, color: activeTab === tab.id ? "#f4f4f5" : "#71717a", background: activeTab === tab.id ? "rgba(255,255,255,0.08)" : "transparent", cursor: "pointer", transition: "all 0.2s" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {activeTab === "overview" && (
        <div style={{ padding: "0 20px" }}>
          <div style={sectionLabel}>ACCOUNTS</div>

          {/* TrueLayer Connect / Status */}
          {tlTokens.length > 0 && (
            <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderColor: "rgba(99,102,241,0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🏦</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#818cf8" }}>Bank Connected</div>
                  <div style={{ fontSize: 11, color: "#71717a" }}>{tlTokens.length} bank{tlTokens.length !== 1 ? "s" : ""} · {tlAccounts.length} account{tlAccounts.length !== 1 ? "s" : ""} linked</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={loadBankData} disabled={bankLoading}
                  style={{ padding: "6px 12px", fontSize: 11, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#a1a1aa", cursor: "pointer" }}>
                  {bankLoading ? "..." : "Refresh"}
                </button>
                <button onClick={disconnectBank}
                  style={{ padding: "6px 12px", fontSize: 11, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: "#ef4444", cursor: "pointer" }}>
                  Disconnect
                </button>
              </div>
            </div>
          )}
          <button onClick={startBankConnect}
            style={{ width: "100%", padding: "12px 16px", marginBottom: 12, background: tlTokens.length > 0 ? "rgba(99,102,241,0.1)" : "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)", border: tlTokens.length > 0 ? "1px solid rgba(99,102,241,0.3)" : "none", borderRadius: 12, color: tlTokens.length > 0 ? "#818cf8" : "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>+</span> {tlTokens.length > 0 ? "Add Another Bank" : "Connect Your Bank"}
          </button>
          {bankError && (
            <div style={{ ...card, marginBottom: 12, borderColor: "rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 12 }}>
              Error: {bankError}
            </div>
          )}
          {bankLoading && !tlToken && (
            <div style={{ ...card, marginBottom: 12, textAlign: "center", color: "#71717a", fontSize: 13 }}>
              Connecting to your bank...
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {mergedAccounts.map((acc, i) => (
              <div key={acc.name + i} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{acc.name}</span>
                    {acc.source === "truelayer" && <span style={{ fontSize: 9, padding: "1px 5px", background: "rgba(99,102,241,0.15)", color: "#818cf8", borderRadius: 4, fontWeight: 600 }}>LIVE</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#71717a", marginTop: 2 }}>{acc.type}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{acc.currency === "USD" ? "$" : "\u00A3"}{acc.balance.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</div>
                  {acc.change !== null && acc.change !== 0 && <div style={{ fontSize: 11, color: acc.change >= 0 ? "#34d399" : "#ef4444", marginTop: 2 }}>{acc.change >= 0 ? "\u2191" : "\u2193"} {Math.abs(acc.change)}%</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Savings Rate */}
          <div style={sectionLabel}>SAVINGS RATE</div>
          <div style={{ ...card, padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
            <SavingsGauge rate={savingsRate} size={76} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {savingsRate >= 50 ? "Solid month" : savingsRate >= 30 ? "Decent" : "Tight month"}
              </div>
              <div style={{ fontSize: 12, color: "#71717a", marginTop: 4 }}>
                {"\u00A3"}{netFlow.toFixed(0)} saved of {"\u00A3"}{income.toFixed(0)} earned
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                {MONTHLY_SAVINGS.map((m, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flex: 1 }}>
                    <div style={{
                      height: 24,
                      width: "100%",
                      borderRadius: 3,
                      background: `rgba(${m.rate >= 50 ? '52,211,153' : m.rate >= 30 ? '251,191,36' : '239,68,68'}, ${Math.max(m.rate / 100, 0.08)})`,
                      transition: "all 0.3s",
                    }} />
                    <span style={{ fontSize: 9, color: "#52525b" }}>{m.month}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* This month summary */}
          <div style={sectionLabel}>THIS MONTH</div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ ...card, flex: 1, textAlign: "center" }}><div style={{ fontSize: 11, color: "#71717a" }}>Income</div><div style={{ fontSize: 16, fontWeight: 700, color: "#34d399", marginTop: 4 }}>+{"\u00A3"}{income.toFixed(0)}</div></div>
            <div style={{ ...card, flex: 1, textAlign: "center" }}><div style={{ fontSize: 11, color: "#71717a" }}>Spending</div><div style={{ fontSize: 16, fontWeight: 700, color: "#f472b6", marginTop: 4 }}>-{"\u00A3"}{spending.toFixed(0)}</div></div>
            <div style={{ ...card, flex: 1, textAlign: "center" }}><div style={{ fontSize: 11, color: "#71717a" }}>Net</div><div style={{ fontSize: 16, fontWeight: 700, color: netFlow >= 0 ? "#34d399" : "#ef4444", marginTop: 4 }}>{netFlow >= 0 ? "+" : ""}{"\u00A3"}{netFlow.toFixed(0)}</div></div>
          </div>
        </div>
      )}

      {/* ═══ HOLDINGS ═══ */}
      {activeTab === "holdings" && (
        <div style={{ padding: "0 20px" }}>
          {/* Portfolio summary */}
          <div style={sectionLabel}>PORTFOLIO P&L</div>
          <div style={{ ...card, padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div>
                <div style={{ fontSize: 11, color: "#71717a" }}>Current Value</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{"\u00A3"}{totalCurrentValue.toLocaleString("en-GB")}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#71717a" }}>Total P&L</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: totalPnlAbs >= 0 ? "#34d399" : "#ef4444", marginTop: 2 }}>
                  {totalPnlAbs >= 0 ? "+" : ""}{"\u00A3"}{totalPnlAbs.toFixed(0)}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: "#71717a" }}>Cost Basis</div><div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{"\u00A3"}{totalCostBasis.toLocaleString("en-GB")}</div></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: "#71717a" }}>Return</div><div style={{ fontSize: 14, fontWeight: 600, color: totalPnlPct >= 0 ? "#34d399" : "#ef4444", marginTop: 2 }}>{totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(1)}%</div></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: "#71717a" }}>Positions</div><div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{HOLDINGS.length}</div></div>
            </div>
          </div>

          {/* Sort */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {[
              { id: "pnl_abs", label: "P&L (\u00A3)" },
              { id: "pnl_pct", label: "P&L (%)" },
              { id: "value", label: "Value" },
            ].map((s) => (
              <button key={s.id} onClick={() => setHoldingsSort(s.id)}
                style={{
                  padding: "5px 10px", fontSize: 11, border: "none", borderRadius: 6, cursor: "pointer",
                  background: holdingsSort === s.id ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.04)",
                  color: holdingsSort === s.id ? "#34d399" : "#71717a",
                  fontWeight: holdingsSort === s.id ? 600 : 400,
                }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Holdings list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sortedHoldings.map((h) => {
              const pnlAbs = h.value - h.costBasis;
              return (
                <div key={h.ticker} style={{ ...card, padding: "14px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#34d399", background: "rgba(52,211,153,0.1)", padding: "2px 6px", borderRadius: 4 }}>{h.ticker}</span>
                          <span style={{ fontSize: 13, color: "#a1a1aa" }}>{h.name}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "#52525b", marginTop: 3 }}>{h.account === "T212" ? "Trading 212" : h.account}</div>
                      </div>
                    </div>
                    <Sparkline data={h.sparkline} width={56} height={22} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <div><div style={{ fontSize: 10, color: "#52525b" }}>Value</div><div style={{ fontSize: 13, fontWeight: 600 }}>{"\u00A3"}{h.value.toLocaleString()}</div></div>
                    <div><div style={{ fontSize: 10, color: "#52525b" }}>Cost</div><div style={{ fontSize: 13, fontWeight: 500, color: "#a1a1aa" }}>{"\u00A3"}{h.costBasis.toLocaleString()}</div></div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#52525b" }}>P&L</div>
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
        const filtered = allTransactions.filter((t) => {
          if (txSearch && !t.merchant.toLowerCase().includes(txSearch.toLowerCase())) return false;
          if (selectedAccounts && t.accountName && !selectedAccounts.includes(t.accountName)) return false;
          return true;
        });
        // Group by date
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
          {/* Search + filter */}
          <div style={{ display: "flex", gap: 8, marginTop: 20, marginBottom: 16 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#52525b", fontSize: 14 }}>{"\u{1F50D}"}</span>
              <input placeholder="Search" value={txSearch} onChange={(e) => setTxSearch(e.target.value)}
                style={{ width: "100%", padding: "10px 10px 10px 36px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#e4e4e7", fontSize: 13 }} />
            </div>
            <button onClick={() => setShowAccountFilter(true)}
              style={{ padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#818cf8", fontSize: 14, cursor: "pointer" }}>
              {"\u{1F3E6}"}
            </button>
          </div>

          {/* Transaction groups by date */}
          {dateKeys.map((date) => {
            const group = groups[date];
            return (
              <div key={date}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 8px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#818cf8" }}>{date}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: group.total >= 0 ? "#34d399" : "#e4e4e7" }}>
                    {group.total >= 0 ? "+" : ""}{"\u00A3"}{Math.abs(group.total).toFixed(2)}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {group.txns.map((tx) => {
                    const cat = getCat(tx.categoryId);
                    return (
                      <div key={tx.id} style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${cat.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                          {cat.icon}
                        </div>
                        <div style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.merchant}</div>
                          <button onClick={() => setEditingTx(tx.id)}
                            style={{ fontSize: 12, color: cat.color, background: "none", border: "none", padding: 0, cursor: "pointer", marginTop: 2 }}>
                            {cat.label} {"\u270E"}
                          </button>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: tx.amount >= 0 ? "#34d399" : "#e4e4e7" }}>
                            {tx.amount >= 0 ? "+" : "-"}{"\u00A3"}{Math.abs(tx.amount).toFixed(2)}
                          </div>
                          {tx.accountName && <div style={{ fontSize: 10, color: "#52525b", marginTop: 2 }}>{tx.accountName}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#52525b", fontSize: 13 }}>No transactions found</div>}
        </div>
        );
      })()}

      {/* ═══ BUDGET ═══ */}
      {activeTab === "budget" && (
        <div style={{ padding: "0 20px" }}>
          {/* Period badge */}
          <div style={{ display: "inline-block", padding: "6px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 20, fontSize: 13, color: "#a1a1aa", margin: "20px 0 16px" }}>
            {budgetPeriod.start} - {budgetPeriod.end}
          </div>

          {/* Donut + summary */}
          <div style={{ ...card, padding: 24, marginBottom: 16, textAlign: "center" }}>
            <DonutChart spent={discretionarySpend} committed={committedSpend} total={totalBudget} size={200} />
            <div style={{ marginTop: 20 }}>
              {discretionarySpend + committedSpend > totalBudget ? (
                <>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#ef4444" }}>{"\u00A3"}{((discretionarySpend + committedSpend) - totalBudget).toFixed(2)}</div>
                  <div style={{ fontSize: 12, color: "#71717a" }}>over your budget of {"\u00A3"}{totalBudget.toFixed(2)}</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#34d399" }}>{"\u00A3"}{(totalBudget - discretionarySpend - committedSpend).toFixed(2)}</div>
                  <div style={{ fontSize: 12, color: "#71717a" }}>left of {"\u00A3"}{totalBudget.toFixed(2)} budget</div>
                </>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 30, marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#818cf8" }} />
                <div style={{ textAlign: "left" }}><div style={{ fontSize: 13, fontWeight: 600 }}>Spending</div><div style={{ fontSize: 12, color: "#71717a" }}>{"\u00A3"}{discretionarySpend.toFixed(2)}</div></div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#c084fc" }} />
                <div style={{ textAlign: "left" }}><div style={{ fontSize: 13, fontWeight: 600 }}>Committed</div><div style={{ fontSize: 12, color: "#71717a" }}>{"\u00A3"}{committedSpend.toFixed(2)}</div></div>
              </div>
            </div>
          </div>

          {/* Daily allowance card */}
          <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>{"\u{1F4C5}"}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Daily allowance</div>
                <div style={{ fontSize: 12, color: "#71717a" }}>Until {budgetPeriod.end} {"\u00B7"} {daysLeft} days left</div>
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: dailyAllowance > 0 ? "#34d399" : "#ef4444" }}>{"\u00A3"}{dailyAllowance.toFixed(2)}</div>
          </div>

          {/* Recurring */}
          <div style={{ ...sectionLabel, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>RECURRING</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#a1a1aa", fontSize: 12 }}>{"\u00A3"}{recurringTotal.toFixed(2)}/mo</span>
              <button onClick={() => setEditingRecurring(editingRecurring === "all" ? null : "all")}
                style={{ background: "none", border: "none", color: "#818cf8", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                {editingRecurring === "all" ? "Done" : "Edit"}
              </button>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 16 }}>
            {recurring.map((r) => {
              const cat = getCat(r.categoryId);
              return (
                <div key={r.id} style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${cat.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{cat.icon}</div>
                  <div style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                    {editingRecurring === "all" ? (
                      <input defaultValue={r.merchant} onBlur={(e) => updateRecurringItem(r.id, "merchant", e.target.value)}
                        style={{ width: "100%", padding: "2px 4px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#e4e4e7", fontSize: 14 }} />
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{r.merchant}</div>
                    )}
                    <div style={{ fontSize: 12, color: "#52525b", marginTop: 2 }}>{r.frequency}{r.nextDate ? ` \u00B7 Next: ${r.nextDate}` : ""}</div>
                  </div>
                  {editingRecurring === "all" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, color: "#71717a" }}>{"\u00A3"}</span>
                      <input type="number" defaultValue={r.amount} onBlur={(e) => updateRecurringItem(r.id, "amount", e.target.value)}
                        style={{ width: 60, padding: "4px 6px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "#e4e4e7", fontSize: 13, textAlign: "right" }} />
                      <button onClick={() => deleteRecurringItem(r.id)}
                        style={{ background: "none", border: "none", color: "#ef4444", fontSize: 16, cursor: "pointer", padding: "0 4px" }}>{"\u2715"}</button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{"\u00A3"}{r.amount.toFixed(2)}</div>
                  )}
                </div>
              );
            })}
            {editingRecurring === "all" && (
              <button onClick={addRecurringItem}
                style={{ padding: "12px", marginTop: 8, background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 10, color: "#818cf8", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
                + Add recurring item
              </button>
            )}
          </div>

          {/* Category budgets — Emma style */}
          <div style={{ ...sectionLabel, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#818cf8" }}>Category budgets</span>
            <button onClick={() => setEditingBudget(editingBudget === "all" ? null : "all")}
              style={{ background: "none", border: "none", color: "#818cf8", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
              {editingBudget === "all" ? "Done" : "Edit \u25B6"}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {CATEGORIES.filter((c) => !EXCLUDED_FROM_SPENDING.includes(c.id)).sort((a, b) => (categorySpending[b.id]?.total || 0) - (categorySpending[a.id]?.total || 0)).map((cat) => {
              const budget = getBudget(cat.id);
              const spent = categorySpending[cat.id]?.total || 0;
              const isOver = budget > 0 && spent > budget;
              const left = budget - spent;
              if (!editingBudget && budget === 0 && spent === 0) return null;
              return (
                <div key={cat.id} style={{ padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${cat.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{cat.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{cat.label}</span>
                        {editingBudget === "all" ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 12, color: "#71717a" }}>{"\u00A3"}</span>
                            <input type="number" defaultValue={budget} onBlur={(e) => saveBudget(cat.id, e.target.value)}
                              style={{ width: 70, padding: "4px 6px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "#e4e4e7", fontSize: 14, fontWeight: 600, textAlign: "right" }} />
                          </div>
                        ) : (
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{spent > 0 ? `-\u00A3${spent.toFixed(2)}` : "\u00A30.00"}</span>
                        )}
                      </div>
                      {budget > 0 && !editingBudget && (
                        <div style={{ fontSize: 12, color: isOver ? "#ef4444" : "#71717a", marginTop: 2 }}>
                          {isOver ? `\u00A3${(spent - budget).toFixed(2)} over your budget of \u00A3${budget.toFixed(2)}` : `\u00A3${left.toFixed(2)} left of \u00A3${budget.toFixed(2)}`}
                        </div>
                      )}
                      {budget === 0 && !editingBudget && <div style={{ fontSize: 12, color: "#52525b" }}>No budget set</div>}
                    </div>
                  </div>
                  {budget > 0 && !editingBudget && (
                    <div style={{ marginLeft: 52, width: "calc(100% - 52px)", height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                      <div style={{ width: `${Math.min((spent / budget) * 100, 100)}%`, height: "100%", background: isOver ? "#ef4444" : cat.color, borderRadius: 2, transition: "width 0.4s" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ ANALYTICS ═══ */}
      {activeTab === "analytics" && (() => {
        const now = new Date();
        const ranges = {
          payday: { label: "Payday", days: now.getDate() <= 27 ? now.getDate() + (30 - 27) : now.getDate() - 27 },
          "30d": { label: "Monthly", days: 30 },
          "90d": { label: "Quarterly", days: 90 },
          custom: { label: "Custom", days: 0 },
          all: { label: "All", days: 9999 },
        };
        let cutoff, cutoffEnd = now;
        if (analyticsRange === "custom" && customDateFrom) {
          cutoff = new Date(customDateFrom);
          cutoffEnd = customDateTo ? new Date(customDateTo) : now;
        } else {
          cutoff = new Date(now.getTime() - (ranges[analyticsRange]?.days || 30) * 86400000);
        }
        const parseDate = (d) => {
          const parts = d.split(" ");
          const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
          return new Date(now.getFullYear(), months[parts[1]] ?? 0, parseInt(parts[0]) || 1);
        };
        const filteredTxns = allTransactions.filter((t) => {
          const d = parseDate(t.date);
          if (selectedAccounts && t.accountName && !selectedAccounts.includes(t.accountName)) return false;
          return d >= cutoff && d <= cutoffEnd;
        });
        const spendTxns = filteredTxns.filter((t) => t.amount < 0 && !EXCLUDED_FROM_SPENDING.includes(t.categoryId));
        const incomeTxns = filteredTxns.filter((t) => t.amount > 0 && !EXCLUDED_FROM_SPENDING.includes(t.categoryId));
        const fIncome = incomeTxns.reduce((s, t) => s + t.amount, 0);
        const fSpending = spendTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
        const fNet = fIncome - fSpending;

        // Category breakdown
        const catMap = {};
        spendTxns.forEach((t) => {
          if (!catMap[t.categoryId]) catMap[t.categoryId] = { total: 0, count: 0 };
          catMap[t.categoryId].total += Math.abs(t.amount);
          catMap[t.categoryId].count += 1;
        });
        const sortedCats = CATEGORIES.filter((c) => catMap[c.id]).sort((a, b) => (catMap[b.id]?.total || 0) - (catMap[a.id]?.total || 0));

        // Merchant breakdown
        const merchantMap = {};
        spendTxns.forEach((t) => {
          if (!merchantMap[t.merchant]) merchantMap[t.merchant] = { total: 0, count: 0 };
          merchantMap[t.merchant].total += Math.abs(t.amount);
          merchantMap[t.merchant].count += 1;
        });
        const sortedMerchants = Object.entries(merchantMap).sort((a, b) => b[1].total - a[1].total);

        const daysInRange = analyticsRange === "custom" ? Math.max(Math.ceil((cutoffEnd - cutoff) / 86400000), 1) : Math.max(ranges[analyticsRange]?.days || 30, 1);
        const dailyAvg = fSpending / Math.min(daysInRange, 365);

        // Period label
        const periodLabel = analyticsRange === "custom" && customDateFrom
          ? `${new Date(customDateFrom).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} - ${customDateTo ? new Date(customDateTo).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Now"}`
          : `${cutoff.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} - ${now.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;

        return (
        <div style={{ padding: "0 20px" }}>
          {/* Period badge + filter icons */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0 12px" }}>
            <button onClick={() => setShowPeriodPicker(!showPeriodPicker)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, fontSize: 13, color: "#a1a1aa", cursor: "pointer" }}>
              {periodLabel} {"\u25BE"}
            </button>
            <button onClick={() => setShowAccountFilter(true)}
              style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "50%", cursor: "pointer", fontSize: 14, color: "#71717a" }}>
              {"\u{1F3E6}"}
            </button>
          </div>

          {/* Period picker dropdown */}
          {showPeriodPicker && (
            <div style={{ ...card, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {Object.entries(ranges).map(([key, { label }]) => (
                  <button key={key} onClick={() => { setAnalyticsRange(key); if (key !== "custom") setShowPeriodPicker(false); }}
                    style={{ flex: 1, padding: "8px 0", fontSize: 12, border: "none", borderRadius: 8, cursor: "pointer",
                      background: analyticsRange === key ? "rgba(129,140,248,0.2)" : "rgba(255,255,255,0.04)",
                      color: analyticsRange === key ? "#818cf8" : "#71717a",
                      fontWeight: analyticsRange === key ? 600 : 400 }}>
                    {label}
                  </button>
                ))}
              </div>
              {analyticsRange === "custom" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: "#71717a", marginBottom: 4 }}>From</div>
                    <input type="date" value={customDateFrom} onChange={(e) => setCustomDateFrom(e.target.value)}
                      style={{ width: "100%", padding: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#e4e4e7", fontSize: 13 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: "#71717a", marginBottom: 4 }}>To</div>
                    <input type="date" value={customDateTo} onChange={(e) => setCustomDateTo(e.target.value)}
                      style={{ width: "100%", padding: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#e4e4e7", fontSize: 13 }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary card */}
          <div style={{ ...card, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#71717a" }}>Summary</div>
            <div style={{ fontSize: 30, fontWeight: 700, marginTop: 4, color: fNet >= 0 ? "#34d399" : "#e4e4e7" }}>{fNet >= 0 ? "+" : ""}{"\u00A3"}{Math.abs(fNet).toFixed(2)}</div>
            <BarChart income={fIncome} spending={fSpending} maxVal={Math.max(fIncome, fSpending) * 1.1} />
            <div style={{ display: "flex", justifyContent: "center", gap: 30, marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22d3ee" }} />
                <div><div style={{ fontSize: 12, color: "#71717a" }}>Income</div><div style={{ fontSize: 15, fontWeight: 600 }}>{"\u00A3"}{fIncome.toFixed(2)}</div></div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f472b6" }} />
                <div><div style={{ fontSize: 12, color: "#71717a" }}>Spending</div><div style={{ fontSize: 15, fontWeight: 600 }}>{"\u00A3"}{fSpending.toFixed(2)}</div></div>
              </div>
            </div>
          </div>

          {/* Category / Merchant toggle */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3, marginBottom: 16 }}>
            {[{ id: "category", label: "Category" }, { id: "merchant", label: "Merchant" }].map((v) => (
              <button key={v.id} onClick={() => setAnalyticsView(v.id)}
                style={{ flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 8, cursor: "pointer",
                  background: analyticsView === v.id ? "rgba(129,140,248,0.15)" : "transparent",
                  color: analyticsView === v.id ? "#818cf8" : "#71717a" }}>
                {v.label}
              </button>
            ))}
          </div>

          {/* Spending header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#818cf8" }}>Spending</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>-{"\u00A3"}{fSpending.toFixed(2)}</span>
          </div>

          {/* Category view */}
          {analyticsView === "category" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 20 }}>
              {sortedCats.map((cat) => {
                const data = catMap[cat.id];
                const pct = fSpending > 0 ? (data.total / fSpending) * 100 : 0;
                return (
                  <div key={cat.id} style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${cat.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{cat.icon}</div>
                    <div style={{ flex: 1, marginLeft: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{cat.label}</div>
                      <div style={{ fontSize: 12, color: "#71717a" }}>{data.count} Transaction{data.count !== 1 ? "s" : ""}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>-{"\u00A3"}{data.total.toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Merchant view */}
          {analyticsView === "merchant" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 20 }}>
              {sortedMerchants.map(([name, data]) => (
                <div key={name} style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "#71717a", flexShrink: 0 }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, marginLeft: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{name}</div>
                    <div style={{ fontSize: 12, color: "#71717a" }}>{data.count} Transaction{data.count !== 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>-{"\u00A3"}{data.total.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Income section */}
          {incomeTxns.length > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#34d399" }}>Income</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#34d399" }}>+{"\u00A3"}{fIncome.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 20 }}>
                {incomeTxns.map((tx) => {
                  const cat = getCat(tx.categoryId);
                  return (
                    <div key={tx.id} style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(52,211,153,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{cat.icon}</div>
                      <div style={{ flex: 1, marginLeft: 12 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{tx.merchant}</div>
                        <div style={{ fontSize: 12, color: "#71717a" }}>{tx.date}</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#34d399" }}>+{"\u00A3"}{tx.amount.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Quick stats */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <div style={{ ...card, flex: 1, textAlign: "center", padding: 16 }}>
              <div style={{ fontSize: 12, color: "#71717a" }}>Daily Avg</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#f472b6", marginTop: 6 }}>{"\u00A3"}{dailyAvg.toFixed(2)}</div>
            </div>
            <div style={{ ...card, flex: 1, textAlign: "center", padding: 16 }}>
              <div style={{ fontSize: 12, color: "#71717a" }}>Savings Rate</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: fIncome > 0 ? (fNet / fIncome > 0.2 ? "#34d399" : "#fbbf24") : "#71717a", marginTop: 6 }}>{fIncome > 0 ? Math.round((fNet / fIncome) * 100) : 0}%</div>
            </div>
          </div>

          {/* Insights */}
          {sortedCats.length > 0 && (
            <>
              <div style={sectionLabel}>INSIGHTS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                <div style={{ ...card, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Biggest category</div>
                  <div style={{ fontSize: 12, color: "#71717a", marginTop: 4 }}>
                    {sortedCats[0].icon} {sortedCats[0].label} is {fSpending > 0 ? ((catMap[sortedCats[0].id].total / fSpending) * 100).toFixed(0) : 0}% of spending
                  </div>
                </div>
                {sortedMerchants.length > 0 && (
                  <div style={{ ...card, padding: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Most visited</div>
                    <div style={{ fontSize: 12, color: "#71717a", marginTop: 4 }}>
                      {sortedMerchants[0][0]} — {sortedMerchants[0][1].count} visits, {"\u00A3"}{sortedMerchants[0][1].total.toFixed(2)}
                    </div>
                  </div>
                )}
                {sortedCats.filter((c) => getBudget(c.id) > 0 && catMap[c.id].total > getBudget(c.id)).length > 0 && (
                  <div style={{ ...card, padding: 14, borderColor: "rgba(239,68,68,0.3)" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#ef4444" }}>Over budget</div>
                    <div style={{ fontSize: 12, color: "#71717a", marginTop: 4 }}>
                      {sortedCats.filter((c) => getBudget(c.id) > 0 && catMap[c.id].total > getBudget(c.id)).map((c) => `${c.icon} ${c.label}`).join(", ")}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        );
      })()}

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
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div onClick={() => setShowAccountFilter(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
            <div style={{ position: "relative", width: "100%", maxWidth: 430, background: "#1a1a2e", borderRadius: "20px 20px 0 0", padding: "20px 24px 32px", maxHeight: "70vh", overflowY: "auto" }}>
              <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, margin: "0 auto 20px" }} />
              <div style={{ fontSize: 18, fontWeight: 700, textAlign: "center", marginBottom: 16 }}>Select accounts</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: "#818cf8" }}>Accounts ({accountNames.length})</span>
                <button onClick={() => { const all = selected.length === accountNames.length ? [] : accountNames; setSelectedAccounts(all); localStorage.setItem("selected_accounts", JSON.stringify(all)); }}
                  style={{ background: "none", border: "none", color: "#818cf8", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                  {selected.length === accountNames.length ? "Deselect all" : "Select all"}
                </button>
              </div>
              {accountNames.map((name) => (
                <div key={name} onClick={() => toggle(name)} style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${selected.includes(name) ? "#818cf8" : "rgba(255,255,255,0.15)"}`, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12, background: selected.includes(name) ? "rgba(129,140,248,0.15)" : "transparent" }}>
                    {selected.includes(name) && <span style={{ color: "#818cf8", fontSize: 14, fontWeight: 700 }}>{"\u2713"}</span>}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{name}</span>
                </div>
              ))}
              <button onClick={() => setShowAccountFilter(false)}
                style={{ width: "100%", padding: "14px", marginTop: 16, background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                Save
              </button>
            </div>
          </div>
        );
      })()}

      {editingTx !== null && <CategoryPicker onSelect={(catId) => handleCategoryChange(editingTx, catId)} onClose={() => setEditingTx(null)} />}
      <div style={{ textAlign: "center", padding: "30px 20px 10px", fontSize: 11, color: "#3f3f46" }}>
        {tlTokens.length > 0 ? "Live data via TrueLayer" : "Dummy data"} {"\u00B7"} Prototype v0.6
      </div>
    </div>
  );
}