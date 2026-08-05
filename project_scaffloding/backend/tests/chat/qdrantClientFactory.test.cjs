const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeQdrantUrl } = require("../../src/chat/qdrantClientFactory.cjs");

test("normalizeQdrantUrl adds explicit 443 for https URLs without port", () => {
  const u = normalizeQdrantUrl("https://example.cloud.qdrant.io");
  assert.match(u, /:443/);
  assert.ok(u.startsWith("https://"));
});

test("normalizeQdrantUrl preserves explicit port", () => {
  const u = normalizeQdrantUrl("https://h.example:6333");
  assert.ok(u.includes(":6333"));
});
