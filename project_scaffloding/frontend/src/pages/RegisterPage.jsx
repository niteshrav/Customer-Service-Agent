/**
 * Module: Register — create account with password policy checks.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthApi } from "../api/client";
import { passwordPolicyError } from "../lib/auth";

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
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await AuthApi.register({ full_name: fullName, email, password });
      navigate("/login?registered=1", { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel card auth-panel-register">
        <header className="auth-panel-head">
          <h2 className="title">Register</h2>
          <p className="auth-lead">
            Create an account to access the inquiry workspace and CSA Assistant demo.
          </p>
        </header>

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
            <small className="password-policy-legacy">
              Password policy: 8+ chars, uppercase, lowercase, number, special.
            </small>
          </div>

          <button className="btn" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p className="auth-footer-link">
          Already registered? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
