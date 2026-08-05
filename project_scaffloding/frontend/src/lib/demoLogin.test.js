import { describe, expect, it } from "vitest";
import { demoLoginHintFromEnv } from "./demoLogin";

describe("demoLoginHintFromEnv", () => {
  it("returns defaults when flag is missing (dev default)", () => {
    expect(demoLoginHintFromEnv({})).toEqual({
      email: "demo@csa.local",
      password: "Demo1!csa",
    });
  });

  it("returns null when flag is explicitly false", () => {
    expect(demoLoginHintFromEnv({ VITE_SHOW_DEMO_LOGIN: "false" })).toBeNull();
  });

  it("returns defaults when enabled", () => {
    expect(demoLoginHintFromEnv({ VITE_SHOW_DEMO_LOGIN: "true" })).toEqual({
      email: "demo@csa.local",
      password: "Demo1!csa",
    });
  });

  it("uses overrides from env when set", () => {
    expect(
      demoLoginHintFromEnv({
        VITE_SHOW_DEMO_LOGIN: "true",
        VITE_DEMO_LOGIN_EMAIL: "other@example.com",
        VITE_DEMO_LOGIN_PASSWORD: "Aa9!zzzz",
      }),
    ).toEqual({ email: "other@example.com", password: "Aa9!zzzz" });
  });
});
