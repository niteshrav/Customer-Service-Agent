/**
 * Module: Shell layout — skip link, header, footer, toast host, chatbot.
 */
import { Link, Outlet, useNavigate } from "react-router-dom";
import { clearSession, getUser, isAuthed } from "../lib/auth";
import { roleNavLabel } from "../lib/dashboardTheme";
import { AuthApi } from "../api/client";
import ChatbotWidget from "./ChatbotWidget";
import ToastHost from "./ToastHost";

export default function AppLayout() {
  const navigate = useNavigate();
  const authed = isAuthed();
  const user = getUser();
  const year = new Date().getFullYear();
  const roleClass = user?.role ? `header-role--${user.role}` : "";

  async function logout() {
    try {
      await AuthApi.logout();
    } catch {
      /* ignore */
    }
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="header">
        <Link to="/" className="header-brand">
          <span className="header-brand-mark">CSA</span>
          <strong>Customer Service Agent</strong>
        </Link>
        <nav aria-label="Primary">
          <Link to="/">Home</Link>
          {!authed && <Link to="/login">Login</Link>}
          {!authed && (
            <Link className="btn btn-compact header-demo-btn" to="/login">
              Demo login
            </Link>
          )}
          {!authed && <Link to="/register">Register</Link>}
          {authed && <Link to="/dashboard">Dashboard</Link>}
          {authed && user?.role ? (
            <span className={`header-role-pill ${roleClass}`}>{roleNavLabel(user.role)}</span>
          ) : null}
          {authed && <span className="header-user">{user?.full_name || user?.email}</span>}
          {authed && (
            <button type="button" className="btn secondary btn-compact" onClick={logout}>
              Logout
            </button>
          )}
        </nav>
      </header>
      <main id="main-content" className="container" tabIndex={-1}>
        <Outlet />
      </main>
      <ChatbotWidget />
      <ToastHost />
      <footer className="site-footer" role="contentinfo">
        <div className="site-footer-inner">
          <div className="site-footer-left">© {year} Customer Service Agent. All rights reserved.</div>
          <div className="site-footer-right">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/cookies">Cookie Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
