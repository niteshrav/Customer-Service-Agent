import { describe, expect, it } from "vitest";
import { answerFor } from "./chatbotAnswers";

describe("answerFor", () => {
  it("blocks protected-topic questions when not authenticated", () => {
    expect(answerFor("How do I see inquiries?", "/login", false)).toContain("Please login first");
  });

  it("explains password policy when asked", () => {
    const r = answerFor("What is a strong password?", "/", false);
    expect(r).toContain("8 characters");
    expect(r).toContain("special");
  });

  it("describes current page when asked", () => {
    expect(answerFor("Where am I?", "/register", false)).toContain("/register");
  });

  it("gives authed guidance on dashboard topics when logged in", () => {
    expect(answerFor("anything else", "/dashboard", true)).toContain("Inquiry Detail");
  });
});
