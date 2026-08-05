const test = require("node:test");
const assert = require("node:assert/strict");
const { cosineSimilarity } = require("../../src/chat/cosineSimilarity.cjs");

test("cosineSimilarity: identical vectors = 1", () => {
  assert.equal(cosineSimilarity([1, 0, 0], [1, 0, 0]), 1);
});

test("cosineSimilarity: orthogonal = 0", () => {
  assert.equal(cosineSimilarity([1, 0, 0], [0, 1, 0]), 0);
});

test("cosineSimilarity: length mismatch = 0", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0, 0]), 0);
});
