/**
 * Module: Shell layout — header, nav, footer, outlet, global chatbot.
 */
import { Link, Outlet, useNavigate } from "react-router-dom";
import { clearSession, getUser, isAuthed } from "../lib/auth";
import { AuthApi } from "../api/client";
import ChatbotWidget from "./ChatbotWidget";

export default function AppLayout() {
  const navigate = useNavigate();
  const authed = isAuthed();
  const user = getUser();
  const year = new Date().getFullYear();

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
      <header className="header">
        <Link to="/" className="header-brand">
          <span className="header-brand-mark">CSA</span>
          <strong>Customer Service Agent</strong>
        </Link>
        <nav aria-label="Primary">
          <Link to="/">Home</Link>
          {!authed && <Link to="/login">Login</Link>}
          {!authed && <Link to="/register">Register</Link>}
          {authed && <Link to="/dashboard">Dashboard</Link>}
          {authed && <span className="header-user">{user?.full_name || user?.email}</span>}
          {authed && (
            <button type="button" className="btn secondary btn-compact" onClick={logout}>
              Logout
            </button>
          )}
        </nav>
      </header>
      <main className="container">
        <Outlet />
      </main>
      <ChatbotWidget />
      <footer className="site-footer" role="contentinfo">
        <div className="site-footer-inner">
          <div className="site-footer-left">© {year} your compay. All rights reserved.</div>
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
