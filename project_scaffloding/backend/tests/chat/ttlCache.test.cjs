const test = require("node:test");
const assert = require("node:assert/strict");
const { TtlCache } = require("../../src/chat/ttlCache.cjs");

test("TtlCache get returns undefined for missing key", () => {
  const c = new TtlCache({ defaultTtlMs: 60_000, maxEntries: 10 });
  assert.equal(c.get("a"), undefined);
});

test("TtlCache set and get round-trip", () => {
  const c = new TtlCache({ defaultTtlMs: 60_000, maxEntries: 10 });
  c.set("k", { x: 1 });
  assert.deepEqual(c.get("k"), { x: 1 });
});

test("TtlCache evicts oldest when maxEntries exceeded", () => {
  const c = new TtlCache({ defaultTtlMs: 60_000, maxEntries: 2 });
  c.set("a", 1);
  c.set("b", 2);
  c.set("c", 3);
  assert.equal(c.get("a"), undefined);
  assert.equal(c.get("b"), 2);
  assert.equal(c.get("c"), 3);
});
