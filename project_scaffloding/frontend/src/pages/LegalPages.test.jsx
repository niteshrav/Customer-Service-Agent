import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import TermsOfServicePage from "./TermsOfServicePage";
import PrivacyPolicyPage from "./PrivacyPolicyPage";
import CookiePolicyPage from "./CookiePolicyPage";

describe("Legal pages (TDD)", () => {
  function renderPage(node) {
    return render(<MemoryRouter>{node}</MemoryRouter>);
  }

  it("renders Terms of Service page", () => {
    renderPage(<TermsOfServicePage />);
    expect(screen.getByRole("heading", { name: /Terms of Service/i })).toBeInTheDocument();
  });

  it("renders Privacy Policy page", () => {
    renderPage(<PrivacyPolicyPage />);
    expect(screen.getByRole("heading", { name: /Privacy Policy/i })).toBeInTheDocument();
  });

  it("renders Cookie Policy page", () => {
    renderPage(<CookiePolicyPage />);
    expect(screen.getByRole("heading", { name: /Cookie Policy/i })).toBeInTheDocument();
  });
});

