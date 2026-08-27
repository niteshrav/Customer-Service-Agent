const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createQdrantRagRetriever,
  buildQdrantRoleCorpusFilter,
} = require("../../src/chat/qdrantRagRetriever.cjs");

test("buildQdrantRoleCorpusFilter encodes role and corpus version", () => {
  const f = buildQdrantRoleCorpusFilter("agent", "v1");
  assert.equal(f.must.length, 2);
  assert.deepEqual(f.must[0], { key: "corpus_version", match: { value: "v1" } });
  assert.deepEqual(f.must[1], { key: "visible_roles", match: { any: ["agent"] } });
});

test("createQdrantRagRetriever search maps Qdrant hits to pgRagRetriever-shaped chunks", async () => {
  const captured = { args: null };
  const mockClient = {
    async search(collectionName, args) {
      captured.collectionName = collectionName;
      captured.args = args;
      return [
        {
          id: "p1",
          score: 0.91,
          payload: {
            source_id: "qa-pdf",
            title: "Q&A",
            section_label: "Q&A §1",
            body: "chunk body",
          },
        },
      ];
    },
  };
  const embedQuery = async () => [0.1, 0.2];
  const retriever = createQdrantRagRetriever({
    client: mockClient,
    collectionName: "csa_rag",
    corpusVersion: "v1",
    embedQuery,
  });

  const qv = [1, 2, 3];
  const rows = await retriever.search({ queryVector: qv, role: "customer", limit: 3 });

  assert.equal(captured.collectionName, "csa_rag");
  assert.deepEqual(captured.args.vector, qv);
  assert.ok(captured.args.limit >= 3);
  assert.ok(captured.args.filter);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].sourceId, "qa-pdf");
  assert.equal(rows[0].title, "Q&A");
  assert.equal(rows[0].sectionLabel, "Q&A §1");
  assert.equal(rows[0].body, "chunk body");
  assert.equal(rows[0].score, 0.91);
  assert.equal(rows[0].chunkId, "p1");
});

test("createQdrantRagRetriever embedQuery delegates", async () => {
  let called = false;
  const embedQuery = async (q) => {
    called = true;
    return [9];
  };
  const retriever = createQdrantRagRetriever({
    client: { async search() { return []; } },
    collectionName: "x",
    corpusVersion: "v1",
    embedQuery,
  });
  const v = await retriever.embedQuery("hi");
  assert.ok(called);
  assert.deepEqual(v, [9]);
});
