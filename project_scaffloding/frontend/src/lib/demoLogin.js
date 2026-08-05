/**
 * Module: Demo agent login hint (env-driven)
 *
 * demoLoginHintFromEnv reads VITE_* for the single-agent demo strip on LoginPage; returns null when demo banner disabled.
 */
const DEFAULT_EMAIL = "demo@csa.local";
const DEFAULT_PASSWORD = "Demo1!csa";

/**
 * Pure helper for tests and for building the login-page demo banner.
 * @param {Record<string, string | boolean | undefined>} env
 * @returns {{ email: string, password: string } | null}
 */
export function demoLoginHintFromEnv(env) {
  // Show by default in dev unless explicitly disabled.
  // If VITE_SHOW_DEMO_LOGIN is "false", hide the banner.
  if (String(env.VITE_SHOW_DEMO_LOGIN ?? "") === "false") return null;
  return {
    email: String(env.VITE_DEMO_LOGIN_EMAIL || DEFAULT_EMAIL),
    password: String(env.VITE_DEMO_LOGIN_PASSWORD || DEFAULT_PASSWORD),
  };
}

export function getDemoLoginHint() {
  const flag = String(import.meta.env.VITE_SHOW_DEMO_LOGIN ?? "");
  // Keep this local/dev-only unless explicitly enabled.
  if (!import.meta.env.DEV && flag !== "true") return null;
  return demoLoginHintFromEnv(import.meta.env);
}
