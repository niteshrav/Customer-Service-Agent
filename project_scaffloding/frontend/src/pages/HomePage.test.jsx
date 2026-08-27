import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import HomePage from "./HomePage";

describe("HomePage (TDD)", () => {
  function renderHome() {
    return render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
  }

  it("shows professional hero and AI demo features (no 'How it works' section)", () => {
    renderHome();

    expect(screen.getByRole("heading", { name: /Customer Service Agent/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Login to demo/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Register new account/i })).toBeInTheDocument();
    expect(screen.getByText(/Demo1!csa/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Enter as/i }).length).toBe(3);

    expect(screen.getByText(/LLM Assistant/i)).toBeInTheDocument();
    expect(screen.getByText(/RAG with Citations/i)).toBeInTheDocument();
    expect(screen.getByText(/Role Dashboards/i)).toBeInTheDocument();
    expect(screen.getByText(/CRM \+ Workflow/i)).toBeInTheDocument();
    expect(screen.getByText(/Try each demo role/i)).toBeInTheDocument();
    expect(screen.getByText(/End-to-end resolution flow/i)).toBeInTheDocument();
  });
});
