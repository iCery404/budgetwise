import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import LeafScatter from "../components/LeafScatter";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
      <LeafScatter />
      <div className="relative w-full max-w-[440px] bg-card border border-border rounded-2xl shadow-md p-8">
        <div className="text-center mb-7">
          <div className="w-14 h-14 mx-auto mb-3 flex items-center justify-center">
            <Logo size={56} />
          </div>
          <h1 className="text-xl font-semibold">Create your account</h1>
          <p className="text-xs text-text-muted mt-1">
            <span className="text-sage font-semibold">Budget</span>Wise &middot; Track, Plan, Prosper
          </p>
        </div>

        {error && (
          <div className="mb-4 px-3.5 py-2.5 bg-rose-soft text-rose rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-body mb-1.5">Full name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
              placeholder="Juan Dela Cruz"
            />
          </div>
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
            <p className="text-[11px] text-text-muted mt-1">
              Use admin@budgetwise.test if this is the first account and you want admin access.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-body mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-body mb-1.5">Confirm password</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
              placeholder="Re-type password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sage text-white rounded-lg py-2.5 text-sm font-medium hover:brightness-105 disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-center text-[12.5px] text-text-muted mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-sage font-semibold">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
