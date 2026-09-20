import { useEffect, useState, useCallback } from "react";
import api from "../api";
import { StatCard, ProgressBar, budgetColor, MonthYearPicker, peso, fmtDate } from "../components/Shared";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const now = new Date();
const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Dashboard() {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [dismissed, setDismissed] = useState([]);
  const [editingLimit, setEditingLimit] = useState(null);
  const [limitInput, setLimitInput] = useState("");
  const [savingLimit, setSavingLimit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      await api.post("/recurring/run", { month, year }).catch(() => {});
      const { data } = await api.get(`/dashboard?month=${month}&year=${year}`);
      setData(data);
    } catch (err) {
      setLoadError(err.response?.data?.message || "Couldn't load the dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    load();
    setDismissed([]);
  }, [load]);

  const startEditLimit = (w) => {
    setEditingLimit(w.payment_method);
    setLimitInput(w.creditLimit != null ? String(w.creditLimit) : "");
  };

  const saveLimit = async (paymentMethod) => {
    const value = Number(limitInput);
    if (limitInput === "" || Number.isNaN(value) || value < 0) return;
    setSavingLimit(true);
    try {
      await api.put("/wallet-limits", { payment_method: paymentMethod, credit_limit: value });
      setEditingLimit(null);
      load();
    } catch {
      // silently keep the form open so the user can retry
    } finally {
      setSavingLimit(false);
    }
  };

  if (loadError) {
    return (
      <div className="bg-rose-soft text-rose rounded-lg px-4 py-3 text-sm flex items-center justify-between gap-3">
        <span>{loadError}</span>
        <button onClick={load} className="font-medium underline flex-shrink-0">Retry</button>
      </div>
    );
  }

  if (loading || !data) {
    return <div className="text-text-muted text-sm">Loading dashboard...</div>;
  }

  const { totalIncome, totalExpense, remaining, savingsRate, categoryBreakdown, budgetProgress, recentTransactions, alerts, trend, wallets } = data;
  const visibleAlerts = (alerts || []).filter((a) => !dismissed.includes(a.category_name));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs text-text-muted">Showing data for</span>
        <MonthYearPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
      </div>

      {visibleAlerts.length > 0 && (
        <div className="space-y-2 mb-5">
          {visibleAlerts.map((a) => (
            <div
              key={a.category_name}
              className={`flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-[13px] ${
                a.level === "over" ? "bg-rose-soft text-rose" : "bg-sand-soft text-[#8a6a30]"
              }`}
            >
              <span>
                {a.level === "over" ? "You're over budget on " : "Malapit ka na sa budget mo sa "}
                <strong>{a.category_name}</strong> ({a.pct}%).
              </span>
              <button
                onClick={() => setDismissed((d) => [...d, a.category_name])}
                className="text-xs font-medium opacity-70 hover:opacity-100 flex-shrink-0"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Income" value={peso(totalIncome)} color="#6B9A7C" />
        <StatCard label="Total Expenses" value={peso(totalExpense)} color="#C67B62" />
        <StatCard label="Remaining" value={peso(remaining)} color="#45705A" />
        <StatCard label="Savings Rate" value={`${savingsRate.toFixed(1)}%`} color="#C99A5B" />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-5">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="font-semibold text-sm mb-3">Expense Categories</div>
          {categoryBreakdown.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-8">No expenses recorded this month.</div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-[130px] h-[130px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      dataKey="total"
                      nameKey="name"
                      innerRadius={35}
                      outerRadius={60}
                      paddingAngle={2}
                    >
                      {categoryBreakdown.map((c, i) => (
                        <Cell key={i} fill={c.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 grid grid-cols-1 gap-1.5">
                {categoryBreakdown.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12.5px] text-text-body">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                    <span className="flex-1">{c.name}</span>
                    <span className="text-text-muted">{peso(c.total)}</span>
                    <span className="text-text-muted w-9 text-right">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="font-semibold text-sm mb-3">Budget Overview</div>
          {budgetProgress.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-8">No budgets set for this month.</div>
          ) : (
            <div className="space-y-3">
              {budgetProgress.map((b) => {
                const pct = b.budget > 0 ? Math.round((b.spent / b.budget) * 100) : 0;
                return (
                  <div key={b.id}>
                    <div className="flex justify-between text-[12.5px] mb-1">
                      <span className="text-text-body font-medium">{b.category_name}</span>
                      <span className="text-text-muted">{peso(b.spent)} / {peso(b.budget)}</span>
                    </div>
                    <ProgressBar pct={pct} color={budgetColor(pct)} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-5">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="font-semibold text-sm mb-3">Income vs Expenses (last 6 months)</div>
          {!trend || trend.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-8">Not enough history yet.</div>
          ) : (
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend.map((t) => ({ ...t, label: MONTH_ABBR[t.month - 1] }))}>
                  <CartesianGrid stroke="#E8DBC3" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8A7A63" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#8A7A63" }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip formatter={(v) => peso(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Line type="monotone" dataKey="income" name="Income" stroke="#6B9A7C" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="expense" name="Expense" stroke="#C67B62" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-sm">Payment activity (this period)</div>
            <div className="text-[10.5px] text-text-muted">Net = money in {"\u2212"} money out</div>
          </div>
          {!wallets || wallets.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-8">No payment methods recorded yet.</div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {wallets.map((w) => (
                <div key={w.payment_method} className="bg-muted rounded-xl p-3">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="text-[11px] text-text-muted">{w.payment_method}</div>
                    {editingLimit !== w.payment_method && (
                      <button
                        onClick={() => startEditLimit(w)}
                        className="text-[10px] text-text-muted underline opacity-70 hover:opacity-100"
                      >
                        {w.creditLimit != null ? "Edit limit" : "Set limit"}
                      </button>
                    )}
                  </div>
                  <div className={`text-sm font-semibold ${w.balance < 0 ? "text-rose" : "text-text"}`}>
                    {peso(w.balance)}
                  </div>
                  <div className="text-[10.5px] text-text-muted mt-0.5">
                    In {peso(w.moneyIn)} {"\u00b7"} Out {peso(w.moneyOut)}
                  </div>
                  {editingLimit === w.payment_method ? (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        autoFocus
                        value={limitInput}
                        onChange={(e) => setLimitInput(e.target.value)}
                        placeholder="Credit limit"
                        className="w-full px-2 py-1 border border-border rounded-lg text-[11px] bg-card"
                      />
                      <button
                        onClick={() => saveLimit(w.payment_method)}
                        disabled={savingLimit}
                        className="text-[10.5px] font-medium text-sage-deep flex-shrink-0"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingLimit(null)}
                        className="text-[10.5px] text-text-muted flex-shrink-0"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    w.creditLimit != null && (
                      <div className="text-[10.5px] text-text-muted mt-0.5">
                        Spent {peso(w.moneyOut)} {"\u00b7"} Limit {peso(w.creditLimit)} {"\u00b7"} Avail{" "}
                        <span className={w.available < 0 ? "text-rose font-medium" : ""}>{peso(w.available)}</span>
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="font-semibold text-sm mb-3">Recent Transactions</div>
        {recentTransactions.length === 0 ? (
          <div className="text-center text-text-muted text-sm py-8">
            No transactions yet. Add your first income or expense from the Transactions page.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-text-muted border-b border-border">
                  <th className="text-left font-medium pb-2">Date</th>
                  <th className="text-left font-medium pb-2">Description</th>
                  <th className="text-left font-medium pb-2">Category</th>
                  <th className="text-left font-medium pb-2">Via / Wallet</th>
                  <th className="text-left font-medium pb-2">Type</th>
                  <th className="text-right font-medium pb-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="py-2 text-text-body">{fmtDate(t.date)}</td>
                    <td className="py-2 text-text-body">{t.description || "\u2014"}</td>
                    <td className="py-2 text-text-body">{t.category_name || "Uncategorized"}</td>
                    <td className="py-2 text-text-body">{t.payment_method || "\u2014"}</td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium ${
                          t.type === "income" ? "bg-sage-light text-sage-deep" : "bg-rose-soft text-rose"
                        }`}
                      >
                        {t.type === "income" ? "Income" : "Expense"}
                      </span>
                    </td>
                    <td
                      className="py-2 text-right font-semibold"
                      style={{ color: t.type === "income" ? "#6B9A7C" : "#C67B62" }}
                    >
                      {t.type === "income" ? "+" : "-"}
                      {peso(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
