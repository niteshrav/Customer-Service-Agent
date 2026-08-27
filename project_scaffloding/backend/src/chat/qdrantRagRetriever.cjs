/**
 * Module: Qdrant-backed RAG retrieval
 *
 * Same contract as createPgRagRetriever: { embedQuery, search({ queryVector, role, limit, corpusVersion }) }.
 * Search uses Qdrant vector search with payload filters for corpus_version and visible_roles.
 */

/**
 * @param {string} role
 * @param {string} corpusVersion
 */
function buildQdrantRoleCorpusFilter(role, corpusVersion) {
  return {
    must: [
      { key: "corpus_version", match: { value: corpusVersion } },
      { key: "visible_roles", match: { any: [role] } },
    ],
  };
}

/**
 * @param {object} opts
 * @param {{ search: (name: string, args: object) => Promise<Array<{ id?: unknown, score?: number, payload?: object }>> }} opts.client
 * @param {string} opts.collectionName
 * @param {(text: string) => Promise<number[]>} opts.embedQuery
 * @param {string} [opts.corpusVersion]
 */
function createQdrantRagRetriever({
  client,
  collectionName,
  embedQuery,
  corpusVersion = "v1",
  minScore = 0.28,
} = {}) {
  if (!client || typeof client.search !== "function") throw new Error("client.search is required");
  if (!collectionName) throw new Error("collectionName is required");
  if (!embedQuery) throw new Error("embedQuery is required");

  async function search({
    queryVector,
    role,
    limit = 5,
    corpusVersion: cv = corpusVersion,
    minScore: floor = minScore,
  } = {}) {
    const qv = queryVector;
    if (!Array.isArray(qv) || qv.length === 0) return [];

    const filter = buildQdrantRoleCorpusFilter(role, cv);
    const fetchLimit = Math.max(1, Math.min(20, Number(limit) * 3 || 5));
    const hits = await client.search(collectionName, {
      vector: qv,
      limit: fetchLimit,
      filter,
      with_payload: true,
      with_vector: false,
    });

    const mapped = (hits || []).map((h) => {
      const p = h.payload || {};
      return {
        chunkId: h.id,
        sourceId: p.source_id || "unknown",
        title: p.title || p.source_id || "unknown",
        sectionLabel: p.section_label || "",
        body: p.body || "",
        score: typeof h.score === "number" ? h.score : 0,
      };
    });

    const filtered = mapped.filter((h) => typeof floor !== "number" || h.score >= floor);
    const best = new Map();
    for (const hit of filtered) {
      const key = String(hit.sourceId || hit.chunkId || "");
      const prev = best.get(key);
      if (!prev || hit.score > prev.score) best.set(key, hit);
    }
    return Array.from(best.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, limit));
  }

  return {
    embedQuery,
    search,
  };
}

module.exports = { createQdrantRagRetriever, buildQdrantRoleCorpusFilter };
