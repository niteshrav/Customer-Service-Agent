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

  it("shows professional hero and features (no 'How it works' section)", () => {
    renderHome();

    expect(screen.getByRole("heading", { name: /Customer Service Agent/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Login$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Register$/i })).toBeInTheDocument();

    // Feature cards
    expect(screen.getByText(/Inquiry Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/CRM Context Retrieval/i)).toBeInTheDocument();
    expect(screen.getByText(/Guided Response Workflow/i)).toBeInTheDocument();
    expect(screen.getByText(/Secure Access/i)).toBeInTheDocument();
    expect(screen.queryByText(/How it works/i)).toBeNull();
  });
});

