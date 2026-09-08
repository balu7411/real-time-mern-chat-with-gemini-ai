/**
 * Distributed Cache-Aside Service
 * Enables sub-millisecond read access with event-driven cache invalidation.
 */

class CacheService {
  constructor(redisClient = null) {
    this.redisClient = redisClient;
    this.localCache = new Map(); // Fallback in-memory LRU-like store
  }

  async get(key) {
    if (this.redisClient && this.redisClient.isOpen) {
      const val = await this.redisClient.get(key);
      return val ? JSON.parse(val) : null;
    }
    const item = this.localCache.get(key);
    if (item && item.expiresAt > Date.now()) {
      return item.value;
    }
    if (item) this.localCache.delete(key);
    return null;
  }

  async set(key, value, ttlSeconds = 300) {
    if (this.redisClient && this.redisClient.isOpen) {
      await this.redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
      return;
    }
    this.localCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key) {
    if (this.redisClient && this.redisClient.isOpen) {
      await this.redisClient.del(key);
      return;
    }
    this.localCache.delete(key);
  }

  // Cache-Aside helper: wraps an expensive fetcher function with caching
  async wrap(key, fetcher, ttlSeconds = 300) {
    const cached = await this.get(key);
    if (cached !== null) {
      return { data: cached, source: "cache" };
    }
    const freshData = await fetcher();
    if (freshData !== null && freshData !== undefined) {
      await this.set(key, freshData, ttlSeconds);
    }
    return { data: freshData, source: "database" };
  }

  // Optimistic Concurrency Control (OCC) conflict check
  validateVersion(currentVersion, expectedVersion) {
    if (expectedVersion !== undefined && expectedVersion !== null) {
      if (currentVersion !== expectedVersion) {
        const error = new Error(`OCC Conflict: Version mismatch! Expected ${expectedVersion}, but document is at version ${currentVersion}`);
        error.name = "VersionConflictError";
        error.statusCode = 409;
        throw error;
      }
    }
    return true;
  }
}

const defaultCacheService = new CacheService();

module.exports = {
  CacheService,
  defaultCacheService,
};
