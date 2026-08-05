/**
 * Module: Chat LLM / embed provider selection
 *
 * CHAT_LLM_PROVIDER=gemini|openai (default: gemini when GEMINI_API_KEY set, else openai).
 */
const { createOpenAiLlm } = require("./openaiLlmFactory.cjs");
const { createOpenAiEmbedQuery, createOpenAiEmbeddings } = require("./openaiEmbedFactory.cjs");
const { createGeminiLlm, readGeminiApiKey } = require("./geminiLlmFactory.cjs");
const { createGeminiEmbedQuery, createGeminiEmbeddings } = require("./geminiEmbedFactory.cjs");

function resolveChatProvider() {
  const explicit = String(process.env.CHAT_LLM_PROVIDER || "")
    .trim()
    .toLowerCase();
  if (explicit === "gemini" || explicit === "google") return "gemini";
  if (explicit === "openai") return "openai";
  if (readGeminiApiKey()) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "openai";
}

function defaultChatModelName(provider) {
  if (provider === "gemini") {
    return (process.env.GEMINI_CHAT_MODEL && String(process.env.GEMINI_CHAT_MODEL).trim()) || "gemini-flash-latest";
  }
  return "gpt-4o-mini";
}

function createDefaultLlm() {
  const provider = resolveChatProvider();
  if (provider === "gemini") {
    return createGeminiLlm({ model: defaultChatModelName("gemini") });
  }
  return createOpenAiLlm({ model: "gpt-4o-mini" });
}

function createDefaultEmbedQuery() {
  const provider = resolveChatProvider();
  if (provider === "gemini") return createGeminiEmbedQuery();
  return createOpenAiEmbedQuery();
}

function createDefaultEmbeddings() {
  const provider = resolveChatProvider();
  if (provider === "gemini") return createGeminiEmbeddings();
  return createOpenAiEmbeddings();
}

module.exports = {
  resolveChatProvider,
  defaultChatModelName,
  createDefaultLlm,
  createDefaultEmbedQuery,
  createDefaultEmbeddings,
};
