const test = require("node:test");
const assert = require("node:assert/strict");
const { chunkText } = require("../../src/chat/simpleChunker.cjs");

test("chunkText: empty -> []", () => {
  assert.deepEqual(chunkText(""), []);
});

test("chunkText: short text -> single chunk", () => {
  const out = chunkText("hello world", { maxChars: 100 });
  assert.equal(out.length, 1);
  assert.equal(out[0], "hello world");
});

test("chunkText: splits long text", () => {
  const s = "a".repeat(250);
  const out = chunkText(s, { maxChars: 100, overlap: 10 });
  assert.ok(out.length >= 2);
});
