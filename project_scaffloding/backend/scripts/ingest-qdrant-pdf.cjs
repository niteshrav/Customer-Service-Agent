#!/usr/bin/env node
/**
 * Module: Ingest PDF Q&A corpus into Qdrant (npm run rag:ingest:qdrant)
 *
 * Requires OPENAI_API_KEY, QDRANT_URL, QDRANT_API_KEY. Optional QDRANT_PDF_PATH, QDRANT_COLLECTION, RAG_CORPUS_VERSION, QDRANT_VECTOR_SIZE.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

require(path.join(__dirname, "..", "env.cjs")).loadBackendEnv();

const { chunkText } = require("../src/chat/simpleChunker.cjs");
const { createOpenAiEmbeddings } = require("../src/chat/openaiEmbedFactory.cjs");
const { extractPdfText } = require("../src/chat/pdfText.cjs");
const { createQdrantClientFromEnv } = require("../src/chat/qdrantClientFactory.cjs");
const { ensureQdrantRagCollection, deletePointsByCorpusVersion } = require("../src/chat/qdrantCollection.cjs");

const DEFAULT_PDF = path.join(__dirname, "..", "..", "customer_service_agent_questions_answers.pdf");
const CORPUS_VERSION = process.env.RAG_CORPUS_VERSION || "v1";
const COLLECTION = (process.env.QDRANT_COLLECTION && String(process.env.QDRANT_COLLECTION).trim()) || "csa_rag";

function defaultVisibleRoles() {
  return ["guest", "customer", "agent", "lead", "admin"];
}

function parseVectorSize() {
  const v = process.env.QDRANT_VECTOR_SIZE;
  if (v === undefined || v === "") return 1536;
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) && n > 0 ? n : 1536;
}

async function main() {
  const pdfPath = (process.env.QDRANT_PDF_PATH && String(process.env.QDRANT_PDF_PATH).trim()) || DEFAULT_PDF;
  if (!fs.existsSync(pdfPath)) {
    console.error("PDF not found:", pdfPath);
    process.exit(1);
  }

  const client = createQdrantClientFromEnv();
  const embeddings = createOpenAiEmbeddings();
  const vectorSize = parseVectorSize();

  const buf = fs.readFileSync(pdfPath);
  const text = await extractPdfText(buf);
  if (!text) {
    console.error("No text extracted from PDF:", pdfPath);
    process.exit(1);
  }

  const chunks = chunkText(text, { maxChars: 900, overlap: 120 });
  if (!chunks.length) {
    console.error("Chunking produced no segments.");
    process.exit(1);
  }

  const probe = await embeddings.embedQuery(chunks[0]);
  if (!Array.isArray(probe) || probe.length === 0) {
    console.error("Embedding probe failed.");
    process.exit(1);
  }
  const dim = probe.length;
  if (dim !== vectorSize) {
    console.warn("[qdrant-ingest] QDRANT_VECTOR_SIZE was", vectorSize, "but embeddings are", dim, "- using", dim);
  }

  await ensureQdrantRagCollection(client, COLLECTION, dim);
  await deletePointsByCorpusVersion(client, COLLECTION, CORPUS_VERSION);

  const vectors = await embeddings.embedDocuments(chunks);
  const sourceId =
    (process.env.QDRANT_SOURCE_ID && String(process.env.QDRANT_SOURCE_ID).trim()) ||
    "customer_service_agent_questions_answers";
  const title = (process.env.QDRANT_SOURCE_TITLE && String(process.env.QDRANT_SOURCE_TITLE).trim()) || sourceId;
  const visibleRoles = defaultVisibleRoles();

  const batchSize = 32;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const slice = chunks.slice(i, i + batchSize);
    const vslice = vectors.slice(i, i + batchSize);
    const points = slice.map((body, j) => {
      const idx = i + j;
      const id = crypto.randomUUID();
      return {
        id,
        vector: vslice[j],
        payload: {
          source_id: sourceId,
          title,
          section_label: `${title} §${idx + 1}`,
          body,
          corpus_version: CORPUS_VERSION,
          visible_roles: visibleRoles,
        },
      };
    });
    await client.upsert(COLLECTION, { wait: true, points });
  }

  console.log("Qdrant ingest done:", {
    collection: COLLECTION,
    corpus_version: CORPUS_VERSION,
    chunks: chunks.length,
    pdf: pdfPath,
    vector_dim: dim,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
