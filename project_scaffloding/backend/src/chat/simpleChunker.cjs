/**
 * Module: RAG corpus text chunking
 *
 * chunkText splits markdown/plain text into overlapping character windows for ingest (rag:ingest script).
 */
function chunkText(text, { maxChars = 800, overlap = 100 } = {}) {
  const t = String(text ?? "").trim();
  if (!t) return [];

  const chunks = [];
  let i = 0;
  while (i < t.length) {
    const end = Math.min(i + maxChars, t.length);
    const piece = t.slice(i, end).trim();
    if (piece) chunks.push(piece);
    if (end >= t.length) break;
    const next = end - overlap;
    i = next > i ? next : end;
  }
  return chunks;
}

module.exports = { chunkText };
