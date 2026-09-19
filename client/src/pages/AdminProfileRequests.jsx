import { useEffect, useState, useCallback } from "react";
import api from "../api";
import Icon from "../components/Icon";

export default function AdminProfileRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await api.get("/profile-requests");
      setRequests(data);
    } catch (err) {
      setLoadError(err.response?.data?.message || "Couldn't load requests. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id, requestType) {
    if (requestType === "delete" && !confirm("This permanently deletes the account and all its data. Approve?")) return;
    setBusyId(id);
    try {
      await api.post(`/profile-requests/${id}/approve`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Could not approve this request.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id) {
    if (!confirm("Say no to this request? The user will keep their current info.")) return;
    setBusyId(id);
    try {
      await api.post(`/profile-requests/${id}/reject`);
      load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="text-lg font-semibold mb-1">Profile Change Requests</h1>
      <p className="text-sm text-text-muted mb-6">
        Users asked to change their name, email, or password &mdash; or to delete their account. Nothing changes until you say yes.
      </p>

      {loadError ? (
        <div className="bg-rose-soft text-rose rounded-lg px-4 py-3 text-sm flex items-center justify-between gap-3">
          <span>{loadError}</span>
          <button onClick={load} className="font-medium underline flex-shrink-0">Retry</button>
        </div>
      ) : loading ? (
        <div className="text-text-muted text-sm">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center mx-auto mb-3">
            <Icon name="users" size={20} className="text-sage-deep" />
          </div>
          <div className="text-text-body font-medium mb-1">All caught up!</div>
          <div className="text-sm text-text-muted">There are no pending requests right now.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="text-sm text-text-muted mb-2">
                <strong className="text-text">{r.current_name}</strong> ({r.current_email}) {r.request_type === "delete" ? "wants to:" : "wants to change:"}
              </div>
              <div className="space-y-1 mb-4">
                {r.request_type === "delete" ? (
                  <div className="text-[14px] text-rose font-medium">Delete their account (permanent, all data removed)</div>
                ) : (
                  <>
                    {r.requested_name && (
                      <div className="text-[14px]">
                        Name &rarr; <strong className="text-sage-deep">{r.requested_name}</strong>
                      </div>
                    )}
                    {r.requested_email && (
                      <div className="text-[14px]">
                        Email &rarr; <strong className="text-sage-deep">{r.requested_email}</strong>
                      </div>
                    )}
                    {r.requested_password && (
                      <div className="text-[14px]">
                        Password &rarr; <strong className="text-sage-deep">wants a new one (hidden for safety)</strong>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(r.id, r.request_type)}
                  disabled={busyId === r.id}
                  className={`flex-1 flex items-center justify-center gap-2 text-white rounded-xl py-2.5 text-sm font-semibold hover:brightness-105 disabled:opacity-60 ${
                    r.request_type === "delete" ? "bg-rose" : "bg-sage"
                  }`}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {r.request_type === "delete" ? "Yes, delete" : "Yes, allow it"}
                </button>
                <button
                  onClick={() => handleReject(r.id)}
                  disabled={busyId === r.id}
                  className="flex-1 flex items-center justify-center gap-2 border border-border text-rose rounded-xl py-2.5 text-sm font-semibold hover:bg-rose-soft disabled:opacity-60"
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  No, decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
