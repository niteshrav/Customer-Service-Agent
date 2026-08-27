/**
 * Module: Login — demo role fill, one-click sign-in, credentials form.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthApi } from "../api/client";
import { setSession } from "../lib/auth";
import { getDemoRoleCredentials } from "../lib/demoRoles";
import { toast } from "../lib/toast";

const DEMO_ROLE_META = {
  customer: {
    title: "Customer",
    blurb: "Submit inquiries and approve resolutions.",
    className: "demo-role--customer",
  },
  agent: {
    title: "Support agent",
    blurb: "Work assigned cases and reply in-thread.",
    className: "demo-role--agent",
  },
  management: {
    title: "Management",
    blurb: "Org-wide metrics and full inquiry visibility.",
    className: "demo-role--management",
  },
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  const info = useMemo(() => {
    const q = new URLSearchParams(location.search);
    if (q.get("registered") === "1") return "Registration successful";
    if (q.get("expired") === "1") return "Session expired. Please login again.";
    return "";
  }, [location.search]);

  const demoRoles = getDemoRoleCredentials();

  useEffect(() => {
    const role = new URLSearchParams(location.search).get("demo");
    if (!role || !demoRoles?.[role]) return;
    const creds = demoRoles[role];
    setEmail(creds.email);
    setPassword(creds.password);
  }, [location.search, demoRoles]);

  function fillRole(role) {
    const creds = demoRoles?.[role];
    if (!creds) return;
    setEmail(creds.email);
    setPassword(creds.password);
  }

  async function signInWithCredentials(nextEmail, nextPassword, roleKey = "") {
    setError("");
    setLoading(true);
    if (roleKey) setDemoLoading(roleKey);
    try {
      const data = await AuthApi.login({ email: nextEmail, password: nextPassword });
      setSession(data.token, data.user);
      toast.success("Signed in successfully");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
      setDemoLoading("");
    }
  }

  async function signInAsRole(role) {
    const creds = demoRoles?.[role];
    if (!creds) return;
    setEmail(creds.email);
    setPassword(creds.password);
    await signInWithCredentials(creds.email, creds.password, role);
  }

  async function onSubmit(e) {
    e.preventDefault();
    await signInWithCredentials(email, password);
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel card">
        <header className="auth-panel-head">
          <p className="auth-kicker">Demo workspace</p>
          <h2 className="title">Sign in</h2>
          <p className="auth-lead">Choose a demo role or enter credentials to open the inquiry workspace.</p>
        </header>

        {demoRoles && (
          <div className="notice demo-login-hint" role="region" aria-label="Demo login">
            <strong>One-click demo access</strong>
            <p className="demo-roles-subtitle">Pre-seeded accounts for evaluators — password is the same for all roles.</p>

            <div className="demo-roles">
              {Object.entries(DEMO_ROLE_META).map(([key, meta]) => {
                const creds = demoRoles[key];
                if (!creds) return null;
                return (
                  <div key={key} className={`demo-role ${meta.className}`}>
                    <div className="demo-role-title">{meta.title}</div>
                    <p className="demo-role-blurb">{meta.blurb}</p>
                    <div className="demo-role-creds">
                      <div>
                        Email: <code>{creds.email}</code>
                      </div>
                      <div>
                        Password: <code>{creds.password}</code>
                      </div>
                    </div>
                    <div className="demo-role-actions">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => signInAsRole(key)}
                        disabled={loading || !!demoLoading}
                      >
                        {demoLoading === key ? "Signing in…" : `Sign in as ${meta.title}`}
                      </button>
                      <button type="button" className="btn secondary" onClick={() => fillRole(key)}>
                        Fill form
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {info && <div className="success">{info}</div>}
        {error && <div className="error">{error}</div>}

        <form className="form auth-form" onSubmit={onSubmit}>
          <label className="field">
            <span className="field-label">Email</span>
            <input
              className="input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              required
            />
          </label>
          <button className="btn" disabled={loading || !!demoLoading}>
            {loading && !demoLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="auth-footer-link">
          New user? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
