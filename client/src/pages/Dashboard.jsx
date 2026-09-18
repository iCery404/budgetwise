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
  const [dismissed, setDismissed] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    await api.post("/recurring/run", { month, year }).catch(() => {});
    const { data } = await api.get(`/dashboard?month=${month}&year=${year}`);
    setData(data);
    setLoading(false);
  }, [month, year]);

  useEffect(() => {
    load();
    setDismissed([]);
  }, [load]);

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
                      paddingAngle={categoryBreakdown.length > 1 ? 2 : 0}
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
                    {c.name}
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
          <div className="font-semibold text-sm mb-3">Payment Method Balances</div>
          {!wallets || wallets.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-8">No payment methods recorded yet.</div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {wallets.map((w) => (
                <div key={w.payment_method} className="bg-muted rounded-xl p-3">
                  <div className="text-[11px] text-text-muted mb-0.5">{w.payment_method}</div>
                  <div className={`text-sm font-semibold ${w.balance < 0 ? "text-rose" : "text-text"}`}>
                    {peso(w.balance)}
                  </div>
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
