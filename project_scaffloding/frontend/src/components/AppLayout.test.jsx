import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import AppLayout from "./AppLayout";

describe("AppLayout (TDD)", () => {
  it("renders a global footer: company rights on left and legal links on right", () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    );

    const footer = screen.getByRole("contentinfo");
    expect(footer).toBeInTheDocument();

    expect(screen.getByText(/© \d{4} Customer Service Agent\. All rights reserved\./i)).toBeInTheDocument();

    const termsLink = screen.getByRole("link", { name: /Terms of Service/i });
    expect(termsLink).toHaveAttribute("href", "/terms");
    const privacyLink = screen.getByRole("link", { name: /Privacy Policy/i });
    expect(privacyLink).toHaveAttribute("href", "/privacy");
    const cookieLink = screen.getByRole("link", { name: /Cookie Policy/i });
    expect(cookieLink).toHaveAttribute("href", "/cookies");
  });
});

