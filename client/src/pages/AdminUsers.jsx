import { useEffect, useState, useCallback } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { fmtDate } from "../components/Shared";
import Icon from "../components/Icon";

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data } = await api.get("/users");
    setUsers(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    if (!confirm("Delete this user? Their records will remain but be inaccessible.")) return;
    try {
      await api.delete(`/users/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Could not delete user.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold">User Management</h1>
          <p className="text-xs text-text-muted mt-0.5">Admin only &middot; manage system users and roles</p>
        </div>
        <button
          onClick={() => { setEditing(null); setError(""); setShowForm(true); }}
          className="flex items-center gap-1.5 bg-sage text-white text-xs font-medium px-3 py-1.5 rounded-lg"
        >
          <Icon name="plus" size={14} /> Add User
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-text-muted border-b border-border bg-muted">
              <th className="text-left font-medium py-2.5 px-4">Name</th>
              <th className="text-left font-medium py-2.5 px-4">Email</th>
              <th className="text-left font-medium py-2.5 px-4">Role</th>
              <th className="text-left font-medium py-2.5 px-4">Joined</th>
              <th className="text-right font-medium py-2.5 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="py-2.5 px-4 text-text-body">{u.name}</td>
                <td className="py-2.5 px-4 text-text-body">{u.email}</td>
                <td className="py-2.5 px-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium ${
                      u.role === "admin" ? "bg-[#EEEDFE] text-[#3C3489]" : "bg-muted text-text-muted"
                    }`}
                  >
                    {u.role === "admin" ? "Admin" : "User"}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-text-body">{fmtDate(u.created_at)}</td>
                <td className="py-2.5 px-4 text-right">
                  <button
                    onClick={() => { setEditing(u); setError(""); setShowForm(true); }}
                    className="p-1 text-text-muted hover:text-sage"
                  >
                    <Icon name="edit" size={14} />
                  </button>
                  {u.id !== currentUser.id && (
                    <button onClick={() => handleDelete(u.id)} className="p-1 text-text-muted hover:text-rose">
                      <Icon name="trash" size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <UserModal
          userRecord={editing}
          error={error}
          onClose={() => setShowForm(false)}
          onSave={async (payload) => {
            setError("");
            try {
              if (editing) await api.put(`/users/${editing.id}`, payload);
              else await api.post("/users", payload);
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

function UserModal({ userRecord, error, onClose, onSave }) {
  const [name, setName] = useState(userRecord?.name || "");
  const [email, setEmail] = useState(userRecord?.email || "");
  const [role, setRole] = useState(userRecord?.role || "user");
  const [password, setPassword] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { name, email, role };
    if (password) payload.password = password;
    onSave(payload);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 bw-modal-overlay">
      <div className="bg-card rounded-2xl p-6 w-full max-w-md bw-modal-card">
        <h2 className="font-semibold text-base mb-4">{userRecord ? "Edit User" : "Add New User"}</h2>
        {error && <div className="mb-3 px-3 py-2 bg-rose-soft text-rose rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Name *</label>
            <input required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="Full name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Email *</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm" placeholder="name@example.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-body mb-1">Role *</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm">
              <option value="user">User (Regular)</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-body mb-1">
              Password {userRecord ? "(leave blank to keep current)" : "*"}
            </label>
            <input type="password" required={!userRecord} value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
              placeholder={userRecord ? "........" : "At least 6 characters"} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="flex-1 bg-sage text-white rounded-lg py-2.5 text-sm font-medium">
              {userRecord ? "Save Changes" : "Create User"}
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
