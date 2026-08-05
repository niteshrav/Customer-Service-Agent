const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const { createChatService } = require("../../src/chat/createChatService.cjs");

const golden = JSON.parse(fs.readFileSync(path.join(__dirname, "../fixtures/chat-golden.json"), "utf8"));

test.describe("Chat golden scenarios (Sprint 4 quality gate)", () => {
  for (const row of golden) {
    test(row.name, async () => {
      const llmMock = {
        invoke: async () => ({
          content: row.mockAssistantContent || "SHOULD_NOT_USE_LLM",
        }),
      };
      const svc = createChatService({ llm: llmMock, promptVersion: "golden-test" });
      const out = await svc.chat({
        question: row.question,
        pathname: row.pathname || "/",
        role: row.role || "guest",
        mode: row.mode || "llm",
      });
      assert.ok(
        out.reply.includes(row.expectReplyContains),
        `expected reply to contain "${row.expectReplyContains}", got: ${out.reply.slice(0, 200)}`
      );
    });
  }
});
