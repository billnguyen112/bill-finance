import { useState, useMemo, useEffect, useCallback } from "react";

// ── Data ──────────────────────────────────────────────
const ACCOUNTS = [
  { name: "IBKR", type: "Brokerage", balance: 14820.5, change: 3.2, currency: "USD" },
  { name: "Trading 212 ISA", type: "ISA", balance: 8340.15, change: 1.8, currency: "GBP" },
  { name: "Kraken", type: "Crypto", balance: 0, change: 0, currency: "GBP" },
  { name: "Monzo", type: "Bank", balance: 2145.8, change: null, currency: "GBP" },
  { name: "HSBC", type: "Bank", balance: 5620.3, change: null, currency: "GBP" },
  { name: "Republic", type: "Private Equity", balance: 1500, change: null, currency: "USD" },
];

const HOLDINGS = [
  { ticker: "TSEM", name: "Tower Semi", value: 3200, costBasis: 2650, pnl: 12.4, account: "IBKR", sparkline: [42, 45, 43, 48, 52, 55, 53, 58] },
  { ticker: "FTC.L", name: "Filtronic", value: 2800, costBasis: 2890, pnl: -3.1, account: "IBKR", sparkline: [38, 40, 37, 35, 36, 34, 33, 35] },
  { ticker: "SIVE", name: "Sievert Larsen", value: 2100, costBasis: 1880, pnl: 8.7, account: "IBKR", sparkline: [20, 22, 21, 24, 23, 25, 27, 26] },
  { ticker: "IQE", name: "IQE plc", value: 1900, costBasis: 1923, pnl: -1.2, account: "IBKR", sparkline: [15, 16, 15, 14, 15, 14, 13, 14] },
  { ticker: "GLD", name: "SPDR Gold", value: 2400, costBasis: 2240, pnl: 5.6, account: "IBKR", sparkline: [180, 182, 185, 183, 188, 190, 192, 194] },
  { ticker: "META", name: "Meta Platforms", value: 2420, costBasis: 2370, pnl: 2.1, account: "IBKR", sparkline: [500, 510, 505, 520, 515, 525, 530, 528] },
  { ticker: "VUSA", name: "Vanguard S&P 500", value: 4200, costBasis: 3920, pnl: 4.3, account: "T212", sparkline: [72, 73, 74, 73, 75, 76, 77, 78] },
  { ticker: "SMT.L", name: "Scottish Mortgage", value: 2100, costBasis: 2117, pnl: -0.8, account: "T212", sparkline: [900, 910, 895, 880, 890, 885, 880, 875] },
  { ticker: "EQQQ", name: "Invesco NASDAQ", value: 2040, costBasis: 1978, pnl: 3.1, account: "T212", sparkline: [340, 345, 342, 350, 348, 355, 358, 360] },
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
  { id: "general", label: "General", icon: "\u{1F4CC}", color: "#a1a1aa", budget: 0 },
];

