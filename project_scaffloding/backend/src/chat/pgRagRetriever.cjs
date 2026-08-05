/**
 * Module: Postgres-backed RAG retrieval
 *
 * createPgRagRetriever({ pool, embedQuery }): embeds the user question, loads candidate chunks from rag_document_chunks,
 * filters by visible_roles, ranks by cosine similarity vs stored embedding JSON.
 */
const { cosineSimilarity } = require("./cosineSimilarity.cjs");

function parseEmbedding(raw) {
  if (Array.isArray(raw)) return raw.map((n) => Number(n));
  if (raw && typeof raw === "object") return Object.values(raw).map((n) => Number(n));
  return [];
}

/**
 * @param {object} opts
 * @param {import("pg").Pool} opts.pool
 * @param {(text: string) => Promise<number[]>} opts.embedQuery
 */
function createPgRagRetriever({ pool, embedQuery }) {
  if (!pool) throw new Error("pool is required");
  if (!embedQuery) throw new Error("embedQuery is required");

  async function search({ queryVector, role, limit = 5, corpusVersion = "v1" }) {
    const qv = queryVector;
    if (!Array.isArray(qv) || qv.length === 0) return [];

    const { rows } = await pool.query(
      `SELECT id, source_id, title, section_label, body, embedding, visible_roles
       FROM rag_document_chunks
       WHERE corpus_version = $1`,
      [corpusVersion]
    );

    const scored = [];
    for (const row of rows) {
      const roles = row.visible_roles;
      if (!Array.isArray(roles) || !roles.includes(role)) continue;
      const emb = parseEmbedding(row.embedding);
      if (emb.length !== qv.length) continue;
      const score = cosineSimilarity(qv, emb);
      scored.push({
        chunkId: row.id,
        sourceId: row.source_id,
        title: row.title || row.source_id,
        sectionLabel: row.section_label || "",
        body: row.body,
        score,
      });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, Math.max(1, limit));
  }

  return {
    embedQuery,
    search,
  };
}

module.exports = { createPgRagRetriever, parseEmbedding };
