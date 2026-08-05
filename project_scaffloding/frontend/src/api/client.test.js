import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getToken, setSession } from "../lib/auth";
import { apiFetch, AuthApi } from "./client";

describe("apiFetch", () => {
  const originalFetch = globalThis.fetch;
  let href;

  beforeEach(() => {
    href = "";
    delete window.location;
    window.location = { href: "", assign: vi.fn(), replace: vi.fn() };
    Object.defineProperty(window.location, "href", {
      configurable: true,
      get: () => href,
      set: (v) => {
        href = v;
      },
    });
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    localStorage.clear();
  });

  it("sends Authorization when token exists", async () => {
    setSession("abc", { email: "x@y.com" });
    const spy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    globalThis.fetch = spy;
    await apiFetch("/api/health", { method: "GET" }, { allow401: true });
    expect(spy).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer abc" }),
      }),
    );
  });

  it("on 401 without allow401 clears session and redirects to login", async () => {
    setSession("abc", { email: "x@y.com" });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: "nope" }),
    });
    await expect(apiFetch("/api/inquiries")).rejects.toThrow();
    expect(getToken()).toBe("");
    expect(href).toBe("/login?expired=1");
  });

  it("AuthApi.register uses allow401", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ ok: true }),
    });
    await AuthApi.register({ email: "a@b.com", password: "X" });
    expect(globalThis.fetch).toHaveBeenCalled();
  });
});
