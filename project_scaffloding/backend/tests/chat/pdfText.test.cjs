const test = require("node:test");
const assert = require("node:assert/strict");
const { extractPdfText } = require("../../src/chat/pdfText.cjs");

test("extractPdfText uses injected parser (TDD seam)", async () => {
  const fakeParse = async () => ({ text: "  Hello   PDF  \nworld  " });
  const out = await extractPdfText(Buffer.from("%PDF-fake"), { pdfParse: fakeParse });
  assert.equal(out, "Hello PDF world");
});

test("extractPdfText returns empty for empty buffer", async () => {
  const out = await extractPdfText(Buffer.alloc(0), { pdfParse: async () => ({ text: "x" }) });
  assert.equal(out, "");
});
