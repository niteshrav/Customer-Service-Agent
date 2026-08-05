const test = require("node:test");
const assert = require("node:assert/strict");

test("resolveChatProvider prefers gemini when key set", () => {
  const prevProvider = process.env.CHAT_LLM_PROVIDER;
  const prevGemini = process.env.GEMINI_API_KEY;
  const prevOpenAi = process.env.OPENAI_API_KEY;
  try {
    process.env.CHAT_LLM_PROVIDER = "";
    process.env.GEMINI_API_KEY = "test-key";
    delete process.env.OPENAI_API_KEY;
    // Fresh require after env change — use isolated path via cache bust
    delete require.cache[require.resolve("../../src/chat/llmProvider.cjs")];
    delete require.cache[require.resolve("../../src/chat/geminiLlmFactory.cjs")];
    const { resolveChatProvider, defaultChatModelName } = require("../../src/chat/llmProvider.cjs");
    assert.equal(resolveChatProvider(), "gemini");
    assert.match(defaultChatModelName("gemini"), /gemini/);
  } finally {
    if (prevProvider === undefined) delete process.env.CHAT_LLM_PROVIDER;
    else process.env.CHAT_LLM_PROVIDER = prevProvider;
    if (prevGemini === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prevGemini;
    if (prevOpenAi === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prevOpenAi;
    delete require.cache[require.resolve("../../src/chat/llmProvider.cjs")];
    delete require.cache[require.resolve("../../src/chat/geminiLlmFactory.cjs")];
  }
});
