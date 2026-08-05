/**
 * Module: Demo credentials per role (env-driven)
 *
 * demoRoleCredentialsFromEnv supplies customer/agent/management email+password defaults for the LoginPage role cards.
 */
const DEFAULT_PASSWORD = "Demo1!csa";

const DEFAULT_CUSTOMER = { email: "demo-customer@csa.local", password: DEFAULT_PASSWORD };
const DEFAULT_AGENT = { email: "demo@csa.local", password: DEFAULT_PASSWORD };
const DEFAULT_MANAGEMENT = { email: "demo-management@csa.local", password: DEFAULT_PASSWORD };

/**
 * Pure helper for tests / deterministic behavior.
 * Returns null to hide the role-based demo credentials banner.
 */
export function demoRoleCredentialsFromEnv(env) {
  if (String(env.VITE_SHOW_DEMO_LOGIN ?? "") === "false") return null;

  return {
    customer: {
      email: String(env.VITE_DEMO_CUSTOMER_LOGIN_EMAIL || DEFAULT_CUSTOMER.email),
      password: String(env.VITE_DEMO_CUSTOMER_LOGIN_PASSWORD || DEFAULT_CUSTOMER.password),
    },
    agent: {
      email: String(env.VITE_DEMO_LOGIN_EMAIL || DEFAULT_AGENT.email),
      password: String(env.VITE_DEMO_LOGIN_PASSWORD || DEFAULT_AGENT.password),
    },
    management: {
      email: String(env.VITE_DEMO_MANAGEMENT_LOGIN_EMAIL || DEFAULT_MANAGEMENT.email),
      password: String(
        env.VITE_DEMO_MANAGEMENT_LOGIN_PASSWORD || DEFAULT_MANAGEMENT.password,
      ),
    },
  };
}

export function getDemoRoleCredentials() {
  const flag = String(import.meta.env.VITE_SHOW_DEMO_LOGIN ?? "");
  // Keep local/dev-only unless explicitly enabled.
  if (!import.meta.env.DEV && flag !== "true") return null;
  return demoRoleCredentialsFromEnv(import.meta.env);
}

