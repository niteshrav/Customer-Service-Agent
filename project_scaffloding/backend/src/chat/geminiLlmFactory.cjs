/**
 * Module: Gemini chat model factory
 *
 * createGeminiLlm builds LangChain ChatGoogleGenerativeAI using GEMINI_API_KEY / GOOGLE_API_KEY.
 */
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");

function readMaxCompletionTokensFromEnv() {
  const v = process.env.CHAT_MAX_COMPLETION_TOKENS;
  if (v === undefined || v === "") return 400;
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) && n > 0 ? n : 400;
}

function readGeminiApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    ""
  );
}

function createGeminiLlm({ model = "gemini-flash-latest", maxCompletionTokens } = {}) {
  const apiKey = readGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  const maxTokens = maxCompletionTokens ?? readMaxCompletionTokensFromEnv();
  const modelName =
    (process.env.GEMINI_CHAT_MODEL && String(process.env.GEMINI_CHAT_MODEL).trim()) || model;

  return new ChatGoogleGenerativeAI({
    apiKey,
    model: modelName,
    temperature: 0.2,
    maxOutputTokens: maxTokens,
  });
}

module.exports = { createGeminiLlm, readGeminiApiKey, readMaxCompletionTokensFromEnv };
