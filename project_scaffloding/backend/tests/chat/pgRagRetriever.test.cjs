const test = require("node:test");
const assert = require("node:assert/strict");
const { createPgRagRetriever } = require("../../src/chat/pgRagRetriever.cjs");
const { createTestPool, truncateAll } = require("../api/test-pool.cjs");

test.describe("pgRagRetriever (TDD)", () => {
  const pool = createTestPool();

  test.beforeEach(async () => {
    const client = await pool.connect();
    try {
      await truncateAll(client);
    } finally {
      client.release();
    }
  });

  test.after(async () => {
    await pool.end();
  });

  test("search returns highest-similarity chunk for role", async () => {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO rag_document_chunks
         (source_id, title, section_label, body, embedding, corpus_version, visible_roles)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
        [
          "doc-a",
          "Doc A",
          "s1",
          "alpha",
          JSON.stringify([1, 0, 0]),
          "v1",
          ["guest", "customer"],
        ]
      );
      await client.query(
        `INSERT INTO rag_document_chunks
         (source_id, title, section_label, body, embedding, corpus_version, visible_roles)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
        [
          "doc-b",
          "Doc B",
          "s1",
          "beta",
          JSON.stringify([0, 1, 0]),
          "v1",
          ["guest", "customer"],
        ]
      );
    } finally {
      client.release();
    }

    const retriever = createPgRagRetriever({
      pool,
      embedQuery: async () => [0.99, 0.01, 0],
    });

    const hits = await retriever.search({ queryVector: [1, 0, 0], role: "guest", limit: 1 });
    assert.equal(hits.length, 1);
    assert.equal(hits[0].sourceId, "doc-a");
    assert.ok(hits[0].body.includes("alpha"));
  });

  test("search excludes chunks not visible to role", async () => {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO rag_document_chunks
         (source_id, title, section_label, body, embedding, corpus_version, visible_roles)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
        [
          "internal",
          "Internal",
          "s1",
          "secret agent text",
          JSON.stringify([1, 0, 0]),
          "v1",
          ["agent", "lead", "admin"],
        ]
      );
    } finally {
      client.release();
    }

    const retriever = createPgRagRetriever({
      pool,
      embedQuery: async () => [1, 0, 0],
    });

    const hits = await retriever.search({ queryVector: [1, 0, 0], role: "customer", limit: 5 });
    assert.equal(hits.length, 0);
  });
});
