/**
 * Module: Login page
 *
 * Posts AuthApi.login, stores session, navigates to dashboard; shows env-driven demo credential hints and role fill buttons.
 */
/**
 * Module: Login
 *
 * AuthApi.login, session storage, demo credential hints from env.
 */
import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthApi } from "../api/client";
import { setSession } from "../lib/auth";
import { getDemoRoleCredentials } from "../lib/demoRoles";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const info = useMemo(() => {
    const q = new URLSearchParams(location.search);
    if (q.get("registered") === "1") return "Registration successful";
    if (q.get("expired") === "1") return "Session expired. Please login again.";
    return "";
  }, [location.search]);

  const demoRoles = getDemoRoleCredentials();

  function fillRole(role) {
    const creds = demoRoles?.[role];
    if (!creds) return;
    setEmail(creds.email);
    setPassword(creds.password);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await AuthApi.login({ email, password });
      setSession(data.token, data.user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2 className="title">Login</h2>
      {demoRoles && (
        <div className="notice demo-login-hint" role="region" aria-label="Demo login">
          <strong>Demo login</strong>
          <p className="demo-roles-subtitle">Choose a role and click Fill to populate the form.</p>

          <div className="demo-roles">
            <div className="demo-role">
              <div className="demo-role-title">Customer</div>
              <div>Email: <code>{demoRoles.customer.email}</code></div>
              <div>Password: <code>{demoRoles.customer.password}</code></div>
              <button type="button" className="btn secondary" onClick={() => fillRole("customer")}>
                Fill Customer
              </button>
            </div>

            <div className="demo-role">
              <div className="demo-role-title">Agent</div>
              <div>Email: <code>{demoRoles.agent.email}</code></div>
              <div>Password: <code>{demoRoles.agent.password}</code></div>
              <button type="button" className="btn secondary" onClick={() => fillRole("agent")}>
                Fill Agent
              </button>
            </div>

            <div className="demo-role">
              <div className="demo-role-title">Management</div>
              <div>Email: <code>{demoRoles.management.email}</code></div>
              <div>Password: <code>{demoRoles.management.password}</code></div>
              <button type="button" className="btn secondary" onClick={() => fillRole("management")}>
                Fill Management
              </button>
            </div>
          </div>

          <small>
            Local dev only — run <code>npm run db:seed-demo</code> in <code>backend/</code> once.
          </small>
        </div>
      )}
      {info && <div className="success">{info}</div>}
      {error && <div className="error">{error}</div>}
      <form className="form" onSubmit={onSubmit}>
        <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn" disabled={loading}>{loading ? "Signing in..." : "Sign In"}</button>
      </form>
      <p>New user? <Link to="/register">Register</Link></p>
    </div>
  );
}
