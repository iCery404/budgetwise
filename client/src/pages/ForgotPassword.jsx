import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import Logo from "../components/Logo";
import LeafScatter from "../components/LeafScatter";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setResult(data);
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
          <p className="text-xs text-text-muted mt-1">Forgot password</p>
        </div>

        {error && (
          <div className="mb-4 px-3.5 py-2.5 bg-rose-soft text-rose rounded-lg text-sm">{error}</div>
        )}

        {result?.tempPassword ? (
          <div className="space-y-4">
            <div className="px-3.5 py-3 bg-sage-light text-sage-deep rounded-lg text-sm">
              {result.message}
            </div>
            <div className="bg-muted rounded-lg p-4 text-center">
              <div className="text-xs text-text-muted mb-1">Your temporary password</div>
              <div className="text-lg font-mono font-semibold tracking-wide">{result.tempPassword}</div>
            </div>
            <button
              onClick={() => navigate("/reset-password", { state: { email, tempPassword: result.tempPassword } })}
              className="w-full bg-sage text-white rounded-lg py-2.5 text-sm font-medium hover:brightness-105"
            >
              Continue to reset password
            </button>
          </div>
        ) : result ? (
          <div className="space-y-4">
            <div className="px-3.5 py-3 bg-muted text-text-body rounded-lg text-sm">{result.message}</div>
            <Link
              to="/login"
              className="block w-full text-center bg-sage text-white rounded-lg py-2.5 text-sm font-medium hover:brightness-105"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-body mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sage text-white rounded-lg py-2.5 text-sm font-medium hover:brightness-105 disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send reset code"}
            </button>
          </form>
        )}

        <p className="text-center text-[12.5px] text-text-muted mt-4">
          <Link to="/login" className="text-sage font-semibold">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
