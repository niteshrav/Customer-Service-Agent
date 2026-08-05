/**
 * Module: RAG retriever cache wrapper
 *
 * Decorates embedQuery and search with TTL caches keyed by normalized question / embedding hash and corpus version.
 * Reduces repeated OpenAI embedding calls and duplicate DB similarity work.
 */
const { normalizeQuestion, hashEmbedding } = require("./chatCacheKeys.cjs");

function wrapRagRetrieverWithCache(base, { embedCache, retrievalCache, corpusVersion = "v1", telemetry = null } = {}) {
  if (!base) throw new Error("base retriever is required");
  if (!embedCache || !retrievalCache) throw new Error("embedCache and retrievalCache are required");

  return {
    async embedQuery(text) {
      const ek = `emb:${corpusVersion}:${normalizeQuestion(text)}`;
      const hit = await Promise.resolve(embedCache.get(ek));
      if (hit !== undefined) {
        if (telemetry) telemetry.recordEmbedCacheHit();
        return hit;
      }
      if (telemetry) telemetry.recordEmbedCacheMiss();
      const v = await base.embedQuery(text);
      await Promise.resolve(embedCache.set(ek, v));
      return v;
    },

    async search(args) {
      const cv = args.corpusVersion ?? corpusVersion;
      const rk = `ret:${cv}:${args.role}:${args.limit}:${hashEmbedding(args.queryVector)}`;
      const hit = await Promise.resolve(retrievalCache.get(rk));
      if (hit !== undefined) {
        if (telemetry) telemetry.recordRetrievalCacheHit();
        return hit;
      }
      if (telemetry) telemetry.recordRetrievalCacheMiss();
      const res = await base.search({ ...args, corpusVersion: cv });
      await Promise.resolve(retrievalCache.set(rk, res));
      return res;
    },
  };
}

module.exports = { wrapRagRetrieverWithCache };
