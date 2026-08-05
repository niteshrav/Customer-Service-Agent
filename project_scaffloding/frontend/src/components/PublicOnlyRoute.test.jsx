import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { clearSession, setSession } from "../lib/auth";
import PublicOnlyRoute from "./PublicOnlyRoute";

function PublicChild() {
  return <div>PublicChild</div>;
}

function DashboardStub() {
  return <div>DashboardStub</div>;
}

function harness() {
  return (
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<PublicChild />} />
        </Route>
        <Route path="/dashboard" element={<DashboardStub />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("PublicOnlyRoute", () => {
  afterEach(() => {
    clearSession();
  });

  it("renders outlet when not authenticated", () => {
    render(harness());
    expect(screen.getByText("PublicChild")).toBeInTheDocument();
    expect(screen.queryByText("DashboardStub")).not.toBeInTheDocument();
  });

  it("redirects authenticated users to dashboard", () => {
    setSession("t", { email: "a@b.com" });
    render(harness());
    expect(screen.queryByText("PublicChild")).not.toBeInTheDocument();
    expect(screen.getByText("DashboardStub")).toBeInTheDocument();
  });
});
