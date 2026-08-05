import { describe, expect, it } from "vitest";
import { formatChatError } from "./chatErrorMessage";

describe("formatChatError", () => {
  it("replaces Failed to fetch with actionable text", () => {
    expect(formatChatError(new Error("Failed to fetch"))).toMatch(/backend is running/i);
  });

  it("handles OPENAI key messages", () => {
    expect(formatChatError(new Error("OPENAI_API_KEY is not set."))).toMatch(/OPENAI_API_KEY/i);
  });
});
