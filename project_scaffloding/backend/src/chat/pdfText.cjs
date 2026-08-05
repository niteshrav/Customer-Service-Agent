/**
 * Module: PDF text extraction for RAG ingest
 *
 * extractPdfText(buffer, { pdfParse }) reads binary PDF and returns normalized plain text (whitespace collapsed).
 * The pdfParse injectable default is pdf-parse for production; tests pass a stub.
 */
const defaultPdfParse = require("pdf-parse");

/**
 * @param {Buffer} buffer
 * @param {{ pdfParse?: (b: Buffer) => Promise<{ text?: string }> }} [deps]
 */
async function extractPdfText(buffer, { pdfParse = defaultPdfParse } = {}) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return "";
  const data = await pdfParse(buffer);
  const raw = String(data?.text || "");
  return raw
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = { extractPdfText };
