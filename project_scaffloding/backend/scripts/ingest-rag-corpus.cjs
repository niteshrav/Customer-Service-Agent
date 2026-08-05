#!/usr/bin/env node
/**
 * Module: RAG corpus ingest CLI (npm run rag:ingest)
 *
 * Reads rag/corpus/*.md, optional <!-- rag-meta: {...} --> for visible_roles, chunks text, embeds via OpenAI, upserts rag_document_chunks for RAG_CORPUS_VERSION.
 */
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

require(path.join(__dirname, "..", "env.cjs")).loadBackendEnv();

const { chunkText } = require("../src/chat/simpleChunker.cjs");
const { createDefaultEmbeddings, resolveChatProvider } = require("../src/chat/llmProvider.cjs");

const CORPUS_DIR = path.join(__dirname, "..", "rag", "corpus");
const CORPUS_VERSION = process.env.RAG_CORPUS_VERSION || "v1";

function parseLeadingMeta(raw) {
  const m = raw.match(/^<!--\s*rag-meta:\s*(\{[\s\S]*?\})\s*-->\s*/);
  if (!m) return { body: raw, meta: {} };
  try {
    const meta = JSON.parse(m[1]);
    return { body: raw.slice(m[0].length), meta };
  } catch {
    return { body: raw, meta: {} };
  }
}

function defaultVisibleRoles() {
  return ["guest", "customer", "agent", "lead", "admin"];
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const files = fs.readdirSync(CORPUS_DIR).filter((f) => f.endsWith(".md"));
  if (!files.length) {
    console.error("No .md files in", CORPUS_DIR);
    process.exit(1);
  }

  const embeddings = createDefaultEmbeddings();
  console.log(`[rag:ingest] provider=${resolveChatProvider()}`);
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query("DELETE FROM rag_document_chunks WHERE corpus_version = $1", [CORPUS_VERSION]);

    for (const file of files) {
      const full = path.join(CORPUS_DIR, file);
      const raw = fs.readFileSync(full, "utf8");
      const { body, meta } = parseLeadingMeta(raw);
      const sourceId = meta.source_id || file.replace(/\.md$/i, "");
      const title = meta.title || sourceId;
      const visibleRoles = Array.isArray(meta.visible_roles) && meta.visible_roles.length ? meta.visible_roles : defaultVisibleRoles();

      const chunks = chunkText(body, { maxChars: 900, overlap: 120 });
      if (!chunks.length) continue;

      const vectors = await embeddings.embedDocuments(chunks);

      for (let i = 0; i < chunks.length; i += 1) {
        const sectionLabel = `${title} §${i + 1}`;
        await pool.query(
          `INSERT INTO rag_document_chunks
           (source_id, title, section_label, body, embedding, corpus_version, visible_roles)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
          [sourceId, title, sectionLabel, chunks[i], JSON.stringify(vectors[i]), CORPUS_VERSION, visibleRoles]
        );
      }
      console.log("Ingested", file, "→", chunks.length, "chunks");
    }

    console.log("Done. corpus_version =", CORPUS_VERSION);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
