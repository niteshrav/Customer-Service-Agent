const test = require("node:test");
const assert = require("node:assert/strict");
const { resolvePersonaQuickReply } = require("../../src/chat/chatPersonaQuickReply.cjs");

test("resolvePersonaQuickReply answers demo chip questions without LLM", () => {
  const appFor = resolvePersonaQuickReply({ question: "What is this app for?", pathname: "/", role: "guest" });
  assert.match(appFor, /Customer Service Agent/i);
  assert.match(appFor, /RAG/i);

  const policy = resolvePersonaQuickReply({ question: "What is the password policy?", pathname: "/login", role: "guest" });
  assert.match(policy, /8 characters/i);

  const dash = resolvePersonaQuickReply({
    question: "What does the dashboard show?",
    pathname: "/dashboard",
    role: "agent",
  });
  assert.match(dash, /bucket/i);

  assert.equal(resolvePersonaQuickReply({ question: "Who won the world cup?", pathname: "/", role: "guest" }), null);
});
