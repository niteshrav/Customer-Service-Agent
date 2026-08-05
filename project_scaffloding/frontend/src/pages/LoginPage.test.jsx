import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearSession, getToken, getUser } from "../lib/auth";
import { getDemoRoleCredentials } from "../lib/demoRoles";
import LoginPage from "./LoginPage";

const loginMock = vi.fn();

vi.mock("../api/client", () => ({
  AuthApi: {
    login: (...args) => loginMock(...args),
  },
}));

vi.mock("../lib/demoRoles", () => ({
  getDemoRoleCredentials: vi.fn(() => null),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.mocked(getDemoRoleCredentials).mockReturnValue(null);
  });

  afterEach(() => {
    clearSession();
    loginMock.mockReset();
  });

  function renderPage(initialEntry = "/login") {
    const router = createMemoryRouter(
      [
        { path: "/login", element: <LoginPage /> },
        { path: "/dashboard", element: <div>DashboardRoute</div> },
      ],
      { initialEntries: [initialEntry] },
    );
    render(<RouterProvider router={router} />);
    return router;
  }

  it("shows role-based demo credentials with Fill buttons", () => {
    vi.mocked(getDemoRoleCredentials).mockReturnValue({
      customer: { email: "cust@example.com", password: "Cust1!csa" },
      agent: { email: "agent@example.com", password: "Agent1!csa" },
      management: { email: "lead@example.com", password: "Lead1!csa" },
    });
    renderPage();
    expect(screen.getByRole("region", { name: /demo login/i })).toBeInTheDocument();
    expect(screen.getByText("cust@example.com")).toBeInTheDocument();
    expect(screen.getByText("agent@example.com")).toBeInTheDocument();
    expect(screen.getByText("lead@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Fill Customer/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Fill Agent/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Fill Management/i })).toBeInTheDocument();
  });

  it("Fill button populates email/password inputs", async () => {
    vi.mocked(getDemoRoleCredentials).mockReturnValue({
      customer: { email: "cust@example.com", password: "Cust1!csa" },
      agent: { email: "agent@example.com", password: "Agent1!csa" },
      management: { email: "lead@example.com", password: "Lead1!csa" },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /Fill Customer/i }));
    expect(screen.getByPlaceholderText("Email")).toHaveValue("cust@example.com");
    expect(screen.getByPlaceholderText("Password")).toHaveValue("Cust1!csa");
  });

  it("shows registration success banner when query param present", () => {
    renderPage("/login?registered=1");
    expect(screen.getByText(/Registration successful/i)).toBeInTheDocument();
  });

  it("shows session expired banner when query param present", () => {
    renderPage("/login?expired=1");
    expect(screen.getByText(/Session expired/i)).toBeInTheDocument();
  });

  it("logs in, stores session, and navigates to dashboard", async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValue({
      token: "tok-99",
      user: { email: "a@b.com", full_name: "A" },
    });
    const router = renderPage();

    await user.type(screen.getByPlaceholderText("Email"), "a@b.com");
    await user.type(screen.getByPlaceholderText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({ email: "a@b.com", password: "secret" });
    });
    await waitFor(() => {
      expect(getToken()).toBe("tok-99");
      expect(getUser()).toEqual({ email: "a@b.com", full_name: "A" });
      expect(router.state.location.pathname).toBe("/dashboard");
    });
  });
});
