/**
 * Distributed User Presence Service
 * Replaces in-memory userSocketMap with Redis Sets and TTL heartbeats.
 * Zero shared process memory.
 */

class PresenceService {
  constructor(redisClient = null) {
    this.redisClient = redisClient;
    this.fallbackStore = new Map(); // Only used if Redis is not configured in local testing
  }

  async setUserOnline(userId, socketId) {
    if (this.redisClient && this.redisClient.isOpen) {
      await this.redisClient.sAdd(`presence:user:${userId}`, socketId);
      await this.redisClient.expire(`presence:user:${userId}`, 120); // 2 min TTL heartbeat
      await this.redisClient.sAdd("presence:online_users", userId);
    } else {
      if (!this.fallbackStore.has(userId)) {
        this.fallbackStore.set(userId, new Set());
      }
      this.fallbackStore.get(userId).add(socketId);
    }
  }

  async setUserOffline(userId, socketId) {
    if (this.redisClient && this.redisClient.isOpen) {
      await this.redisClient.sRem(`presence:user:${userId}`, socketId);
      const remaining = await this.redisClient.sCard(`presence:user:${userId}`);
      if (remaining === 0) {
        await this.redisClient.sRem("presence:online_users", userId);
        await this.redisClient.del(`presence:user:${userId}`);
      }
    } else {
      const set = this.fallbackStore.get(userId);
      if (set) {
        set.delete(socketId);
        if (set.size === 0) {
          this.fallbackStore.delete(userId);
        }
      }
    }
  }

  async isUserOnline(userId) {
    if (this.redisClient && this.redisClient.isOpen) {
      return await this.redisClient.sIsMember("presence:online_users", userId);
    }
    const set = this.fallbackStore.get(userId);
    return set ? set.size > 0 : false;
  }

  async getOnlineUsers() {
    if (this.redisClient && this.redisClient.isOpen) {
      return await this.redisClient.sMembers("presence:online_users");
    }
    return Array.from(this.fallbackStore.keys());
  }

  cleanup() {
    this.fallbackStore.clear();
  }
}

const defaultPresenceService = new PresenceService();

module.exports = {
  PresenceService,
  defaultPresenceService,
};
