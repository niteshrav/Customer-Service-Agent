import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSession, setSession } from "../lib/auth";

import LoginPage from "./LoginPage";
import DashboardPage from "./DashboardPage";

const listMock = vi.fn();
const metricsMock = vi.fn();
const createInquiryMock = vi.fn();
const approveInquiryMock = vi.fn();

function defaultMetrics(overrides = {}) {
  const { inquiries: inqOver, ...rest } = overrides;
  return {
    scope: "agent_bucket",
    inquiries: {
      total: 0,
      open: 0,
      resolved: 0,
      open_unassigned: 0,
      awaiting_customer_approval: 0,
      ...inqOver,
    },
    ...rest,
  };
}

vi.mock("../api/client", () => ({
  InquiryApi: {
    list: (...args) => listMock(...args),
    metrics: (...args) => metricsMock(...args),
    createInquiry: (...args) => createInquiryMock(...args),
    approveInquiry: (...args) => approveInquiryMock(...args),
  },
}));

describe("DashboardPage (TDD)", () => {
  function renderDashboard(initialEntry = "/dashboard") {
    const router = createMemoryRouter(
      [
        { path: "/dashboard", element: <DashboardPage /> },
        // Not used directly; just ensures RouterProvider has a consistent tree.
        { path: "/login", element: <LoginPage /> },
      ],
      { initialEntries: [initialEntry] },
    );
    render(<RouterProvider router={router} />);
    return router;
  }

  afterEach(() => {
    clearSession();
    listMock.mockReset();
    metricsMock.mockReset();
    createInquiryMock.mockReset();
    approveInquiryMock.mockReset();
  });

  it("does not show API connectivity status text", async () => {
    clearSession();
    listMock.mockResolvedValue({ inquiries: [] });
    metricsMock.mockResolvedValue(defaultMetrics());
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    });

    // Previously UI showed "API Connected". That must be hidden now.
    expect(screen.queryByText(/API Connected/i)).toBeNull();
    expect(screen.queryByText(/API Issue/i)).toBeNull();
    expect(screen.queryByText(/API Unavailable/i)).toBeNull();
    expect(screen.queryByText(/Status:/i)).toBeNull();
    expect(metricsMock).toHaveBeenCalled();
  });

  it("renders inquiries table and metrics when API returns rows", async () => {
    listMock.mockResolvedValue({
      inquiries: [
        {
          id: "uuid-1",
          inquiry_id: "INQ-1",
          customer_id: "CUST-1",
          status: "open",
          accessible: true,
          issue_identified: true,
          issue_addressed: false,
          received: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "uuid-2",
          inquiry_id: "INQ-2",
          customer_id: "CUST-2",
          status: "resolved",
          accessible: true,
          issue_identified: true,
          issue_addressed: true,
          received: true,
          created_at: new Date().toISOString(),
        },
      ],
    });
    metricsMock.mockResolvedValue(
      defaultMetrics({
        inquiries: {
          total: 2,
          open: 1,
          resolved: 1,
          open_unassigned: 0,
          awaiting_customer_approval: 0,
        },
      }),
    );

    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.queryByText(/Loading inquiries/i)).toBeNull();
    });

    expect(screen.getByText("Awaiting customer approval")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // total
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(2); // open + resolved

    expect(screen.getByText("INQ-1")).toBeInTheDocument();
    expect(screen.getByText("CUST-1")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /View/i }).length).toBeGreaterThanOrEqual(2);

    // Refresh button must be removed.
    expect(screen.queryByRole("button", { name: /Refresh/i })).toBeNull();
  });

  it("customer shows Approve for addressed open inquiries and calls approve API", async () => {
    setSession("tok-1", { role: "customer" });
    metricsMock
      .mockResolvedValueOnce(
        defaultMetrics({
          scope: "customer",
          inquiries: {
            total: 1,
            open: 1,
            resolved: 0,
            open_unassigned: 0,
            awaiting_customer_approval: 1,
          },
        }),
      )
      .mockResolvedValue(
        defaultMetrics({
          scope: "customer",
          inquiries: {
            total: 1,
            open: 0,
            resolved: 1,
            open_unassigned: 0,
            awaiting_customer_approval: 0,
          },
        }),
      );
    listMock
      .mockResolvedValueOnce({
        inquiries: [
          {
            id: "uuid-1",
            inquiry_id: "INQ-1",
            customer_id: "CUST-1",
            status: "open",
            accessible: true,
            issue_identified: true,
            issue_addressed: true,
            customer_approved: false,
            received: true,
            created_at: new Date().toISOString(),
          },
        ],
      })
      .mockResolvedValueOnce({
        inquiries: [
          {
            id: "uuid-1",
            inquiry_id: "INQ-1",
            customer_id: "CUST-1",
            status: "resolved",
            accessible: true,
            issue_identified: true,
            issue_addressed: true,
            customer_approved: true,
            received: true,
            created_at: new Date().toISOString(),
          },
        ],
      });
    approveInquiryMock.mockResolvedValue({});

    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => expect(screen.getByText("INQ-1")).toBeInTheDocument());
    const approveBtn = screen.getByRole("button", { name: /Approve/i });
    await user.click(approveBtn);

    expect(approveInquiryMock).toHaveBeenCalledWith("INQ-1");
  });

  it("customer submit new query calls createInquiry API", async () => {
    setSession("tok-2", { role: "customer" });
    listMock.mockResolvedValue({ inquiries: [] });
    metricsMock.mockResolvedValue(defaultMetrics({ scope: "customer" }));
    createInquiryMock.mockResolvedValue({});

    const user = userEvent.setup();
    renderDashboard();
    await waitFor(() => expect(screen.getByText(/No inquiries available/i)).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText(/Describe your issue/i), "Need help");
    await user.click(screen.getByRole("button", { name: /Submit/i }));

    expect(createInquiryMock).toHaveBeenCalledWith("Need help");
  });

  it("lead dashboard shows Open (unassigned) when metrics scope is organization", async () => {
    setSession("tok-lead", { role: "lead" });
    listMock.mockResolvedValue({ inquiries: [] });
    metricsMock.mockResolvedValue(
      defaultMetrics({
        scope: "organization",
        inquiries: {
          total: 5,
          open: 2,
          resolved: 3,
          open_unassigned: 1,
          awaiting_customer_approval: 0,
        },
      }),
    );
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText("Open (unassigned)")).toBeInTheDocument();
    });
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});

