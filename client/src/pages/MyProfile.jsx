import { useEffect, useState, useCallback } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";

export default function MyProfile() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get("/profile");
    setData(data);
    setName(data.user.name);
    setEmail(data.user.email);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);

    if (password && password !== confirmPassword) {
      setMessage({ type: "error", text: "Those two passwords don't match. Please type your new password the same way in both boxes." });
      return;
    }

    const payload = {};
    if (name.trim() && name.trim() !== data.user.name) payload.name = name.trim();
    if (email.trim() && email.trim() !== data.user.email) payload.email = email.trim();
    if (password) payload.password = password;

    if (Object.keys(payload).length === 0) {
      setMessage({ type: "error", text: "You haven't changed anything yet." });
      return;
    }

    setSaving(true);
    try {
      const { data: res } = await api.post("/profile/request", payload);
      setPassword("");
      setConfirmPassword("");
      setMessage({
        type: "success",
        text: res.autoApplied
          ? "Done! Your changes are saved."
          : "Got it! Your request has been sent to the admin. Your info will change once they say yes.",
      });
      load();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Something went wrong. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(requestId) {
    if (!confirm("Cancel this request?")) return;
    await api.delete(`/profile/request/${requestId}`);
    load();
  }

  if (!data) return <div className="text-text-muted text-sm">Loading...</div>;

  const pending = data.pendingRequest;

  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-semibold mb-1">My Profile</h1>
      <p className="text-sm text-text-muted mb-6">
        Here you can change your name, email, or password. Just type what you want below and press Save.
      </p>

      {pending && (
        <div className="bg-sand-soft border border-sand rounded-2xl p-4 mb-6 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-sand flex items-center justify-center flex-shrink-0 text-white">
            <Icon name="edit" size={16} />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm text-text mb-1">You have a change waiting for approval</div>
            <div className="text-[13px] text-text-body">
              {pending.requested_name && <div>New name: <strong>{pending.requested_name}</strong></div>}
              {pending.requested_email && <div>New email: <strong>{pending.requested_email}</strong></div>}
              <div className="text-text-muted mt-1">An admin needs to say yes before this becomes real.</div>
            </div>
            <button
              onClick={() => handleCancel(pending.id)}
              className="mt-2 text-[12.5px] text-rose font-medium hover:underline"
            >
              Cancel this request
            </button>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`mb-5 px-4 py-3 rounded-xl text-sm ${
            message.type === "success" ? "bg-sage-light text-sage-deep" : "bg-rose-soft text-rose"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5">
        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">Your name</label>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-border rounded-xl text-[15px] outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">Your email</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-border rounded-xl text-[15px] outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
          />
        </div>

        <div className="pt-2 border-t border-border">
          <div className="text-sm font-medium text-text-body mb-3">Want a new password? (Optional)</div>
          <label className="block text-xs text-text-muted mb-1.5">New password</label>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep your current password"
            className="w-full px-3.5 py-2.5 border border-border rounded-xl text-[15px] outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 mb-3"
          />
          {password && (
            <>
              <label className="block text-xs text-text-muted mb-1.5">Type it again</label>
              <input
                type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-xl text-[15px] outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
              />
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-sage text-white rounded-xl py-3 text-[15px] font-semibold hover:brightness-105 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save my changes"}
        </button>

        {user?.role !== "admin" && (
          <p className="text-center text-xs text-text-muted">
            Since you're a regular user, an admin will check your request before it takes effect.
          </p>
        )}
      </form>
    </div>
  );
}
