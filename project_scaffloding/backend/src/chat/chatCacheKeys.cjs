/**
 * Module: Chat cache key helpers
 *
 * normalizeQuestion for stable string keys; hashEmbedding for embedding-vector fingerprints; buildResponseCacheKey for full response cache entries.
 */
const crypto = require("crypto");

function normalizeQuestion(q) {
  return String(q ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function hashEmbedding(vec) {
  return crypto.createHash("sha256").update(JSON.stringify(vec)).digest("hex");
}

/**
 * Stable key for LLM response cache (mode + role + page + question + prior history).
 */
function buildResponseCacheKey({ mode, role, pathname, question, historyMessages }) {
  const hist = (historyMessages || []).map((m) => `${m.role}:${m.content}`).join("\n");
  return crypto
    .createHash("sha256")
    .update(`${mode}|${role}|${pathname}|${normalizeQuestion(question)}|${hist}`)
    .digest("hex");
}

module.exports = { normalizeQuestion, hashEmbedding, buildResponseCacheKey };
