const test = require("node:test");
const assert = require("node:assert/strict");
const { compressHistoryRows } = require("../../src/chat/chatHistoryCompress.cjs");

test("compressHistoryRows returns input when under maxMessages", () => {
  const rows = [
    { role: "user", content: "a" },
    { role: "assistant", content: "b" },
  ];
  assert.deepEqual(compressHistoryRows(rows, { maxMessages: 8 }), rows);
});

test("compressHistoryRows collapses head and preserves tail", () => {
  const rows = [];
  for (let i = 0; i < 10; i++) {
    rows.push({ role: "user", content: `u${i}` });
    rows.push({ role: "assistant", content: `a${i}` });
  }
  const out = compressHistoryRows(rows, { maxMessages: 5, maxPriorSummaryChars: 500 });
  assert.equal(out.length, 5);
  assert.ok(out[0].content.includes("[Earlier in this conversation]"));
  assert.ok(out[0].content.includes("u0"));
  assert.equal(out[out.length - 1].content, "a9");
});
