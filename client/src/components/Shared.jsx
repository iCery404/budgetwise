import { useState, useEffect, useRef } from "react";
import Icon from "./Icon";

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

const MONTH_ABBR3 = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function MonthYearPicker({ month, year, onChange }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(year);
  const boxRef = useRef(null);

  useEffect(() => { if (open) setViewYear(year); }, [open, year]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const pickMonth = (m) => {
    onChange(m, viewYear);
    setOpen(false);
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3.5 py-1.5 border border-border rounded-full text-[12.5px] bg-card text-text-body"
      >
        <Icon name="calendar" size={14} className="text-text-muted" />
        {MONTHS[month - 1]} {year}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 z-20 bg-card border border-border rounded-2xl shadow-lg p-4 w-[220px]">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => setViewYear((y) => y - 1)} className="p-1 text-text-muted hover:text-text-body">
              <Icon name="chevron-left" size={16} />
            </button>
            <div className="text-sm font-semibold">{viewYear}</div>
            <button type="button" onClick={() => setViewYear((y) => y + 1)} className="p-1 text-text-muted hover:text-text-body">
              <Icon name="chevron-right" size={16} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_ABBR3.map((m, i) => {
              const selected = i + 1 === month && viewYear === year;
              return (
                <button
                  type="button"
                  key={m}
                  onClick={() => pickMonth(i + 1)}
                  className={`text-[12.5px] py-1.5 rounded-lg ${
                    selected ? "bg-sage-deep text-white font-medium" : "text-text-body hover:bg-muted"
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}
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

export function calcAge(birthday) {
  if (!birthday) return null;
  const b = new Date(birthday);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}
