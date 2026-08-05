/**
 * Module: Qdrant REST client from environment
 *
 * normalizeQdrantUrl adds explicit :443/:80 when missing so @qdrant/js-client-rest does not fall back to port 6333 on https/http URLs.
 * createQdrantClientFromEnv reads QDRANT_URL and QDRANT_API_KEY (never commit real keys).
 */
const { QdrantClient } = require("@qdrant/js-client-rest");

function normalizeQdrantUrl(url) {
  const u = String(url || "").trim();
  if (!u) return u;
  try {
    const parsed = new URL(u);
    const port =
      parsed.port || (parsed.protocol === "https:" ? "443" : parsed.protocol === "http:" ? "80" : "");
    if (!port) return u.replace(/\/$/, "");
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    const out = `${parsed.protocol}//${parsed.hostname}:${port}${path}${parsed.search}`;
    return out.replace(/\/$/, "");
  } catch {
    return u;
  }
}

function createQdrantClientFromEnv() {
  const rawUrl = process.env.QDRANT_URL && String(process.env.QDRANT_URL).trim();
  const apiKey = process.env.QDRANT_API_KEY && String(process.env.QDRANT_API_KEY).trim();
  if (!rawUrl || !apiKey) {
    throw new Error("QDRANT_URL and QDRANT_API_KEY must be set to use Qdrant RAG.");
  }
  const url = normalizeQdrantUrl(rawUrl);
  return new QdrantClient({ url, apiKey });
}

module.exports = { createQdrantClientFromEnv, normalizeQdrantUrl };
