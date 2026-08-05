import { describe, expect, it } from "vitest";
import { demoRoleCredentialsFromEnv } from "./demoRoles";

describe("demoRoleCredentialsFromEnv (TDD)", () => {
  it("returns defaults when flag is missing", () => {
    expect(demoRoleCredentialsFromEnv({})).toEqual({
      customer: { email: "demo-customer@csa.local", password: "Demo1!csa" },
      agent: { email: "demo@csa.local", password: "Demo1!csa" },
      management: { email: "demo-management@csa.local", password: "Demo1!csa" },
    });
  });

  it("returns null when flag is explicitly false", () => {
    expect(demoRoleCredentialsFromEnv({ VITE_SHOW_DEMO_LOGIN: "false" })).toBeNull();
  });

  it("uses overrides from env when set", () => {
    expect(
      demoRoleCredentialsFromEnv({
        VITE_SHOW_DEMO_LOGIN: "true",
        VITE_DEMO_CUSTOMER_LOGIN_EMAIL: "c@example.com",
        VITE_DEMO_CUSTOMER_LOGIN_PASSWORD: "Cpw1!aA",
        VITE_DEMO_LOGIN_EMAIL: "a@example.com",
        VITE_DEMO_LOGIN_PASSWORD: "Apw1!aA",
        VITE_DEMO_MANAGEMENT_LOGIN_EMAIL: "m@example.com",
        VITE_DEMO_MANAGEMENT_LOGIN_PASSWORD: "Mpw1!aA",
      }),
    ).toEqual({
      customer: { email: "c@example.com", password: "Cpw1!aA" },
      agent: { email: "a@example.com", password: "Apw1!aA" },
      management: { email: "m@example.com", password: "Mpw1!aA" },
    });
  });
});

