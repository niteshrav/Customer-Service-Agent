/**
 * Module: HTTP API client
 *
 * apiFetch attaches JWT, handles 401 redirect to login. Exports AuthApi, InquiryApi (inquiries, CRM, approve, metrics), ChatApi.
 */
import { clearSession, getToken } from "../lib/auth";

const BASE = import.meta.env.VITE_API_BASE_URL || "";

function url(path) {
  return `${BASE}${path}`;
}

export async function apiFetch(path, options = {}, { allow401 = false } = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url(path), { ...options, headers });
  let data = null;
  try { data = await res.json(); } catch {}

  if (!res.ok) {
    if (res.status === 401 && !allow401) {
      clearSession();
      window.location.href = "/login?expired=1";
    }
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export const AuthApi = {
  register(payload) {
    return apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify(payload) }, { allow401: true });
  },
  login(payload) {
    return apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }, { allow401: true });
  },
  me() {
    return apiFetch("/api/auth/me", { method: "GET" }, { allow401: true });
  },
  logout() {
    return apiFetch("/api/auth/logout", { method: "POST" }, { allow401: true });
  },
};

export const InquiryApi = {
  health() {
    return apiFetch("/api/health", { method: "GET" }, { allow401: true });
  },
  list() {
    return apiFetch("/api/inquiries", { method: "GET" });
  },
  /** US-5: database-backed counts; scope reflects role (organization | agent_bucket | customer). */
  metrics() {
    return apiFetch("/api/metrics/inquiries", { method: "GET" });
  },
  createInquiry(body) {
    return apiFetch("/api/inquiries", {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  },
  detail(inquiryId) {
    return apiFetch(`/api/inquiries/${encodeURIComponent(inquiryId)}`, { method: "GET" });
  },
  crm(inquiryId) {
    return apiFetch(`/api/inquiries/${encodeURIComponent(inquiryId)}/crm`, { method: "GET" });
  },
  approveInquiry(inquiryId) {
    return apiFetch(`/api/inquiries/${encodeURIComponent(inquiryId)}/approve`, {
      method: "POST",
    });
  },
  sendMessage(inquiryId, body) {
    return apiFetch(`/api/inquiries/${encodeURIComponent(inquiryId)}/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  },
};

export const ChatApi = {
  chat({ question, pathname, mode = "auto", conversation_id }) {
    return apiFetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ question, pathname, mode, conversation_id }),
    });
  },
};
