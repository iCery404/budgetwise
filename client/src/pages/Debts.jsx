import { useEffect, useState, useCallback } from "react";
import api from "../api";
import { ProgressBar, peso } from "../components/Shared";
import Icon from "../components/Icon";
import Portal from "../components/Portal";

export default function Debts() {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [payingFor, setPayingFor] = useState(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await api.get("/debts");
      setDebts(data);
    } catch (err) {
      setLoadError(err.response?.data?.message || "Couldn't load your debts. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    if (!confirm("Delete this debt?")) return;
    await api.delete(`/debts/${id}`);
    load();
  }

  const active = debts.filter((d) => d.status === "active");
  const paidOff = debts.filter((d) => d.status === "paid");

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold">Debts &amp; Installments</h1>
          <p className="text-xs text-text-muted mt-0.5">Track what you owe and chip away at it.</p>
        </div>
        <button
          onClick={() => { setError(""); setShowForm(true); }}
          className="flex items-center gap-1.5 bg-sage text-white text-xs font-medium px-3 py-1.5 rounded-lg"
        >
          <Icon name="plus" size={14} /> Add Debt
        </button>
      </div>

      {loadError ? (
        <div className="bg-rose-soft text-rose rounded-lg px-4 py-3 text-sm flex items-center justify-between gap-3">
          <span>{loadError}</span>
          <button onClick={load} className="font-medium underline flex-shrink-0">Retry</button>
        </div>
      ) : loading ? (
        <div className="text-center text-text-muted text-sm py-8">Loading...</div>
      ) : active.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center text-text-muted text-sm shadow-sm">
          No active debts. Nice.
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((d) => {
            const remaining = d.total_amount - d.paid_amount;
            const pct = d.total_amount > 0 ? Math.round((d.paid_amount / d.total_amount) * 100) : 0;
            return (
              <div key={d.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-sm">{d.name}</div>
                    <div className="text-[11px] text-text-muted">
                      {d.creditor}
                      {d.due_day ? ` \u00b7 Day ${d.due_day}` : ""}
                      {d.monthly_payment ? ` \u00b7 ${peso(d.monthly_payment)}/mo` : ""}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(d.id)} className="p-1 text-text-muted hover:text-rose">
                    <Icon name="trash" size={14} />
                  </button>
                </div>
                <div className="flex justify-between text-[13px] my-2.5">
                  <span>Paid {peso(d.paid_amount)}</span>
                  <span className="text-text-muted">Left {peso(remaining)}</span>
                </div>
                <ProgressBar pct={pct} color={pct >= 70 ? "#6B9A7C" : pct >= 30 ? "#C99A5B" : "#C67B62"} />
                <div className="text-right mt-2">
                  <button
                    onClick={() => { setError(""); setPayingFor(d); }}
                    className="flex items-center gap-1 border border-border rounded-lg px-2.5 py-1 text-[11px] font-medium hover:bg-muted ml-auto"
                  >
                    <Icon name="plus" size={11} /> Make a payment
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {paidOff.length > 0 && (
        <>
          <div className="font-semibold text-[13px] text-text-muted mt-6 mb-2">Paid off</div>
          <div className="space-y-2">
            {paidOff.map((d) => (
              <div key={d.id} className="bg-card border border-border rounded-2xl p-3.5 opacity-70 flex items-center justify-between">
                <span className="font-medium text-sm">{d.name}</span>
                <span className="text-[11px] text-sage-deep">Fully paid &#10003;</span>
              </div>
            ))}
          </div>
        </>
      )}

      {showForm && (
        <DebtModal
          error={error}
          onClose={() => setShowForm(false)}
          onSave={async (payload) => {
            setError("");
            try {
              await api.post("/debts", payload);
              setShowForm(false);
              load();
            } catch (err) {
              setError(err.response?.data?.message || "Something went wrong.");
            }
          }}
        />
      )}

      {payingFor && (
        <PayModal
          debt={payingFor}
          error={error}
          onClose={() => setPayingFor(null)}
          onSave={async (amount) => {
            setError("");
            try {
              await api.post(`/debts/${payingFor.id}/pay`, { amount });
              setPayingFor(null);
              load();
            } catch (err) {
              setError(err.response?.data?.message || "Something went wrong.");
            }
          }}
        />
      )}
    </div>
  );
}

function DebtModal({ error, onClose, onSave }) {
  const [name, setName] = useState("");
  const [creditor, setCreditor] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [dueDay, setDueDay] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      name,
      creditor,
      total_amount: parseFloat(totalAmount),
      paid_amount: paidAmount ? parseFloat(paidAmount) : 0,
      monthly_payment: monthlyPayment ? parseFloat(monthlyPayment) : null,
      due_day: dueDay ? parseInt(dueDay) : null,
    });
  }

  return (
    <Portal>
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 bw-modal-overlay">
      <div className="bg-card rounded-2xl p-6 w-full max-w-md bw-modal-card max-h-[90vh] overflow-y-auto">
        <h2 className="font-semibold text-base mb-4">Add Debt</h2>
        {error && <div className="mb-3 px-3 py-2 bg-rose-soft text-rose rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Name *</label>
            <input
              required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="e.g. Credit card, Motorcycle loan"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Creditor / Lender</label>
            <input
              value={creditor} onChange={(e) => setCreditor(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="e.g. BPI, 5-6"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Total amount (&#8369;) *</label>
            <input
              type="number" step="0.01" min="0.01" required
              value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Already paid (optional)</label>
            <input
              type="number" step="0.01" min="0"
              value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="0.00"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-body mb-1">Monthly payment</label>
              <input
                type="number" step="0.01" min="0"
                value={monthlyPayment} onChange={(e) => setMonthlyPayment(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-body mb-1">Due day</label>
              <input
                type="number" min="1" max="28"
                value={dueDay} onChange={(e) => setDueDay(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="1-28"
              />
            </div>
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
    </Portal>
  );
}

function PayModal({ debt, error, onClose, onSave }) {
  const [amount, setAmount] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    onSave(parseFloat(amount));
  }

  return (
    <Portal>
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 bw-modal-overlay">
      <div className="bg-card rounded-2xl p-6 w-full max-w-sm bw-modal-card">
        <h2 className="font-semibold text-base mb-4">Make a payment on "{debt.name}"</h2>
        {error && <div className="mb-3 px-3 py-2 bg-rose-soft text-rose rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Amount (&#8369;) *</label>
            <input
              type="number" step="0.01" min="0.01" required autoFocus
              value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="0.00"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="flex-1 bg-sage text-white rounded-lg py-2.5 text-sm font-medium">
              Pay
            </button>
            <button type="button" onClick={onClose} className="flex-1 border border-border rounded-lg py-2.5 text-sm">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
    </Portal>
  );
}
