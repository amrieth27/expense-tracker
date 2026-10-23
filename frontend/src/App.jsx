import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  CirclePlus,
  CreditCard,
  Ellipsis,
  LayoutDashboard,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const EXPENSE_CATEGORIES = ["Food", "Books", "Travel", "Housing", "Utilities", "Health", "Shopping", "Other"];
const INCOME_CATEGORIES = ["Salary", "Freelance", "Investment", "Gift", "Other"];
const COLORS = ["#6c8e72", "#d79665", "#8095c5", "#c88b9b", "#8e80b4", "#d6b554", "#66a6a0", "#b0a498"];
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function currentMonth() {
  return localDate().slice(0, 7);
}

function monthLabel(month) {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatMoney(value) {
  return currency.format(value || 0);
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (${response.status}).`);
  }
  return response.status === 204 ? null : response.json();
}

function App() {
  const [month, setMonth] = useState(currentMonth);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [budgetDrafts, setBudgetDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    type: "expense",
    amount: "",
    category: "Food",
    description: "",
    date: localDate(),
  });

  async function loadData(selectedMonth = month) {
    setLoading(true);
    setError("");
    try {
      const [items, monthBudgets] = await Promise.all([
        request(`/transactions?month=${selectedMonth}`),
        request(`/budgets?month=${selectedMonth}`),
      ]);
      setTransactions(items);
      setBudgets(monthBudgets);
      setBudgetDrafts(Object.fromEntries(monthBudgets.map((budget) => [budget.category, String(budget.limit)])));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(month);
  }, [month]);

  const totals = useMemo(() => {
    const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
    const spent = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
    const planned = budgets.reduce((sum, item) => sum + item.limit, 0);
    return { income, spent, planned, remaining: planned - spent, balance: income - spent };
  }, [transactions, budgets]);

  const categoryData = useMemo(() => {
    const grouped = transactions.filter((item) => item.type === "expense").reduce((result, item) => {
      result[item.category] = (result[item.category] || 0) + item.amount;
      return result;
    }, {});
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const dailyData = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const days = new Date(year, monthNumber, 0).getDate();
    const daily = Array.from({ length: days }, (_, index) => ({ day: index + 1, amount: 0 }));
    transactions.forEach((item) => {
      if (item.type === "expense") {
        const day = new Date(item.date).getDate();
        if (daily[day - 1]) daily[day - 1].amount += item.amount;
      }
    });
    return daily;
  }, [transactions, month]);

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return transactions.filter((item) => {
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const matchesQuery = !normalizedQuery
        || item.description.toLowerCase().includes(normalizedQuery)
        || item.category.toLowerCase().includes(normalizedQuery);
      return matchesType && matchesQuery;
    });
  }, [transactions, query, typeFilter]);

  function openNewForm() {
    setEditing(null);
    setForm({ type: "expense", amount: "", category: "Food", description: "", date: localDate() });
    setFormOpen(true);
  }

  function editTransaction(item) {
    setEditing(item._id);
    setForm({
      type: item.type,
      amount: String(item.amount),
      category: item.category,
      description: item.description || "",
      date: localDate(new Date(item.date)),
    });
    setFormOpen(true);
  }

  async function saveTransaction(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, amount: Number(form.amount), date: new Date(`${form.date}T12:00:00`).toISOString() };
      await request(editing ? `/transactions/${editing}` : "/transactions", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      setFormOpen(false);
      await loadData(month);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeTransaction(id) {
    if (!window.confirm("Delete this transaction? This cannot be undone.")) return;
    setError("");
    try {
      await request(`/transactions/${id}`, { method: "DELETE" });
      setTransactions((items) => items.filter((item) => item._id !== id));
    } catch (removeError) {
      setError(removeError.message);
    }
  }

  async function saveBudget(category) {
    const limit = Number(budgetDrafts[category]);
    if (!Number.isFinite(limit) || limit < 0) {
      setError("Enter a valid budget amount greater than or equal to zero.");
      return;
    }
    setError("");
    try {
      await request("/budgets", {
        method: "PUT",
        body: JSON.stringify({ month, category, limit }),
      });
      await loadData(month);
    } catch (budgetError) {
      setError(budgetError.message);
    }
  }

  const spentByCategory = useMemo(
    () => categoryData.reduce((result, item) => ({ ...result, [item.name]: item.value }), {}),
    [categoryData],
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="Ledger home">
          <span className="brand-mark"><Wallet size={20} strokeWidth={2.4} /></span>
          <span>ledger<span className="brand-period">.</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <a className="nav-link active" href="#overview"><LayoutDashboard size={18} /> Overview</a>
          <a className="nav-link" href="#transactions"><CreditCard size={18} /> Transactions</a>
          <a className="nav-link" href="#budgets"><ChartNoAxesCombined size={18} /> Budgets</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="tip-icon"><Sparkles size={16} /></div>
            <strong>Small steps add up.</strong>
            <p>Stay close to your spending and your goals will follow.</p>
          </div>
          <div className="user-profile">
            <div className="avatar">Y</div>
            <div><strong>Your finances</strong><span>Personal workspace</span></div>
            <Ellipsis size={19} className="muted-icon" />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">Workspace <span>/</span> <strong>Overview</strong></div>
          <div className="topbar-actions">
            <label className="month-picker">
              <CalendarDays size={16} />
              <input aria-label="Choose month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            </label>
            <button className="button button-primary top-add" onClick={openNewForm}><Plus size={17} /> Add transaction</button>
          </div>
        </header>

        <div className="page-content" id="overview">
          <section className="page-heading">
            <div>
              <div className="eyebrow">{monthLabel(month)}</div>
              <h1>Your money, <span>in perspective.</span></h1>
              <p>A little clarity goes a long way. Here's how this month is shaping up.</p>
            </div>
            <div className="month-tag"><span className="status-dot" /> Monthly overview</div>
          </section>

          {error && <div className="error-banner" role="alert">{error}<button aria-label="Dismiss error" onClick={() => setError("")}><X size={16} /></button></div>}

          <section className="summary-grid" aria-label="Monthly summary">
            <SummaryCard title="Total income" amount={totals.income} icon={<ArrowDownLeft size={19} />} tone="green" note="Money in this month" />
            <SummaryCard title="Total expenses" amount={totals.spent} icon={<ArrowUpRight size={19} />} tone="orange" note={`${transactions.filter((item) => item.type === "expense").length} transactions`} />
            <SummaryCard title="Budget remaining" amount={totals.remaining} icon={<Wallet size={19} />} tone="blue" note={totals.planned ? `of ${formatMoney(totals.planned)} planned` : "Set a budget to get started"} />
            <SummaryCard title="Net cash flow" amount={totals.balance} icon={<ArrowDownRight size={19} />} tone="purple" note="Income minus expenses" />
          </section>

          <section className="charts-grid">
            <article className="panel spending-panel">
              <div className="panel-heading">
                <div><h2>Spending activity</h2><p>Your daily expense rhythm</p></div>
                <span className="chart-legend"><i /> Expenses</span>
              </div>
              <div className="chart-wrap area-wrap">
                {loading ? <Loading /> : transactions.length === 0 ? <EmptyChart text="Add a few expenses to see your spending activity." /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyData} margin={{ top: 12, right: 6, left: -15, bottom: 0 }}>
                      <defs><linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#739a78" stopOpacity={0.2} /><stop offset="95%" stopColor="#739a78" stopOpacity={0.01} /></linearGradient></defs>
                      <CartesianGrid stroke="#edf0eb" vertical={false} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#9ba39c", fontSize: 11 }} tickFormatter={(value) => value % 5 === 1 || value === 1 ? value : ""} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ba39c", fontSize: 11 }} tickFormatter={(value) => `$${value}`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="amount" stroke="#739a78" strokeWidth={2.5} fill="url(#spendFill)" activeDot={{ r: 5, strokeWidth: 0, fill: "#739a78" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="chart-footnote"><span>Daily spend across {monthLabel(month)}</span><span>{formatMoney(totals.spent)} total</span></div>
            </article>
            <article className="panel category-panel">
              <div className="panel-heading">
                <div><h2>Where it goes</h2><p>Expense breakdown by category</p></div>
                <button className="icon-button" aria-label="Go to budgets" onClick={() => document.getElementById("budgets")?.scrollIntoView({ behavior: "smooth" })}><Ellipsis size={20} /></button>
              </div>
              {loading ? <Loading /> : categoryData.length === 0 ? <EmptyChart text="Your category breakdown will appear here." /> : (
                <>
                  <div className="donut-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={63} outerRadius={88} paddingAngle={3} stroke="none">
                          {categoryData.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="donut-center"><span>Spent</span><strong>{formatMoney(totals.spent)}</strong></div>
                  </div>
                  <div className="category-legend">
                    {categoryData.slice(0, 4).map((item, index) => (
                      <div className="legend-row" key={item.name}><span className="legend-name"><i style={{ backgroundColor: COLORS[index % COLORS.length] }} />{item.name}</span><strong>{formatMoney(item.value)}</strong></div>
                    ))}
                  </div>
                </>
              )}
            </article>
          </section>

          <section className="lower-grid">
            <article className="panel transactions-panel" id="transactions">
              <div className="panel-heading transaction-heading">
                <div><h2>Recent transactions</h2><p>Your activity for {monthLabel(month)}</p></div>
                <button className="button button-outline" onClick={openNewForm}><CirclePlus size={16} /> New entry</button>
              </div>
              <div className="table-toolbar">
                <div className="search-field"><Search size={15} /><input aria-label="Search transactions" placeholder="Search transactions..." value={query} onChange={(event) => setQuery(event.target.value)} /></div>
                <select aria-label="Filter transactions" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                  <option value="all">All activity</option><option value="expense">Expenses</option><option value="income">Income</option>
                </select>
              </div>
              <div className="transaction-list">
                {loading ? <Loading /> : filteredTransactions.length === 0 ? (
                  <div className="empty-transactions"><span className="empty-icon"><CreditCard size={20} /></span><strong>{transactions.length ? "No matching transactions" : "A fresh start"}</strong><p>{transactions.length ? "Try another search or filter." : "Add your first entry and start seeing your finances clearly."}</p>{!transactions.length && <button className="text-button" onClick={openNewForm}>Add first transaction <ArrowUpRight size={14} /></button>}</div>
                ) : filteredTransactions.slice(0, 8).map((item) => (
                  <div className="transaction-row" key={item._id}>
                    <div className={`transaction-icon ${item.type}`}><CategoryIcon category={item.category} /></div>
                    <div className="transaction-name"><strong>{item.description || item.category}</strong><span>{item.category} <i>·</i> {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div>
                    <div className={`transaction-amount ${item.type}`}>{item.type === "income" ? "+" : "−"}{formatMoney(item.amount)}</div>
                    <div className="row-actions">
                      <button className="icon-button small" aria-label={`Edit ${item.description || item.category}`} onClick={() => editTransaction(item)}><Pencil size={14} /></button>
                      <button className="icon-button small delete-action" aria-label={`Delete ${item.description || item.category}`} onClick={() => removeTransaction(item._id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
              {filteredTransactions.length > 8 && <div className="list-footer">Showing 8 of {filteredTransactions.length} transactions</div>}
            </article>

            <article className="panel budgets-panel" id="budgets">
              <div className="panel-heading">
                <div><h2>Monthly budgets</h2><p>Keep your spending on track</p></div>
                <span className="budget-total">{formatMoney(totals.planned)} planned</span>
              </div>
              <div className="budget-list">
                {EXPENSE_CATEGORIES.slice(0, 6).map((category, index) => {
                  const limit = Number(budgetDrafts[category] ?? "");
                  const spent = spentByCategory[category] || 0;
                  const progress = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
                  const over = limit > 0 && spent > limit;
                  return (
                    <div className="budget-item" key={category}>
                      <div className="budget-topline">
                        <span className="budget-category"><i style={{ backgroundColor: COLORS[index % COLORS.length] }} />{category}</span>
                        <span className={over ? "over-budget" : ""}>{formatMoney(spent)} <em>/</em></span>
                      </div>
                      <div className={`progress-track ${over ? "over" : ""}`}><div style={{ width: `${progress}%`, backgroundColor: COLORS[index % COLORS.length] }} /></div>
                      <div className="budget-edit-row">
                        <span>{over ? `${formatMoney(spent - limit)} over` : limit ? `${formatMoney(Math.max(limit - spent, 0))} left` : "Set a monthly limit"}</span>
                        <div className="budget-input-wrap"><span>$</span><input aria-label={`${category} budget limit`} type="number" min="0" step="1" placeholder="Limit" value={budgetDrafts[category] ?? ""} onChange={(event) => setBudgetDrafts((drafts) => ({ ...drafts, [category]: event.target.value }))} onBlur={() => { if (budgetDrafts[category] !== undefined && budgetDrafts[category] !== "" && Number(budgetDrafts[category]) !== (budgets.find((item) => item.category === category)?.limit || 0)) saveBudget(category); }} onKeyDown={(event) => { if (event.key === "Enter") { event.currentTarget.blur(); } }} /></div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="budget-note"><Sparkles size={15} /><span>Budgets are a guide, not a rule. Adjust them any time.</span></div>
            </article>
          </section>
          <footer className="page-footer"><span>Made for a little more peace of mind.</span><span>Ledger <i>·</i> Personal finance, made simple</span></footer>
        </div>
      </main>

      {formOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}>
          <form className="transaction-modal" onSubmit={saveTransaction}>
            <div className="modal-heading"><div><span className="eyebrow">{editing ? "EDIT ENTRY" : "NEW ENTRY"}</span><h2>{editing ? "Update transaction" : "Add a transaction"}</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setFormOpen(false)}><X size={20} /></button></div>
            <div className="type-toggle">
              <button type="button" className={form.type === "expense" ? "selected expense-select" : ""} onClick={() => setForm((current) => ({ ...current, type: "expense", category: "Food" }))}><ArrowUpRight size={16} /> Expense</button>
              <button type="button" className={form.type === "income" ? "selected income-select" : ""} onClick={() => setForm((current) => ({ ...current, type: "income", category: "Salary" }))}><ArrowDownLeft size={16} /> Income</button>
            </div>
            <label className="form-label">Amount <span className="amount-field"><span>$</span><input type="number" min="0.01" step="0.01" required autoFocus placeholder="0.00" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} /></span></label>
            <div className="form-two-columns">
              <label className="form-label">Category<select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>{(form.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((category) => <option key={category}>{category}</option>)}</select></label>
              <label className="form-label">Date<input type="date" required value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} /></label>
            </div>
            <label className="form-label">Description <span className="optional-label">Optional</span><input type="text" maxLength="120" placeholder="What was this for?" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
            <div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setFormOpen(false)}>Cancel</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? <LoaderCircle className="spinner" size={16} /> : <Plus size={16} />}{editing ? "Save changes" : "Add transaction"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, amount, icon, tone, note }) {
  return (
    <article className="summary-card">
      <div className="summary-card-top"><span>{title}</span><span className={`summary-icon ${tone}`}>{icon}</span></div>
      <strong className="summary-amount">{formatMoney(amount)}</strong>
      <span className="summary-note"><i className={`note-dot ${tone}`} />{note}</span>
    </article>
  );
}

function CategoryIcon({ category }) {
  const initial = category?.slice(0, 1).toUpperCase() || "•";
  return <span>{initial}</span>;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><span>{typeof label === "number" ? `Day ${label}` : label || payload[0].name}</span><strong>{formatMoney(payload[0].value)}</strong></div>;
}

function Loading() {
  return <div className="loading-state"><LoaderCircle size={20} className="spinner" />Loading your finances...</div>;
}

function EmptyChart({ text }) {
  return <div className="empty-chart"><div className="empty-chart-icon"><ChartNoAxesCombined size={21} /></div><span>{text}</span></div>;
}

export default App;
