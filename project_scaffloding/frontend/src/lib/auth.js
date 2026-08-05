/**
 * Module: Browser session (JWT + user snapshot)
 *
 * Token and user JSON in localStorage; helpers for login/logout and isAuthed(). Used by api/client and route guards.
 */
const TOKEN_KEY = "csa_auth_token";
const USER_KEY = "csa_auth_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token || "");
  localStorage.setItem(USER_KEY, JSON.stringify(user || null));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function isAuthed() {
  return !!getToken();
}

export function passwordPolicyError(password) {
  if ((password || "").length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must include at least one lowercase letter.";
  if (!/\d/.test(password)) return "Password must include at least one number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include at least one special character.";
  return "";
}
