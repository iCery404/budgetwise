import { useEffect, useState, useCallback } from "react";
import api from "../api";
import { ProgressBar, budgetColor, MonthYearPicker, peso } from "../components/Shared";
import Icon from "../components/Icon";

const now = new Date();

export default function Reports() {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const { data } = await api.get(`/reports?month=${month}&year=${year}`);
      setData(data);
    } catch (err) {
      setLoadError(err.response?.data?.message || "Couldn't load this report. Please try again.");
    }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  async function handleExportCsv() {
    const res = await api.get(`/reports/export?month=${month}&year=${year}`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budgetwise-${year}-${String(month).padStart(2, "0")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (loadError) {
    return (
      <div className="bg-rose-soft text-rose rounded-lg px-4 py-3 text-sm flex items-center justify-between gap-3">
        <span>{loadError}</span>
        <button onClick={load} className="font-medium underline flex-shrink-0">Retry</button>
      </div>
    );
  }
  if (!data) return <div className="text-text-muted text-sm">Loading...</div>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 print:hidden">
        <MonthYearPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
        <div className="flex gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 border border-border text-text-body text-xs font-medium px-3 py-1.5 rounded-lg"
          >
            <Icon name="download" size={14} /> Download CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-slate-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
          >
            <Icon name="print" size={14} /> Print / Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="text-[10.5px] uppercase text-text-muted mb-1">Total Income</div>
          <div className="text-lg font-semibold text-sage">{peso(data.totalIncome)}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="text-[10.5px] uppercase text-text-muted mb-1">Total Expenses</div>
          <div className="text-lg font-semibold text-rose">{peso(data.totalExpense)}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="text-[10.5px] uppercase text-text-muted mb-1">Net Balance</div>
          <div className="text-lg font-semibold text-sage-deep">{peso(data.netBalance)}</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm mb-5">
        <div className="font-semibold text-sm mb-3">Expenses by Category</div>
        {data.byCategory.length === 0 ? (
          <div className="text-center text-text-muted text-sm py-6">No expenses this period.</div>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-text-muted border-b border-border">
                <th className="text-left font-medium pb-2">Category</th>
                <th className="text-right font-medium pb-2">Amount</th>
                <th className="text-right font-medium pb-2">%</th>
              </tr>
            </thead>
            <tbody>
              {data.byCategory.map((c, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="py-2 text-text-body">{c.name}</td>
                  <td className="py-2 text-right text-text-body">{peso(c.total)}</td>
                  <td className="py-2 text-right text-text-body">
                    {data.totalExpense > 0 ? ((c.total / data.totalExpense) * 100).toFixed(1) : "0.0"}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="font-semibold text-sm mb-3">Budget vs Actual</div>
        {data.budgetVsActual.length === 0 ? (
          <div className="text-center text-text-muted text-sm py-6">No budgets set for this period.</div>
        ) : (
          <div className="space-y-3">
            {data.budgetVsActual.map((b, i) => {
              const pct = b.budget > 0 ? Math.round((b.spent / b.budget) * 100) : 0;
              return (
                <div key={i}>
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
  );
}
