export function StatCard({ label, value, color }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
      <div className="text-[10.5px] uppercase tracking-wide text-text-muted mb-1">{label}</div>
      <div className="text-xl font-semibold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

export function ProgressBar({ pct, color }) {
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(100, pct)}%`, background: color }}
      />
    </div>
  );
}

export function budgetColor(pct) {
  if (pct >= 90) return "#C67B62";
  if (pct >= 70) return "#C99A5B";
  return "#6B9A7C";
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function MonthYearPicker({ month, year, onChange }) {
  const years = [];
  const nowY = new Date().getFullYear();
  for (let y = nowY - 2; y <= nowY + 1; y++) years.push(y);

  return (
    <div className="flex gap-2">
      <select
        value={month}
        onChange={(e) => onChange(parseInt(e.target.value), year)}
        className="px-2.5 py-1.5 border border-border rounded-lg text-[12.5px] bg-card"
      >
        {MONTHS.map((m, i) => (
          <option key={i} value={i + 1}>{m}</option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => onChange(month, parseInt(e.target.value))}
        className="px-2.5 py-1.5 border border-border rounded-lg text-[12.5px] bg-card"
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}

export function peso(n) {
  return "\u20b1" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtDate(iso) {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
