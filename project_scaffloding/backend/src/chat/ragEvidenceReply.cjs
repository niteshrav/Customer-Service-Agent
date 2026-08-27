/**
 * Module: RAG evidence fallback — demo-safe answers when LLM is degraded but retrieval succeeded.
 */

function cleanExcerpt(text, maxLen = 280) {
  const flat = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (flat.length <= maxLen) return flat;
  return `${flat.slice(0, maxLen).trim()}…`;
}

/**
 * Build a concise answer from retrieved chunks (no LLM required).
 * @param {object[]} chunks — rag retriever hits with title, body, sectionLabel
 * @returns {string|null}
 */
function buildRagEvidenceReply(chunks) {
  if (!Array.isArray(chunks) || chunks.length === 0) return null;
  const top = chunks[0];
  const title = top.title || top.sourceId || "knowledge base";
  const excerpt = cleanExcerpt(top.body);
  if (!excerpt) return null;

  let reply = `From **${title}**: ${excerpt}`;
  if (chunks.length > 1) {
    const also = chunks
      .slice(1, 3)
      .map((c) => c.title || c.sourceId)
      .filter(Boolean);
    if (also.length) {
      reply += ` Related: ${also.join(", ")}.`;
    }
  }
  reply += " See Sources below for the full passages.";
  return reply.replace(/\*\*/g, "");
}

function isLlmDegradedResponse(aiMsg, fallbackMessage) {
  const meta = aiMsg?.response_metadata;
  if (meta?.llm_degraded || meta?.circuit_open) return true;
  const content = String(aiMsg?.content ?? "").trim();
  const fallback = String(fallbackMessage ?? "").trim();
  return fallback.length > 0 && content === fallback;
}

function isFallbackReply(reply, llmFallbackMessage) {
  const text = String(reply || "").trim();
  const fallback = String(llmFallbackMessage || "").trim();
  if (fallback && text === fallback) return true;
  return /temporarily unavailable/i.test(text);
}

module.exports = { buildRagEvidenceReply, cleanExcerpt, isLlmDegradedResponse, isFallbackReply };
