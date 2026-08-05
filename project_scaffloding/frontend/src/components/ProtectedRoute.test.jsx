import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { clearSession, setSession } from "../lib/auth";
import ProtectedRoute from "./ProtectedRoute";

function Secret() {
  return <div>ProtectedContent</div>;
}

function LoginStub() {
  return <div>LoginStub</div>;
}

function harness() {
  return (
    <MemoryRouter initialEntries={["/secret"]}>
      <Routes>
        <Route path="/login" element={<LoginStub />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/secret" element={<Secret />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  afterEach(() => {
    clearSession();
  });

  it("redirects unauthenticated users away from protected content", () => {
    render(harness());
    expect(screen.queryByText("ProtectedContent")).not.toBeInTheDocument();
    expect(screen.getByText("LoginStub")).toBeInTheDocument();
  });

  it("renders outlet when authenticated", () => {
    setSession("t", { email: "a@b.com" });
    render(harness());
    expect(screen.getByText("ProtectedContent")).toBeInTheDocument();
  });
});
