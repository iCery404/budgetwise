import { useEffect, useState, useCallback } from "react";
import api from "../api";
import { ProgressBar, budgetColor, MonthYearPicker, peso, fmtDate } from "../components/Shared";
import Icon from "../components/Icon";

const now = new Date();
const PAYMENT_METHODS = ["Cash", "GCash", "Bank Transfer", "Credit Card", "Debit Card"];

export default function Transactions() {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [showRecurring, setShowRecurring] = useState(false);
  const [loading, setLoading] = useState(true);

  const [showTxForm, setShowTxForm] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [showRecForm, setShowRecForm] = useState(false);
  const [formError, setFormError] = useState("");

  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  const load = useCallback(async () => {
    setLoading(true);
    await api.post("/recurring/run", { month, year }).catch(() => {});
    const params = new URLSearchParams({ from, to });
    if (categoryFilter) params.set("category_id", categoryFilter);
    if (search.trim()) params.set("search", search.trim());
    const [txRes, budRes, catRes, recRes] = await Promise.all([
      api.get(`/transactions?${params.toString()}`),
      api.get(`/budgets?month=${month}&year=${year}`),
      api.get("/categories"),
      api.get("/recurring"),
    ]);
    setTransactions(txRes.data);
    setBudgets(budRes.data);
    setCategories(catRes.data);
    setRecurring(recRes.data);
    setLoading(false);
  }, [from, to, month, year, categoryFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const remaining = totalIncome - totalExpense;

  const visibleTx = filterType === "all" ? transactions : transactions.filter((t) => t.type === filterType);

  async function handleDeleteTx(id) {
    if (!confirm("Delete this transaction?")) return;
    await api.delete(`/transactions/${id}`);
    load();
  }

  async function handleDeleteBudget(id) {
    if (!confirm("Delete this budget?")) return;
    await api.delete(`/budgets/${id}`);
    load();
  }

  async function handleDeleteRecurring(id) {
    if (!confirm("Delete this recurring rule?")) return;
    await api.delete(`/recurring/${id}`);
    load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-semibold">Transactions &amp; Budget</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Income, expenses, and budgets together. Remaining balance updates automatically.
          </p>
        </div>
        <MonthYearPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="text-[10.5px] uppercase tracking-wide text-text-muted mb-1">Income this period</div>
          <div className="text-lg font-semibold text-sage">{peso(totalIncome)}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="text-[10.5px] uppercase tracking-wide text-text-muted mb-1">Expenses this period</div>
          <div className="text-lg font-semibold text-rose">{peso(totalExpense)}</div>
        </div>
        <div className="bg-sage-deep rounded-2xl p-4 shadow-sm">
          <div className="text-[10.5px] uppercase tracking-wide text-white/70 mb-1">
            Remaining (income &minus; expenses)
          </div>
          <div className="text-lg font-semibold text-white">{peso(remaining)}</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-sm">Budgets for this period</div>
          <button
            onClick={() => { setEditingBudget(null); setFormError(""); setShowBudgetForm(true); }}
            className="flex items-center gap-1.5 bg-sage text-white text-xs font-medium px-3 py-1.5 rounded-lg"
          >
            <Icon name="plus" size={14} /> Set Budget
          </button>
        </div>
        {budgets.length === 0 ? (
          <div className="text-center text-text-muted text-sm py-6">No budgets set for this period yet.</div>
        ) : (
          <div className="space-y-3">
            {budgets.map((b) => {
              const pct = b.amount > 0 ? Math.round((b.spent / b.amount) * 100) : 0;
              return (
                <div key={b.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[13px] font-medium text-text-body">{b.category_name}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[12px] text-text-muted mr-1">
                        {peso(b.spent)} / {peso(b.amount)}
                      </span>
                      <button
                        onClick={() => { setEditingBudget(b); setFormError(""); setShowBudgetForm(true); }}
                        className="p-1 text-text-muted hover:text-sage"
                      >
                        <Icon name="edit" size={14} />
                      </button>
                      <button onClick={() => handleDeleteBudget(b.id)} className="p-1 text-text-muted hover:text-rose">
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                  <ProgressBar pct={pct} color={budgetColor(pct)} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm mb-5">
        <button
          onClick={() => setShowRecurring((v) => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="font-semibold text-sm">Recurring Transactions</span>
          <span className="text-xs text-sage font-medium">{showRecurring ? "Hide" : "Show"}</span>
        </button>
        {showRecurring && (
          <div className="mt-3 pt-3 border-t border-border">
            {recurring.length === 0 ? (
              <div className="text-center text-text-muted text-sm py-4">No recurring rules yet.</div>
            ) : (
              <div className="space-y-2 mb-3">
                {recurring.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-[12.5px]">
                    <span className="text-text-body">
                      {r.description}
                      {r.category_name ? ` \u00b7 ${r.category_name}` : ""} &middot; Day {r.day_of_month} &middot; {peso(r.amount)}
                    </span>
                    <button onClick={() => handleDeleteRecurring(r.id)} className="p-1 text-text-muted hover:text-rose">
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => { setFormError(""); setShowRecForm(true); }}
              className="text-xs font-medium text-sage"
            >
              + Add rule
            </button>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex gap-1.5 bg-muted rounded-lg p-1">
            {["all", "income", "expense"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize ${
                  filterType === t ? "bg-card shadow-sm text-text" : "text-text-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setEditingTx(null); setFormError(""); setShowTxForm(true); }}
            className="flex items-center gap-1.5 bg-sage text-white text-xs font-medium px-3 py-1.5 rounded-lg"
          >
            <Icon name="plus" size={14} /> Add Transaction
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative flex-1 min-w-[160px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
              <Icon name="search" size={14} />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description..."
              className="w-full pl-8 pr-3 py-1.5 border border-border rounded-lg text-xs"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 border border-border rounded-lg text-xs"
          >
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-center text-text-muted text-sm py-8">Loading...</div>
        ) : visibleTx.length === 0 ? (
          <div className="text-center text-text-muted text-sm py-8">No transactions found for this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-text-muted border-b border-border">
                  <th className="text-left font-medium pb-2">Date</th>
                  <th className="text-left font-medium pb-2">Type</th>
                  <th className="text-left font-medium pb-2">Category</th>
                  <th className="text-left font-medium pb-2">Description</th>
                  <th className="text-left font-medium pb-2">Payment</th>
                  <th className="text-right font-medium pb-2">Amount</th>
                  <th className="text-right font-medium pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleTx.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 text-text-body">{fmtDate(t.date)}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium ${
                          t.type === "income" ? "bg-sage-light text-sage-deep" : "bg-rose-soft text-rose"
                        }`}
                      >
                        {t.type === "income" ? "Income" : "Expense"}
                      </span>
                    </td>
                    <td className="py-2.5 text-text-body">{t.category_name || "Uncategorized"}</td>
                    <td className="py-2.5 text-text-body">{t.description || "\u2014"}</td>
                    <td className="py-2.5 text-text-body">{t.payment_method || "\u2014"}</td>
                    <td
                      className="py-2.5 text-right font-semibold"
                      style={{ color: t.type === "income" ? "#6B9A7C" : "#C67B62" }}
                    >
                      {peso(t.amount)}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => { setEditingTx(t); setFormError(""); setShowTxForm(true); }}
                        className="p-1 text-text-muted hover:text-sage"
                      >
                        <Icon name="edit" size={14} />
                      </button>
                      <button onClick={() => handleDeleteTx(t.id)} className="p-1 text-text-muted hover:text-rose">
                        <Icon name="trash" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showTxForm && (
        <TransactionModal
          tx={editingTx}
          categories={categories}
          error={formError}
          onClose={() => setShowTxForm(false)}
          onSave={async (payload) => {
            setFormError("");
            try {
              if (editingTx) await api.put(`/transactions/${editingTx.id}`, payload);
              else await api.post("/transactions", payload);
              setShowTxForm(false);
              load();
            } catch (err) {
              setFormError(err.response?.data?.message || "Something went wrong.");
            }
          }}
        />
      )}

      {showBudgetForm && (
        <BudgetModal
          budget={editingBudget}
          categories={categories.filter((c) => c.type === "expense")}
          month={month}
          year={year}
          error={formError}
          onClose={() => setShowBudgetForm(false)}
          onSave={async (payload) => {
            setFormError("");
            try {
              if (editingBudget) await api.put(`/budgets/${editingBudget.id}`, payload);
              else await api.post("/budgets", payload);
              setShowBudgetForm(false);
              load();
            } catch (err) {
              setFormError(err.response?.data?.message || "Something went wrong.");
            }
          }}
        />
      )}

      {showRecForm && (
        <RecurringModal
          categories={categories}
          error={formError}
          onClose={() => setShowRecForm(false)}
          onSave={async (payload) => {
            setFormError("");
            try {
              await api.post("/recurring", payload);
              setShowRecForm(false);
              load();
            } catch (err) {
              setFormError(err.response?.data?.message || "Something went wrong.");
            }
          }}
        />
      )}
    </div>
  );
}

function TransactionModal({ tx, categories, error, onClose, onSave }) {
  const [type, setType] = useState(tx?.type || "expense");
  const [categoryId, setCategoryId] = useState(tx?.category_id || "");
  const [amount, setAmount] = useState(tx?.amount || "");
  const [date, setDate] = useState(tx?.date?.slice(0, 10) || new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState(tx?.description || "");
  const [paymentMethod, setPaymentMethod] = useState(tx?.payment_method || "Cash");

  const filteredCategories = categories.filter((c) => c.type === type);

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      type,
      category_id: categoryId || null,
      amount: parseFloat(amount),
      date,
      description,
      payment_method: paymentMethod,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 bw-modal-overlay">
      <div className="bg-card rounded-2xl p-6 w-full max-w-md bw-modal-card">
        <h2 className="font-semibold text-base mb-4">{tx ? "Edit Transaction" : "Add Transaction"}</h2>

        {error && <div className="mb-3 px-3 py-2 bg-rose-soft text-rose rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setType("income"); setCategoryId(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                type === "income" ? "bg-sage-light border-sage text-sage-deep" : "border-border text-text-muted"
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => { setType("expense"); setCategoryId(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                type === "expense" ? "bg-rose-soft border-rose text-rose" : "border-border text-text-muted"
              }`}
            >
              Expense
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Amount (&#8369;) *</label>
            <input
              type="number" step="0.01" min="0.01" required
              value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Category</label>
            <select
              value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            >
              <option value="">Select category</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Date *</label>
            <input
              type="date" required value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Description</label>
            <input
              type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              placeholder="e.g. Salary for May"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Payment method</label>
            <select
              value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            >
              {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" className="flex-1 bg-sage text-white rounded-lg py-2.5 text-sm font-medium">
              Save
            </button>
            <button type="button" onClick={onClose} className="flex-1 border border-border rounded-lg py-2.5 text-sm">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecurringModal({ categories, error, onClose, onSave }) {
  const [type, setType] = useState("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const filteredCategories = categories.filter((c) => c.type === type);

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      type,
      description,
      amount: parseFloat(amount),
      day_of_month: parseInt(dayOfMonth),
      category_id: categoryId || null,
      payment_method: paymentMethod,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 bw-modal-overlay">
      <div className="bg-card rounded-2xl p-6 w-full max-w-md bw-modal-card">
        <h2 className="font-semibold text-base mb-4">Add Recurring Rule</h2>
        {error && <div className="mb-3 px-3 py-2 bg-rose-soft text-rose rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="flex gap-2">
            <button
              type="button" onClick={() => { setType("expense"); setCategoryId(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                type === "expense" ? "bg-rose-soft border-rose text-rose" : "border-border text-text-muted"
              }`}
            >
              Expense
            </button>
            <button
              type="button" onClick={() => { setType("income"); setCategoryId(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                type === "income" ? "bg-sage-light border-sage text-sage-deep" : "border-border text-text-muted"
              }`}
            >
              Income
            </button>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Description *</label>
            <input
              required value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              placeholder="e.g. Rent, Salary, Netflix"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Amount (&#8369;) *</label>
            <input
              type="number" step="0.01" min="0.01" required
              value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Day of month (1-28) *</label>
            <input
              type="number" min="1" max="28" required
              value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Category (optional)</label>
            <select
              value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            >
              <option value="">None</option>
              {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Payment method</label>
            <select
              value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            >
              {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <p className="text-[11px] text-text-muted">
            This will automatically add a transaction on this day, every month from now on.
          </p>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="flex-1 bg-sage text-white rounded-lg py-2.5 text-sm font-medium">
              Save
            </button>
            <button type="button" onClick={onClose} className="flex-1 border border-border rounded-lg py-2.5 text-sm">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BudgetModal({ budget, categories, month, year, error, onClose, onSave }) {
  const [categoryId, setCategoryId] = useState(budget?.category_id || "");
  const [amount, setAmount] = useState(budget?.amount || "");

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ category_id: parseInt(categoryId), amount: parseFloat(amount), month, year });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 bw-modal-overlay">
      <div className="bg-card rounded-2xl p-6 w-full max-w-md bw-modal-card">
        <h2 className="font-semibold text-base mb-4">{budget ? "Edit Budget" : "Set Budget"}</h2>
        {error && <div className="mb-3 px-3 py-2 bg-rose-soft text-rose rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Category *</label>
            <select
              required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              disabled={!!budget}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm disabled:bg-muted"
            >
              <option value="">Select expense category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Budget amount (&#8369;) *</label>
            <input
              type="number" step="0.01" min="0.01" required
              value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              placeholder="0.00"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="flex-1 bg-sage text-white rounded-lg py-2.5 text-sm font-medium">
              Save
            </button>
            <button type="button" onClick={onClose} className="flex-1 border border-border rounded-lg py-2.5 text-sm">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
