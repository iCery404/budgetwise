import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import Logo from "../components/Logo";
import LeafScatter from "../components/LeafScatter";

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || "");
  const [tempPassword, setTempPassword] = useState(location.state?.tempPassword || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Those two passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { email, tempPassword, newPassword });
      navigate("/login", { state: { resetDone: true } });
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
      <LeafScatter />
      <div className="relative w-full max-w-[420px] bg-card border border-border rounded-2xl shadow-md p-8">
        <div className="text-center mb-7">
          <div className="w-14 h-14 mx-auto mb-3 flex items-center justify-center">
            <Logo size={56} />
          </div>
          <h1 className="text-xl font-semibold">
            <span className="text-sage">Budget</span>Wise
          </h1>
          <p className="text-xs text-text-muted mt-1">Reset password</p>
        </div>

        {error && (
          <div className="mb-4 px-3.5 py-2.5 bg-rose-soft text-rose rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-body mb-1.5">Email</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-body mb-1.5">Temporary password</label>
            <input
              required value={tempPassword} onChange={(e) => setTempPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
              placeholder="From the previous step"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-body mb-1.5">New password</label>
            <input
              type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-body mb-1.5">Confirm new password</label>
            <input
              type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sage text-white rounded-lg py-2.5 text-sm font-medium hover:brightness-105 disabled:opacity-60"
          >
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>

        <p className="text-center text-[12.5px] text-text-muted mt-4">
          <Link to="/login" className="text-sage font-semibold">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
