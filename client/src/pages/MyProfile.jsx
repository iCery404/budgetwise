import { useEffect, useState, useCallback } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { calcAge } from "../components/Shared";
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

  const [birthday, setBirthday] = useState("");
  const [sex, setSex] = useState("");
  const [detailsMessage, setDetailsMessage] = useState(null);
  const [detailsSaving, setDetailsSaving] = useState(false);

  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteMessage, setDeleteMessage] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const { data } = await api.get("/profile");
      setData(data);
      setName(data.user.name);
      setEmail(data.user.email);
      setBirthday(data.user.birthday ? data.user.birthday.slice(0, 10) : "");
      setSex(data.user.sex || "");
    } catch (err) {
      setLoadError(err.response?.data?.message || "Couldn't load your profile. Please try again.");
    }
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

  async function handleDetailsSubmit(e) {
    e.preventDefault();
    setDetailsMessage(null);
    setDetailsSaving(true);
    try {
      await api.put("/profile/details", { birthday: birthday || null, sex: sex || null });
      setDetailsMessage({ type: "success", text: "Saved." });
      load();
    } catch (err) {
      setDetailsMessage({ type: "error", text: err.response?.data?.message || "Something went wrong. Please try again." });
    } finally {
      setDetailsSaving(false);
    }
  }

  async function handleDeleteRequest() {
    setDeleteMessage(null);
    setDeleteSaving(true);
    try {
      const { data: res } = await api.post("/profile/delete-request");
      setDeleteMessage({ type: "success", text: res.message });
      setDeleteStep(0);
      load();
    } catch (err) {
      setDeleteMessage({ type: "error", text: err.response?.data?.message || "Something went wrong. Please try again." });
    } finally {
      setDeleteSaving(false);
    }
  }

  if (loadError) {
    return (
      <div className="bg-rose-soft text-rose rounded-lg px-4 py-3 text-sm flex items-center justify-between gap-3 max-w-xl">
        <span>{loadError}</span>
        <button onClick={load} className="font-medium underline flex-shrink-0">Retry</button>
      </div>
    );
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
            <Icon name={pending.request_type === "delete" ? "trash" : "edit"} size={16} />
          </div>
          <div className="flex-1">
            {pending.request_type === "delete" ? (
              <>
                <div className="font-semibold text-sm text-text mb-1">Your account deletion is waiting for approval</div>
                <div className="text-[13px] text-text-body">
                  <div className="text-text-muted mt-1">An admin needs to say yes before your account is removed.</div>
                </div>
              </>
            ) : (
              <>
                <div className="font-semibold text-sm text-text mb-1">You have a change waiting for approval</div>
                <div className="text-[13px] text-text-body">
                  {pending.requested_name && <div>New name: <strong>{pending.requested_name}</strong></div>}
                  {pending.requested_email && <div>New email: <strong>{pending.requested_email}</strong></div>}
                  <div className="text-text-muted mt-1">An admin needs to say yes before this becomes real.</div>
                </div>
              </>
            )}
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

      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5 mt-5">
        <div>
          <h2 className="text-sm font-semibold text-text mb-0.5">Profile details</h2>
          <p className="text-xs text-text-muted">These save right away &mdash; no approval needed.</p>
        </div>

        {detailsMessage && (
          <div
            className={`px-4 py-3 rounded-xl text-sm ${
              detailsMessage.type === "success" ? "bg-sage-light text-sage-deep" : "bg-rose-soft text-rose"
            }`}
          >
            {detailsMessage.text}
          </div>
        )}

        <form onSubmit={handleDetailsSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Birthday</label>
              <input
                type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="w-full px-3.5 py-2.5 border border-border rounded-xl text-[15px] outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Sex</label>
              <select
                value={sex} onChange={(e) => setSex(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-xl text-[15px] outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
              >
                <option value="">Not set</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not">Prefer not to say</option>
              </select>
            </div>
          </div>
          {birthday && (
            <div className="text-xs text-text-muted">Age: <strong className="text-text-body">{calcAge(birthday)}</strong></div>
          )}
          <button
            type="submit"
            disabled={detailsSaving}
            className="w-full bg-sage text-white rounded-xl py-3 text-[15px] font-semibold hover:brightness-105 disabled:opacity-60"
          >
            {detailsSaving ? "Saving..." : "Save details"}
          </button>
        </form>
      </div>

      <div className="bg-card border border-rose/30 rounded-2xl p-5 shadow-sm mt-5">
        <h2 className="text-sm font-semibold text-rose mb-0.5">Delete account</h2>
        <p className="text-xs text-text-muted mb-4">
          This permanently removes your account and all your data. It needs admin approval.
        </p>

        {deleteMessage && (
          <div
            className={`mb-4 px-4 py-3 rounded-xl text-sm ${
              deleteMessage.type === "success" ? "bg-sage-light text-sage-deep" : "bg-rose-soft text-rose"
            }`}
          >
            {deleteMessage.text}
          </div>
        )}

        {pending?.request_type !== "delete" && (
          deleteStep === 1 ? (
            <div className="space-y-3">
              <p className="text-sm text-text-body">Needs admin approval. Continue?</p>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteRequest}
                  disabled={deleteSaving}
                  className="flex-1 bg-rose text-white rounded-xl py-2.5 text-sm font-semibold hover:brightness-105 disabled:opacity-60"
                >
                  {deleteSaving ? "Sending..." : "Yes, request deletion"}
                </button>
                <button
                  onClick={() => setDeleteStep(0)}
                  className="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setDeleteStep(1)}
              className="flex items-center gap-1.5 border border-rose/40 text-rose text-sm font-medium px-4 py-2 rounded-xl hover:bg-rose-soft"
            >
              <Icon name="trash" size={14} /> Delete account
            </button>
          )
        )}
      </div>
    </div>
  );
}
