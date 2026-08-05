const test = require("node:test");
const assert = require("node:assert/strict");
const { ensureQdrantRagCollection, deletePointsByCorpusVersion } = require("../../src/chat/qdrantCollection.cjs");

test("ensureQdrantRagCollection creates collection when missing", async () => {
  const calls = [];
  const client = {
    async collectionExists() {
      return { exists: false };
    },
    async createCollection(name, cfg) {
      calls.push(["create", name, cfg]);
    },
    async createPayloadIndex(name, cfg) {
      calls.push(["index", name, cfg.field_name]);
    },
    async getCollection() {
      throw new Error("should not get");
    },
    async deleteCollection() {
      throw new Error("should not delete");
    },
  };
  await ensureQdrantRagCollection(client, "col", 1536);
  assert.ok(calls.some((c) => c[0] === "create"));
  assert.ok(calls.some((c) => c[0] === "index" && c[2] === "corpus_version"));
  assert.ok(calls.some((c) => c[0] === "index" && c[2] === "visible_roles"));
});

test("ensureQdrantRagCollection no-op when dimension already matches", async () => {
  const calls = [];
  const client = {
    async collectionExists() {
      return { exists: true };
    },
    async getCollection() {
      return { config: { params: { vectors: { size: 1536, distance: "Cosine" } } } };
    },
    async createPayloadIndex(name, cfg) {
      calls.push(["index", cfg.field_name]);
    },
    async deleteCollection() {
      calls.push("delete");
    },
    async createCollection() {
      calls.push("create");
    },
  };
  await ensureQdrantRagCollection(client, "col", 1536);
  assert.deepEqual(calls, [
    ["index", "corpus_version"],
    ["index", "visible_roles"],
  ]);
});

test("ensureQdrantRagCollection recreates when vector size mismatches", async () => {
  const calls = [];
  const client = {
    async collectionExists() {
      return { exists: true };
    },
    async getCollection() {
      return { config: { params: { vectors: { size: 512, distance: "Cosine" } } } };
    },
    async deleteCollection(name) {
      calls.push(["del", name]);
    },
    async createCollection(name, cfg) {
      calls.push(["create", name, cfg]);
    },
    async createPayloadIndex(name, cfg) {
      calls.push(["index", cfg.field_name]);
    },
  };
  await ensureQdrantRagCollection(client, "col", 1536);
  assert.ok(calls.some((c) => c[0] === "del"));
  assert.ok(calls.some((c) => c[0] === "create" && c[2].vectors.size === 1536));
  assert.ok(calls.filter((c) => c[0] === "index").length >= 2);
});

test("deletePointsByCorpusVersion forwards filter delete", async () => {
  let seen = null;
  const client = {
    async delete(name, args) {
      seen = { name, args };
    },
  };
  await deletePointsByCorpusVersion(client, "c", "v9");
  assert.equal(seen.name, "c");
  assert.equal(seen.args.wait, true);
  assert.deepEqual(seen.args.filter.must[0], { key: "corpus_version", match: { value: "v9" } });
});
