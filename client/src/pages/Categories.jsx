import { useEffect, useState, useCallback } from "react";
import api from "../api";
import Icon from "../components/Icon";

const COLORS = ["#6B9A7C", "#A8C5D4", "#C99A5B", "#D4A5A5", "#8BA888", "#B8A99A", "#7A9E9F", "#C79ECF", "#E0A85C"];

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data } = await api.get("/categories");
    setCategories(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const expenseCats = categories.filter((c) => c.type === "expense");
  const incomeCats = categories.filter((c) => c.type === "income");

  async function handleDelete(id) {
    if (!confirm("Delete this category?")) return;
    try {
      await api.delete(`/categories/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Could not delete category.");
    }
  }

  function CategoryList({ title, items }) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="font-semibold text-sm mb-3">{title}</div>
        {items.length === 0 ? (
          <div className="text-center text-text-muted text-sm py-6">No categories yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                  <span className="text-[13px] text-text-body font-medium">{c.name}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditing(c); setError(""); setShowForm(true); }}
                    className="p-1 text-text-muted hover:text-sage"
                  >
                    <Icon name="edit" size={14} />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-1 text-text-muted hover:text-rose">
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold">Categories</h1>
          <p className="text-xs text-text-muted mt-0.5">Manage your income and expense categories</p>
        </div>
        <button
          onClick={() => { setEditing(null); setError(""); setShowForm(true); }}
          className="flex items-center gap-1.5 bg-sage text-white text-xs font-medium px-3 py-1.5 rounded-lg"
        >
          <Icon name="plus" size={14} /> Add Category
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <CategoryList title="Expense Categories" items={expenseCats} />
        <CategoryList title="Income Categories" items={incomeCats} />
      </div>

      {showForm && (
        <CategoryModal
          category={editing}
          error={error}
          onClose={() => setShowForm(false)}
          onSave={async (payload) => {
            setError("");
            try {
              if (editing) await api.put(`/categories/${editing.id}`, payload);
              else await api.post("/categories", payload);
              setShowForm(false);
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

function CategoryModal({ category, error, onClose, onSave }) {
  const [name, setName] = useState(category?.name || "");
  const [type, setType] = useState(category?.type || "expense");
  const [color, setColor] = useState(category?.color || COLORS[0]);

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ name, type, color });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 bw-modal-overlay">
      <div className="bg-card rounded-2xl p-6 w-full max-w-md bw-modal-card">
        <h2 className="font-semibold text-base mb-4">{category ? "Edit Category" : "Add Category"}</h2>
        {error && <div className="mb-3 px-3 py-2 bg-rose-soft text-rose rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Name *</label>
            <input
              type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              placeholder="e.g. Food and Dining, Salary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Type *</label>
            <div className="flex gap-5">
              <label className="flex items-center gap-1.5 text-[13px] text-text-body">
                <input type="radio" checked={type === "expense"} onChange={() => setType("expense")} /> Expense
              </label>
              <label className="flex items-center gap-1.5 text-[13px] text-text-body">
                <input type="radio" checked={type === "income"} onChange={() => setType("income")} /> Income
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Color</label>
            <div className="flex gap-1.5 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c} type="button" onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-md ${color === c ? "ring-2 ring-offset-1 ring-text" : ""}`}
                  style={{ background: c }}
                />
              ))}
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
  );
}
