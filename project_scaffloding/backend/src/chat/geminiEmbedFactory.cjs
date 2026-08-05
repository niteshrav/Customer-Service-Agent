/**
 * Module: Gemini embeddings factory for RAG
 *
 * Uses GoogleGenerativeAIEmbeddings (default text-embedding-004) when GEMINI_API_KEY is set.
 */
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { readGeminiApiKey } = require("./geminiLlmFactory.cjs");

function createGeminiEmbeddings({ model = "gemini-embedding-001" } = {}) {
  const apiKey = readGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }
  const modelName =
    (process.env.GEMINI_EMBED_MODEL && String(process.env.GEMINI_EMBED_MODEL).trim()) || model;
  const embeddings = new GoogleGenerativeAIEmbeddings({ apiKey, model: modelName });
  return {
    embedQuery: (text) => embeddings.embedQuery(String(text || "")),
    embedDocuments: (texts) => embeddings.embedDocuments(texts.map((t) => String(t || ""))),
  };
}

function createGeminiEmbedQuery(opts = {}) {
  const { embedQuery } = createGeminiEmbeddings(opts);
  return embedQuery;
}

module.exports = { createGeminiEmbeddings, createGeminiEmbedQuery };
