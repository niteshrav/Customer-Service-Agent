/**
 * Module: OpenAI embeddings factory
 *
 * createOpenAiEmbeddings / createOpenAiEmbedQuery supply text-embedding-3-small vectors for RAG query encoding and corpus ingest.
 */
const { OpenAIEmbeddings } = require("@langchain/openai");

function resolveApiKey() {
  return process.env.OPENAI_API_KEY || process.env.LANGCHAIN_API_KEY || process.env["Langchain API Key"];
}

/**
 * Shared OpenAI embeddings client (query + batch for ingestion).
 */
function createOpenAiEmbeddings({ model = "text-embedding-3-small" } = {}) {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }
  const embeddings = new OpenAIEmbeddings({ apiKey, model });
  return {
    embedQuery: (text) => embeddings.embedQuery(String(text || "")),
    embedDocuments: (texts) => embeddings.embedDocuments(texts.map((t) => String(t || ""))),
  };
}

/**
 * Factory for query embedding (RAG). Reuses one client instance.
 */
function createOpenAiEmbedQuery(opts = {}) {
  const { embedQuery } = createOpenAiEmbeddings(opts);
  return embedQuery;
}

module.exports = { createOpenAiEmbeddings, createOpenAiEmbedQuery };
