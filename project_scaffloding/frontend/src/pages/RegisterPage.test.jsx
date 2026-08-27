import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearSession } from "../lib/auth";
import RegisterPage from "./RegisterPage";

const registerMock = vi.fn();

vi.mock("../api/client", () => ({
  AuthApi: {
    register: (...args) => registerMock(...args),
  },
}));

describe("RegisterPage", () => {
  beforeEach(() => {
    registerMock.mockReset();
    registerMock.mockResolvedValue({});
    clearSession();
  });

  afterEach(() => {
    clearSession();
  });

  function renderPage() {
    const router = createMemoryRouter(
      [
        { path: "/register", element: <RegisterPage /> },
        { path: "/login", element: <div>LoginRoute</div> },
      ],
      { initialEntries: ["/register"] },
    );
    render(<RouterProvider router={router} />);
    return router;
  }

  it("shows password policy error without calling API when password is weak", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText("Full name"), "Test User");
    await user.type(screen.getByPlaceholderText("Email"), "t@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "weak");
    await user.type(screen.getByPlaceholderText("Confirm password"), "weak");
    await user.click(screen.getByRole("button", { name: /Create account/i }));

    expect(registerMock).not.toHaveBeenCalled();
    expect(screen.getByText(/8 characters/i)).toBeInTheDocument();
  });

  it("rejects mismatched passwords before API call", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText("Full name"), "Test User");
    await user.type(screen.getByPlaceholderText("Email"), "t@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "Aa1!aaaa");
    await user.type(screen.getByPlaceholderText("Confirm password"), "Aa1!aaab");
    await user.click(screen.getByRole("button", { name: /Create account/i }));

    expect(registerMock).not.toHaveBeenCalled();
    expect(screen.getByText(/do not match/i)).toBeInTheDocument();
  });

  it("calls register and navigates to login with success flag on valid input", async () => {
    const user = userEvent.setup();
    const router = renderPage();
    await user.type(screen.getByPlaceholderText("Full name"), "Test User");
    await user.type(screen.getByPlaceholderText("Email"), "t@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "Aa1!aaaa");
    await user.type(screen.getByPlaceholderText("Confirm password"), "Aa1!aaaa");
    await user.click(screen.getByRole("button", { name: /Create account/i }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith({
        full_name: "Test User",
        email: "t@example.com",
        password: "Aa1!aaaa",
      });
    });
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/login");
      expect(router.state.location.search).toBe("?registered=1");
    });
  });
});
