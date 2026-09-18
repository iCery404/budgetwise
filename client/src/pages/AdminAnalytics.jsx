import { useEffect, useState, useCallback } from "react";
import api from "../api";
import { StatCard, peso } from "../components/Shared";

export default function AdminAnalytics() {
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    const { data } = await api.get("/analytics");
    setData(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!data) return <div className="text-text-muted text-sm">Loading...</div>;

  return (
    <div>
      <h1 className="text-lg font-semibold mb-1">Analytics</h1>
      <p className="text-xs text-text-muted mb-5">System-wide insights across every account.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Users" value={data.totalUsers} color="#45705A" />
        <StatCard label="Total Transactions" value={data.totalTransactions} color="#6B9A7C" />
        <StatCard label="Active Goals" value={data.totalGoals} color="#C99A5B" />
        <StatCard label="Outstanding Debt" value={peso(data.totalOutstandingDebt)} color="#C67B62" />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-5">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="font-semibold text-sm mb-3">This Month, All Users</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Income</span>
              <span className="font-medium text-sage-deep">{peso(data.thisMonth.totalIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Expenses</span>
              <span className="font-medium text-rose">{peso(data.thisMonth.totalExpense)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Transactions logged</span>
              <span className="font-medium">{data.thisMonth.txThisMonth}</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="font-semibold text-sm mb-3">All-Time Totals</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Total income logged</span>
              <span className="font-medium text-sage-deep">{peso(data.totalIncomeAllTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Total expenses logged</span>
              <span className="font-medium text-rose">{peso(data.totalExpenseAllTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Total saved toward goals</span>
              <span className="font-medium">{peso(data.totalSaved)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="font-semibold text-sm mb-3">Most Common Expense Categories</div>
          {data.topCategories.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-6">No expenses logged yet.</div>
          ) : (
            <div className="space-y-2">
              {data.topCategories.map((c, i) => (
                <div key={i} className="flex justify-between text-[13px]">
                  <span className="text-text-body">{c.name}</span>
                  <span className="text-text-muted">{peso(c.total)} &middot; {c.uses}x</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="font-semibold text-sm mb-3">Most Active Users</div>
          {data.mostActiveUsers.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-6">No activity yet.</div>
          ) : (
            <div className="space-y-2">
              {data.mostActiveUsers.map((u, i) => (
                <div key={i} className="flex justify-between text-[13px]">
                  <span className="text-text-body">{u.name}</span>
                  <span className="text-text-muted">{u.txCount} tx</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
