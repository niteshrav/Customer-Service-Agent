/**
 * Module: Async cache adapters (memory + Redis)
 *
 * toAsyncTtlCache bridges sync TtlCache to async get/set; createRedisJsonCache stores JSON in Redis with TTL.
 * connectRedisOptional used by buildChatBundle when REDIS_URL is set.
 */
const { TtlCache } = require("./ttlCache.cjs");

/**
 * @param {import("./ttlCache.cjs").TtlCache} ttl
 * @returns {{ get: (k: string) => Promise<unknown>, set: (k: string, v: unknown) => Promise<void> }}
 */
function toAsyncTtlCache(ttl) {
  if (!ttl) throw new Error("ttl cache is required");
  return {
    async get(k) {
      return ttl.get(k);
    },
    async set(k, v) {
      ttl.set(k, v);
    },
  };
}

/**
 * Redis JSON value cache (GET/SET with PX). Requires connected client.
 * @param {import("redis").RedisClientType} client
 * @param {string} keyPrefix
 * @param {number} defaultTtlMs
 */
function createRedisJsonCache(client, keyPrefix, defaultTtlMs) {
  if (!client) throw new Error("redis client is required");
  const prefix = keyPrefix || "csa:";
  const ttl = Number(defaultTtlMs) > 0 ? Number(defaultTtlMs) : 60_000;

  return {
    async get(key) {
      const raw = await client.get(prefix + key);
      if (raw == null) return undefined;
      try {
        return JSON.parse(raw);
      } catch {
        return undefined;
      }
    },
    async set(key, val) {
      await client.set(prefix + key, JSON.stringify(val), { PX: ttl });
    },
  };
}

/**
 * Connect Redis or return null (caller falls back to in-memory).
 * @param {string} url
 * @returns {Promise<import("redis").RedisClientType | null>}
 */
async function connectRedisOptional(url) {
  if (!url || !String(url).trim()) return null;
  try {
    const { createClient } = require("redis");
    const client = createClient({ url: String(url).trim() });
    client.on("error", () => {});
    await client.connect();
    return client;
  } catch (e) {
    console.warn("[chat] Redis connection failed; using in-memory caches:", e?.message || e);
    return null;
  }
}

module.exports = { toAsyncTtlCache, createRedisJsonCache, connectRedisOptional, TtlCache };
