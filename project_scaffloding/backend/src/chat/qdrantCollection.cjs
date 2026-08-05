/**
 * Module: Qdrant collection lifecycle for RAG
 *
 * ensureQdrantRagCollection creates the collection with Cosine + vector size, or recreates if dimension mismatches.
 * Ensures keyword payload indexes (Qdrant Cloud requires them for filter deletes / filtered search).
 * deletePointsByCorpusVersion removes prior chunks before re-ingest.
 */

function isPayloadIndexAlreadyExistsError(err) {
  const s = JSON.stringify(err?.data ?? err?.message ?? err ?? "");
  return /already exists|duplicate/i.test(s);
}

/**
 * @param {import("@qdrant/js-client-rest").QdrantClient} client
 * @param {string} collectionName
 */
async function ensureQdrantPayloadIndexes(client, collectionName) {
  const fields = [
    { field_name: "corpus_version", field_schema: "keyword" },
    { field_name: "visible_roles", field_schema: "keyword" },
  ];
  for (const { field_name, field_schema } of fields) {
    try {
      await client.createPayloadIndex(collectionName, { field_name, field_schema, wait: true });
    } catch (e) {
      if (isPayloadIndexAlreadyExistsError(e)) continue;
      throw e;
    }
  }
}

/**
 * @param {import("@qdrant/js-client-rest").QdrantClient} client
 * @param {string} collectionName
 * @param {number} vectorSize
 */
async function ensureQdrantRagCollection(client, collectionName, vectorSize) {
  const size = Number(vectorSize);
  if (!Number.isFinite(size) || size < 8) throw new Error("vectorSize must be a positive number");

  const existsRes = await client.collectionExists(collectionName);
  const exists = Boolean(existsRes && existsRes.exists);

  if (!exists) {
    await client.createCollection(collectionName, {
      vectors: { size, distance: "Cosine" },
    });
    await ensureQdrantPayloadIndexes(client, collectionName);
    return;
  }

  const info = await client.getCollection(collectionName);
  const params = info?.config?.params?.vectors;
  const existingSize =
    params && typeof params === "object" && "size" in params ? Number(params.size) : null;

  if (existingSize != null && existingSize !== size) {
    await client.deleteCollection(collectionName);
    await client.createCollection(collectionName, {
      vectors: { size, distance: "Cosine" },
    });
  }
  await ensureQdrantPayloadIndexes(client, collectionName);
}

/**
 * @param {import("@qdrant/js-client-rest").QdrantClient} client
 * @param {string} collectionName
 * @param {string} corpusVersion
 */
async function deletePointsByCorpusVersion(client, collectionName, corpusVersion) {
  await client.delete(collectionName, {
    wait: true,
    filter: {
      must: [{ key: "corpus_version", match: { value: corpusVersion } }],
    },
  });
}

module.exports = { ensureQdrantRagCollection, ensureQdrantPayloadIndexes, deletePointsByCorpusVersion };