const RECURRING = [
  { merchant: "Rightmove Rent", amount: 1050, categoryId: "housing", frequency: "Monthly", nextDate: "27 Apr" },
  { merchant: "Emma", amount: 9.99, categoryId: "subscriptions", frequency: "Monthly", nextDate: "29 Apr" },
  { merchant: "Netflix", amount: 10.99, categoryId: "subscriptions", frequency: "Monthly", nextDate: "25 Apr" },
  { merchant: "TfL Auto Top-up", amount: 20, categoryId: "transport", frequency: "Weekly", nextDate: "2 Apr" },
  { merchant: "Vietnam Family Transfer", amount: 245.35, categoryId: "family", frequency: "Monthly", nextDate: "24 Apr" },
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

// ── TrueLayer helpers ────────────────────────────────
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

// ── Main ──────────────────────────────────────────────
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [transactions, setTransactions] = useState(initialTransactions);
  const [editingTx, setEditingTx] = useState(null);
  const [holdingsSort, setHoldingsSort] = useState("pnl_abs");
  const budgetPeriod = { start: "27 Mar", end: "27 Apr" };

  // TrueLayer state
  const [tlToken, setTlToken] = useState(() => localStorage.getItem("tl_token") || null);
  const [tlAccounts, setTlAccounts] = useState([]);
  const [tlTransactions, setTlTransactions] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState(null);

  // Handle OAuth callback — token comes back from Express server via redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("tl_token");
    const error = params.get("tl_error");
    window.history.replaceState({}, "", window.location.pathname);
    if (token) {
      localStorage.setItem("tl_token", token);
      setTlToken(token);
    } else if (error) {
      setBankError(error);
    }
  }, []);

  // Fetch bank data when token is available
  const loadBankData = useCallback(async () => {
    if (!tlToken) return;
    setBankLoading(true);
    setBankError(null);
    try {
      const accountsRes = await fetchAccounts(tlToken);
      const accounts = accountsRes.results || [];

      // Fetch balances for each account
      const withBalances = await Promise.all(
        accounts.map(async (acc) => {
          try {
            const balRes = await fetchBalance(tlToken, acc.account_id);
            const bal = balRes.results?.[0];
            return { ...acc, balance: bal?.current || 0, currency: bal?.currency || acc.currency };
          } catch {
            return { ...acc, balance: 0 };
          }
        })
      );
      setTlAccounts(withBalances);

      // Fetch transactions for each account
      const allTxns = [];
      for (const acc of accounts) {
        try {
          const txRes = await fetchTransactions(tlToken, acc.account_id);
          const txns = txRes.results || [];
          txns.forEach((tx) => {
            allTxns.push({
              id: `tl_${tx.transaction_id}`,
              date: new Date(tx.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
              merchant: tx.merchant_name || tx.description || "Unknown",
              amount: tx.transaction_type === "DEBIT" ? -Math.abs(tx.amount) : Math.abs(tx.amount),
              categoryId: tx.transaction_category === "PURCHASE" ? "shopping"
                : tx.transaction_category === "BILL_PAYMENT" ? "bills"
                : tx.transaction_category === "TRANSFER" ? "general"
                : "general",
              pending: tx.transaction_classification?.includes("PENDING") || false,
              source: "truelayer",
              accountName: acc.display_name || acc.provider?.display_name || "Bank",
            });
          });
        } catch {
          // skip failed account
        }
      }
      setTlTransactions(allTxns);
    } catch (err) {
      setBankError(err.message);
      if (err.message?.includes("401") || err.message?.includes("unauthorized")) {
        localStorage.removeItem("tl_token");
        setTlToken(null);
      }
    } finally {
      setBankLoading(false);
    }
  }, [tlToken]);

  useEffect(() => {
    loadBankData();
  }, [loadBankData]);

  const disconnectBank = () => {
    localStorage.removeItem("tl_token");
    setTlToken(null);
    setTlAccounts([]);
    setTlTransactions([]);
  };

  // Merge TrueLayer accounts with hardcoded ones
  const bankAccounts = tlAccounts.map((acc) => ({
    name: acc.display_name || acc.provider?.display_name || "Bank Account",
    type: "Bank",
    balance: acc.balance,
    change: null,
    currency: acc.currency || "GBP",
    source: "truelayer",
  }));

  // If we have real bank accounts, replace the hardcoded bank entries
  const mergedAccounts = tlAccounts.length > 0
    ? [...ACCOUNTS.filter((a) => a.type !== "Bank"), ...bankAccounts]
    : ACCOUNTS;

  // Merge transactions
  const mergedTransactions = tlTransactions.length > 0
    ? [...tlTransactions, ...initialTransactions.filter((t) => !["income", "work_travel"].includes(t.categoryId) === false || true)]
    : initialTransactions;

  const totalNetWorth = mergedAccounts.reduce((s, a) => s + a.balance, 0);
  const totalInvested = mergedAccounts.filter((a) => ["Brokerage", "ISA", "Private Equity", "Crypto"].includes(a.type)).reduce((s, a) => s + a.balance, 0);
  const totalCash = mergedAccounts.filter((a) => a.type === "Bank").reduce((s, a) => s + a.balance, 0);

  const income = useMemo(() => transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0), [transactions]);
  const spending = useMemo(() => transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0), [transactions]);
  const netFlow = income - spending;
  const savingsRate = income > 0 ? Math.round(((income - spending) / income) * 100) : 0;

  MONTHLY_SAVINGS[MONTHLY_SAVINGS.length - 1].rate = savingsRate;

  const categorySpending = useMemo(() => {
    const map = {};
    transactions.filter((t) => t.amount < 0).forEach((t) => {
      if (!map[t.categoryId]) map[t.categoryId] = { total: 0, count: 0 };
      map[t.categoryId].total += Math.abs(t.amount);
      map[t.categoryId].count += 1;
    });
    return map;
  }, [transactions]);

  const totalBudget = CATEGORIES.filter((c) => c.budget > 0).reduce((s, c) => s + c.budget, 0);
  const discretionarySpend = CATEGORIES.filter((c) => c.budget > 0).reduce((s, c) => s + (categorySpending[c.id]?.total || 0), 0);
  const committedSpend = (categorySpending["housing"]?.total || 0) + (categorySpending["bills"]?.total || 0) + (categorySpending["subscriptions"]?.total || 0);
  const variableSpend = discretionarySpend - committedSpend;
  const daysLeft = 29;
  const dailyAllowance = Math.max((totalBudget - discretionarySpend) / daysLeft, 0);
  const recurringTotal = RECURRING.reduce((s, r) => s + r.amount, 0);

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
    setTransactions((prev) => prev.map((t) => (t.id === txId ? { ...t, categoryId: newCatId } : t)));
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
          {!tlToken ? (
            <button onClick={startBankConnect}
              style={{ width: "100%", padding: "14px 16px", marginBottom: 12, background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🏦</span> Connect Your Bank
            </button>
          ) : (
            <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderColor: "rgba(99,102,241,0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🏦</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#818cf8" }}>Bank Connected</div>
                  <div style={{ fontSize: 11, color: "#71717a" }}>{tlAccounts.length} account{tlAccounts.length !== 1 ? "s" : ""} linked</div>
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
      {activeTab === "transactions" && (
        <div style={{ padding: "0 20px" }}>
          {transactions.some((t) => t.pending) && (
            <>
              <div style={{ ...sectionLabel, display: "flex", justifyContent: "space-between" }}>
                <span>PENDING</span>
                <span style={{ color: "#ef4444" }}>-{"\u00A3"}{transactions.filter((t) => t.pending && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0).toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {transactions.filter((t) => t.pending).map((tx) => {
                  const cat = getCat(tx.categoryId);
                  return (
                    <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 20 }}>{cat.icon}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.merchant}</div>
                          <button onClick={() => setEditingTx(tx.id)} style={{ fontSize: 11, color: cat.color, background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>{cat.label} <span style={{ fontSize: 9 }}>{"\u270E"}</span></button>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e4e4e7", whiteSpace: "nowrap" }}>{"\u00A3"}{Math.abs(tx.amount).toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          <div style={sectionLabel}>SETTLED</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {transactions.filter((t) => !t.pending).map((tx) => {
              const cat = getCat(tx.categoryId);
              return (
                <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 20 }}>{cat.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.merchant}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, color: "#52525b" }}>{tx.date}</span>
                        <button onClick={() => setEditingTx(tx.id)} style={{ fontSize: 11, color: cat.color, background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>{cat.label} <span style={{ fontSize: 9 }}>{"\u270E"}</span></button>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: tx.amount >= 0 ? "#34d399" : "#e4e4e7", whiteSpace: "nowrap" }}>{tx.amount >= 0 ? "+" : ""}{"\u00A3"}{Math.abs(tx.amount).toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ BUDGET ═══ */}
      {activeTab === "budget" && (
        <div style={{ padding: "0 20px" }}>
          <div style={sectionLabel}>{budgetPeriod.start.toUpperCase()} {"\u2013"} {budgetPeriod.end.toUpperCase()}</div>
          <div style={{ ...card, padding: 20, marginBottom: 16 }}>
            <DonutChart spent={variableSpend} committed={committedSpend} total={totalBudget} size={180} />
            <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#818cf8" }} />
                <div><div style={{ fontSize: 11, color: "#71717a" }}>Spending</div><div style={{ fontSize: 13, fontWeight: 600 }}>{"\u00A3"}{variableSpend.toFixed(2)}</div></div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#c084fc" }} />
                <div><div style={{ fontSize: 11, color: "#71717a" }}>Committed</div><div style={{ fontSize: 13, fontWeight: 600 }}>{"\u00A3"}{committedSpend.toFixed(2)}</div></div>
              </div>
            </div>
          </div>

          {/* Daily allowance */}
          <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div><div style={{ fontSize: 14, fontWeight: 500 }}>Daily allowance</div><div style={{ fontSize: 11, color: "#71717a" }}>Until {budgetPeriod.end}</div></div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#34d399" }}>{"\u00A3"}{dailyAllowance.toFixed(2)}</div>
          </div>

          {/* Recurring */}
          <div style={{ ...sectionLabel, display: "flex", justifyContent: "space-between" }}>
            <span>RECURRING</span>
            <span style={{ color: "#a1a1aa" }}>{"\u00A3"}{recurringTotal.toFixed(2)}/mo</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 8 }}>
            {RECURRING.map((r, i) => {
              const cat = getCat(r.categoryId);
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{cat.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{r.merchant}</div>
                      <div style={{ fontSize: 11, color: "#52525b" }}>{r.frequency} {"\u00B7"} Next: {r.nextDate}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{"\u00A3"}{r.amount.toFixed(2)}</div>
                </div>
              );
            })}
          </div>

          {/* Category budgets */}
          <div style={sectionLabel}>CATEGORY BUDGETS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {CATEGORIES.filter((c) => c.budget > 0).map((cat) => {
              const spent = categorySpending[cat.id]?.total || 0;
              const isOver = spent > cat.budget;
              const left = cat.budget - spent;
              return (
                <div key={cat.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 16 }}>{cat.icon}</span><span style={{ fontSize: 13, fontWeight: 500 }}>{cat.label}</span></div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>-{"\u00A3"}{spent.toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: isOver ? "#ef4444" : "#71717a", marginBottom: 6 }}>
                    {isOver ? `\u00A3${(spent - cat.budget).toFixed(2)} over budget of \u00A3${cat.budget.toFixed(0)}` : `\u00A3${left.toFixed(2)} left of \u00A3${cat.budget.toFixed(0)}`}
                  </div>
                  <ProgressBar value={spent} max={cat.budget} color={cat.color} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ ANALYTICS ═══ */}
      {activeTab === "analytics" && (
        <div style={{ padding: "0 20px" }}>
          <div style={sectionLabel}>{budgetPeriod.start.toUpperCase()} {"\u2013"} {budgetPeriod.end.toUpperCase()}</div>
          <div style={{ ...card, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#71717a" }}>Summary</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4, color: netFlow >= 0 ? "#34d399" : "#ef4444" }}>{netFlow >= 0 ? "+" : ""}{"\u00A3"}{netFlow.toFixed(2)}</div>
            <BarChart income={income} spending={spending} maxVal={Math.max(income, spending) * 1.1} />
            <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22d3ee" }} />
                <div><div style={{ fontSize: 11, color: "#71717a" }}>Income</div><div style={{ fontSize: 14, fontWeight: 600 }}>{"\u00A3"}{income.toFixed(2)}</div></div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f472b6" }} />
                <div><div style={{ fontSize: 11, color: "#71717a" }}>Spending</div><div style={{ fontSize: 14, fontWeight: 600 }}>{"\u00A3"}{spending.toFixed(2)}</div></div>
              </div>
            </div>
          </div>
          <div style={sectionLabel}>SPENDING BY CATEGORY</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {CATEGORIES.filter((c) => categorySpending[c.id] && c.id !== "income" && c.id !== "work_travel").sort((a, b) => (categorySpending[b.id]?.total || 0) - (categorySpending[a.id]?.total || 0)).map((cat) => {
              const data = categorySpending[cat.id];
              return (
                <div key={cat.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{cat.icon}</span>
                    <div><div style={{ fontSize: 13, fontWeight: 500 }}>{cat.label}</div><div style={{ fontSize: 11, color: "#71717a" }}>{data.count} txn{data.count !== 1 ? "s" : ""}</div></div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>-{"\u00A3"}{data.total.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
          <div style={sectionLabel}>INCOME</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {transactions.filter((t) => t.amount > 0).map((tx) => {
              const cat = getCat(tx.categoryId);
              return (
                <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{cat.icon}</span>
                    <div><div style={{ fontSize: 13, fontWeight: 500 }}>{tx.merchant}</div><div style={{ fontSize: 11, color: "#71717a" }}>{tx.date}</div></div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#34d399" }}>+{"\u00A3"}{tx.amount.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {editingTx !== null && <CategoryPicker onSelect={(catId) => handleCategoryChange(editingTx, catId)} onClose={() => setEditingTx(null)} />}
      <div style={{ textAlign: "center", padding: "30px 20px 10px", fontSize: 11, color: "#3f3f46" }}>
        {tlToken ? "Live data via TrueLayer" : "Dummy data"} {"\u00B7"} Prototype v0.4
      </div>
    </div>
  );
}