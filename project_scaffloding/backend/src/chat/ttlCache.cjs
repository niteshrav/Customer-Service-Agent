/**
 * Module: In-memory TTL cache
 *
 * TtlCache: get/set with per-key or default TTL, maxEntries with FIFO eviction. Used for chat response and RAG sub-caches before Redis.
 */
class TtlCache {
  constructor({ defaultTtlMs = 60_000, maxEntries = 500 } = {}) {
    /** @type {Map<string, { val: unknown, exp: number }>} */
    this.map = new Map();
    this.defaultTtlMs = defaultTtlMs;
    this.maxEntries = maxEntries;
  }

  get(key) {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (Date.now() > e.exp) {
      this.map.delete(key);
      return undefined;
    }
    return e.val;
  }

  set(key, val, ttlMs) {
    if (this.map.size >= this.maxEntries) {
      const first = this.map.keys().next().value;
      if (first !== undefined) this.map.delete(first);
    }
    const ttl = ttlMs ?? this.defaultTtlMs;
    this.map.set(key, { val, exp: Date.now() + ttl });
  }

  clear() {
    this.map.clear();
  }

  size() {
    return this.map.size;
  }
}

module.exports = { TtlCache };
