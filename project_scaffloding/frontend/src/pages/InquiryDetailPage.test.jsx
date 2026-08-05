import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { clearSession, setSession } from "../lib/auth";
import InquiryDetailPage from "./InquiryDetailPage";

const detailMock = vi.fn();
const crmMock = vi.fn();
const approveInquiryMock = vi.fn();

vi.mock("../api/client", () => ({
  InquiryApi: {
    detail: (...args) => detailMock(...args),
    crm: (...args) => crmMock(...args),
    approveInquiry: (...args) => approveInquiryMock(...args),
  },
}));

describe("InquiryDetailPage (TDD)", () => {
  afterEach(() => {
    clearSession();
    detailMock.mockReset();
    crmMock.mockReset();
    approveInquiryMock.mockReset();
  });

  it("customer sees Approve resolution and does not see the send-response composer", async () => {
    setSession("tok-1", { role: "customer" });

    detailMock.mockResolvedValue({
      inquiry: {
        inquiry_id: "INQ-1",
        customer_id: "CUST-1",
        status: "open",
        accessible: true,
        issue_identified: true,
        issue_addressed: true,
        customer_approved: false,
      },
      messages: [],
    });
    crmMock.mockResolvedValue({
      customer: { name: "Ava", email: "ava@example.com", account_status: "active" },
    });
    approveInquiryMock.mockResolvedValue({});

    const router = createMemoryRouter(
      [{ path: "/inquiries/:inquiryId", element: <InquiryDetailPage /> }],
      { initialEntries: ["/inquiries/INQ-1"] },
    );
    render(<RouterProvider router={router} />);

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("button", { name: /Approve resolution/i })).toBeInTheDocument());

    expect(screen.queryByPlaceholderText(/Write response/i)).toBeNull();

    await user.click(screen.getByRole("button", { name: /Approve resolution/i }));
    expect(approveInquiryMock).toHaveBeenCalledWith("INQ-1");
  });
});

