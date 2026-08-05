/**
 * Module: OpenAI chat model factory
 *
 * createOpenAiLlm builds a LangChain ChatOpenAI instance (default gpt-4o-mini) using OPENAI_API_KEY and optional CHAT_MAX_COMPLETION_TOKENS.
 */
const { ChatOpenAI } = require("@langchain/openai");

function readMaxCompletionTokensFromEnv() {
  const v = process.env.CHAT_MAX_COMPLETION_TOKENS;
  if (v === undefined || v === "") return 400;
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) && n > 0 ? n : 400;
}

function createOpenAiLlm({ model = "gpt-4o-mini", maxCompletionTokens } = {}) {
  // Prefer OPENAI_API_KEY, but keep a fallback for earlier/incorrect env key naming.
  const apiKey =
    process.env.OPENAI_API_KEY ||
    process.env.LANGCHAIN_API_KEY ||
    process.env["Langchain API Key"];
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const maxTokens = maxCompletionTokens ?? readMaxCompletionTokensFromEnv();

  return new ChatOpenAI({
    apiKey,
    model,
    temperature: 0.2,
    maxTokens,
  });
}

module.exports = { createOpenAiLlm, readMaxCompletionTokensFromEnv };

