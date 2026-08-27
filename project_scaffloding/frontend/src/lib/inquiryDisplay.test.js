import { describe, expect, it } from "vitest";
import { getInquiryDisplayStatus } from "./inquiryDisplay";

describe("getInquiryDisplayStatus", () => {
  it("maps resolved", () => {
    expect(getInquiryDisplayStatus({ status: "resolved" }).key).toBe("resolved");
  });

  it("maps awaiting approval", () => {
    expect(
      getInquiryDisplayStatus({
        status: "open",
        issue_addressed: true,
        customer_approved: false,
      }).label,
    ).toMatch(/awaiting approval/i);
  });

  it("maps open", () => {
    expect(getInquiryDisplayStatus({ status: "open", accessible: true }).key).toBe("open");
  });
});
