import { useEffect, useState, useCallback } from "react";
import api from "../api";
import { ProgressBar, peso, fmtDate } from "../components/Shared";
import Icon from "../components/Icon";

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [contributingTo, setContributingTo] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await api.get("/goals");
    setGoals(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    if (!confirm("Delete this goal?")) return;
    await api.delete(`/goals/${id}`);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold">Savings Goals</h1>
          <p className="text-xs text-text-muted mt-0.5">Set a target and watch your progress add up.</p>
        </div>
        <button
          onClick={() => { setError(""); setShowForm(true); }}
          className="flex items-center gap-1.5 bg-sage text-white text-xs font-medium px-3 py-1.5 rounded-lg"
        >
          <Icon name="plus" size={14} /> New Goal
        </button>
      </div>

      {loading ? (
        <div className="text-center text-text-muted text-sm py-8">Loading...</div>
      ) : goals.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center text-text-muted text-sm shadow-sm">
          No goals yet. Start one for that next big purchase or emergency fund.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => {
            const pct = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
            const reached = pct >= 100;
            return (
              <div key={g.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="font-semibold text-sm">{g.name}</div>
                    {g.target_date && (
                      <div className="text-[11px] text-text-muted">Due {fmtDate(g.target_date)}</div>
                    )}
                  </div>
                  <button onClick={() => handleDelete(g.id)} className="p-1 text-text-muted hover:text-rose">
                    <Icon name="trash" size={14} />
                  </button>
                </div>
                <div className="flex justify-between text-[13px] my-2.5">
                  <span className="font-medium">{peso(g.current_amount)}</span>
                  <span className="text-text-muted">of {peso(g.target_amount)}</span>
                </div>
                <ProgressBar pct={Math.min(pct, 100)} color={reached ? "#6B9A7C" : pct >= 70 ? "#C99A5B" : "#6B9A7C"} />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-text-muted">{pct}%{reached ? " \u00b7 Reached! \ud83c\udf89" : ""}</span>
                  <button
                    onClick={() => { setError(""); setContributingTo(g); }}
                    className="flex items-center gap-1 border border-border rounded-lg px-2.5 py-1 text-[11px] font-medium hover:bg-muted"
                  >
                    <Icon name="plus" size={11} /> Add funds
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <GoalModal
          error={error}
          onClose={() => setShowForm(false)}
          onSave={async (payload) => {
            setError("");
            try {
              await api.post("/goals", payload);
              setShowForm(false);
              load();
            } catch (err) {
              setError(err.response?.data?.message || "Something went wrong.");
            }
          }}
        />
      )}

      {contributingTo && (
        <ContributeModal
          goal={contributingTo}
          error={error}
          onClose={() => setContributingTo(null)}
          onSave={async (amount) => {
            setError("");
            try {
              await api.post(`/goals/${contributingTo.id}/contribute`, { amount });
              setContributingTo(null);
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

function GoalModal({ error, onClose, onSave }) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      name,
      target_amount: parseFloat(targetAmount),
      current_amount: currentAmount ? parseFloat(currentAmount) : 0,
      target_date: targetDate || null,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 bw-modal-overlay">
      <div className="bg-card rounded-2xl p-6 w-full max-w-md bw-modal-card">
        <h2 className="font-semibold text-base mb-4">New Goal</h2>
        {error && <div className="mb-3 px-3 py-2 bg-rose-soft text-rose rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Name *</label>
            <input
              required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              placeholder="e.g. New laptop, Emergency fund"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Target amount (&#8369;) *</label>
            <input
              type="number" step="0.01" min="0.01" required
              value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Already saved (optional)</label>
            <input
              type="number" step="0.01" min="0"
              value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Target date (optional)</label>
            <input
              type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
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

function ContributeModal({ goal, error, onClose, onSave }) {
  const [amount, setAmount] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    onSave(parseFloat(amount));
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 bw-modal-overlay">
      <div className="bg-card rounded-2xl p-6 w-full max-w-sm bw-modal-card">
        <h2 className="font-semibold text-base mb-4">Add funds to "{goal.name}"</h2>
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
              Add
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
