const test = require("node:test");
const assert = require("node:assert/strict");
const { TtlCache } = require("../../src/chat/ttlCache.cjs");
const { wrapRagRetrieverWithCache } = require("../../src/chat/ragRetrieverCache.cjs");
const { createChatTelemetry } = require("../../src/chat/chatTelemetry.cjs");

test("wrapRagRetrieverWithCache dedupes embedQuery and search", async () => {
  let embedCalls = 0;
  let searchCalls = 0;
  const base = {
    embedQuery: async (q) => {
      embedCalls += 1;
      return [q.length, 0];
    },
    search: async ({ queryVector }) => {
      searchCalls += 1;
      return [{ sourceId: "s1", score: 1, body: "x", title: "t", sectionLabel: "" }];
    },
  };
  const embedCache = new TtlCache({ defaultTtlMs: 60_000, maxEntries: 50 });
  const retrievalCache = new TtlCache({ defaultTtlMs: 60_000, maxEntries: 50 });
  const telemetry = createChatTelemetry();
  const wrapped = wrapRagRetrieverWithCache(base, { embedCache, retrievalCache, telemetry });

  const v1 = await wrapped.embedQuery("hello");
  const v2 = await wrapped.embedQuery("hello");
  assert.deepEqual(v1, v2);
  assert.equal(embedCalls, 1);

  await wrapped.search({ queryVector: v1, role: "guest", limit: 5 });
  await wrapped.search({ queryVector: v1, role: "guest", limit: 5 });
  assert.equal(searchCalls, 1);

  const s = telemetry.snapshot();
  assert.equal(s.embed_cache_hits, 1);
  assert.equal(s.embed_cache_misses, 1);
  assert.equal(s.retrieval_cache_hits, 1);
  assert.equal(s.retrieval_cache_misses, 1);
});
