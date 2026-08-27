import { describe, expect, it } from "vitest";
import { getDashboardTheme, roleNavLabel } from "./dashboardTheme";

describe("dashboardTheme", () => {
  it("returns distinct themes per role", () => {
    const customer = getDashboardTheme("customer");
    const agent = getDashboardTheme("agent");
    const mgmt = getDashboardTheme("lead");

    expect(customer.headline).toMatch(/Customer dashboard/i);
    expect(agent.headline).toMatch(/Agent dashboard/i);
    expect(mgmt.headline).toMatch(/Management dashboard/i);
    expect(customer.heroClass).toBe("dash-hero--customer");
    expect(agent.heroClass).toBe("dash-hero--agent");
    expect(mgmt.heroClass).toBe("dash-hero--management");
  });

  it("maps nav labels for header pill", () => {
    expect(roleNavLabel("customer")).toBe("Customer");
    expect(roleNavLabel("agent")).toBe("Agent");
    expect(roleNavLabel("lead")).toBe("Management");
  });
});
