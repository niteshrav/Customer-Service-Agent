const test = require("node:test");
const assert = require("node:assert/strict");
const { TtlCache, toAsyncTtlCache, connectRedisOptional, createRedisJsonCache } = require("../../src/chat/chatAsyncCache.cjs");

test("toAsyncTtlCache wraps synchronous TTL store", async () => {
  const ttl = new TtlCache({ defaultTtlMs: 60_000, maxEntries: 10 });
  const a = toAsyncTtlCache(ttl);
  assert.equal(await a.get("x"), undefined);
  await a.set("x", { n: 1 });
  assert.deepEqual(await a.get("x"), { n: 1 });
});

test("Redis JSON cache round-trip when REDIS_URL is set", async (t) => {
  if (!process.env.REDIS_URL) {
    t.skip("REDIS_URL not set");
    return;
  }
  const client = await connectRedisOptional(process.env.REDIS_URL);
  assert.ok(client);
  const cache = createRedisJsonCache(client, "csa:test:async:", 5000);
  await cache.set("key1", { z: true });
  const v = await cache.get("key1");
  assert.deepEqual(v, { z: true });
  await client.del("csa:test:async:key1");
  await client.quit();
});
