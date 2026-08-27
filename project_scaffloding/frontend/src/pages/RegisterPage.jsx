/**
 * Module: Register — create account with password policy checks.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthApi } from "../api/client";
import { passwordPolicyError } from "../lib/auth";
import { toast } from "../lib/toast";

const POLICY_ITEMS = [
  "Minimum length of 8",
  "Uppercase and lowercase letters",
  "A number and a special character",
];

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const policyErr = passwordPolicyError(password);
    if (policyErr) {
      setError(policyErr);
      toast.warning(policyErr);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      toast.warning("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await AuthApi.register({ full_name: fullName, email, password });
      toast.success("Account created — please sign in");
      navigate("/login?registered=1", { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed");
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel card auth-panel-register">
        <header className="auth-panel-head">
          <p className="auth-kicker">New account</p>
          <h2 className="title">Create your account</h2>
          <p className="auth-lead">
            Register for the inquiry workspace, or use a pre-seeded demo role for instant access.
          </p>
        </header>

        <div className="notice auth-register-hint" role="note">
          <strong>Evaluating the demo?</strong>
          <p className="auth-register-hint-body">
            Skip registration and use demo accounts on the login page — password{" "}
            <code>Demo1!csa</code> for all roles.
          </p>
          <Link className="btn secondary btn-compact" to="/login">
            Go to demo login →
          </Link>
        </div>

        {error && <div className="error">{error}</div>}

        <form className="form auth-form" onSubmit={onSubmit}>
          <label className="field">
            <span className="field-label">Full name</span>
            <input
              className="input"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              required
            />
          </label>

          <label className="field">
            <span className="field-label">Email</span>
            <input
              className="input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <input
              className="input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          <label className="field">
            <span className="field-label">Confirm password</span>
            <input
              className="input"
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          <div className="password-policy" role="note" aria-label="Password policy">
            <div className="password-policy-title">Password policy</div>
            <ul className="password-policy-list">
              {POLICY_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <button className="btn" disabled={loading}>
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <p className="auth-footer-link">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
