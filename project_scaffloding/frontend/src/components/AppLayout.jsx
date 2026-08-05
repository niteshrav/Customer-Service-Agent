/**
 * Module: Shell layout (header, nav, footer, outlet)
 *
 * Global chrome: links by auth state, logout, legal footer. Renders child routes via Outlet and mounts ChatbotWidget on every page.
 */
/**
 * Module: Shell layout
 *
 * Header, nav, footer, child routes (Outlet), and global ChatbotWidget on every page.
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
    try { await AuthApi.logout(); } catch {}
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="header">
        <div><strong>Customer Service Agent</strong></div>
        <nav>
          <Link to="/">Home</Link>
          {!authed && <Link to="/login">Login</Link>}
          {!authed && <Link to="/register">Register</Link>}
          {authed && <Link to="/dashboard">Dashboard</Link>}
          {authed && <span>{user?.full_name || user?.email}</span>}
          {authed && <button className="btn secondary" onClick={logout}>Logout</button>}
        </nav>
      </header>
      <main className="container">
        <Outlet />
      </main>
      <ChatbotWidget />
      <footer className="site-footer" role="contentinfo">
        <div className="site-footer-inner">
          <div className="site-footer-left">
            © {year} your compay. All rights reserved.
          </div>
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
