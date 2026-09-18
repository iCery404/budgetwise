import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import LeafScatter from "../components/LeafScatter";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
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
      <div className="relative w-full max-w-[420px] bg-card border border-border rounded-2xl shadow-md p-8">
        <div className="text-center mb-7">
          <div className="w-14 h-14 mx-auto mb-3 flex items-center justify-center">
            <Logo size={56} />
          </div>
          <h1 className="text-xl font-semibold">
            <span className="text-sage">Budget</span>Wise
          </h1>
          <p className="text-xs text-text-muted mt-1">Track &middot; Plan &middot; Prosper</p>
        </div>

        {error && (
          <div className="mb-4 px-3.5 py-2.5 bg-rose-soft text-rose rounded-lg text-sm">{error}</div>
        )}

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
          <div>
            <label className="block text-xs font-medium text-text-body mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
              placeholder="Password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sage text-white rounded-lg py-2.5 text-sm font-medium hover:brightness-105 disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div className="mt-4 px-3.5 py-2.5 bg-muted rounded-lg text-[11.5px] text-text-muted leading-relaxed">
          <strong className="text-text-body">Demo accounts</strong>
          <br />
          admin@budgetwise.test / password123
          <br />
          user@budgetwise.test / password123
        </div>

        <p className="text-center text-[12.5px] text-text-muted mt-4">
          Don't have an account?{" "}
          <Link to="/register" className="text-sage font-semibold">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
