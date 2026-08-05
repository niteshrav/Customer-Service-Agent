import { afterEach, describe, expect, it } from "vitest";
import {
  clearSession,
  getToken,
  getUser,
  isAuthed,
  passwordPolicyError,
  setSession,
} from "./auth";

const TOKEN_KEY = "csa_auth_token";
const USER_KEY = "csa_auth_user";

describe("auth session", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("setSession and clearSession manage token and user JSON", () => {
    setSession("tok1", { email: "a@b.com", full_name: "A" });
    expect(localStorage.getItem(TOKEN_KEY)).toBe("tok1");
    expect(JSON.parse(localStorage.getItem(USER_KEY))).toEqual({
      email: "a@b.com",
      full_name: "A",
    });
    expect(getToken()).toBe("tok1");
    expect(getUser()).toEqual({ email: "a@b.com", full_name: "A" });
    expect(isAuthed()).toBe(true);
    clearSession();
    expect(getToken()).toBe("");
    expect(getUser()).toBeNull();
    expect(isAuthed()).toBe(false);
  });

  it("getUser returns null on corrupt JSON", () => {
    localStorage.setItem(USER_KEY, "{not-json");
    expect(getUser()).toBeNull();
  });
});

describe("passwordPolicyError", () => {
  it("returns empty string for a compliant password", () => {
    expect(passwordPolicyError("Aa1!aaaa")).toBe("");
  });

  it("requires length, cases, digit, and special character", () => {
    expect(passwordPolicyError("short1!")).toContain("8 characters");
    expect(passwordPolicyError("aaaaaa1!")).toContain("uppercase");
    expect(passwordPolicyError("AAAAAA1!")).toContain("lowercase");
    expect(passwordPolicyError("AAAAAAa!")).toContain("number");
    expect(passwordPolicyError("AAAAAAa1")).toContain("special");
  });
});
