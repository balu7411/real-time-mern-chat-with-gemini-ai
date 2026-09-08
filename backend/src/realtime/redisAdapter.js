/**
 * Redis Adapter for Socket.IO Horizontal Clustering
 * Facilitates cross-node broadcasting across N stateless pods.
 */

let redisClient = null;

function initRedisAdapter(io) {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    // In local dev without standalone Redis, use in-memory adapter gracefully
    console.log("ℹ️ [Realtime Gateway] Standalone REDIS_URL not specified; running local high-throughput adapter.");
    return { isDistributed: false };
  }

  try {
    const { createAdapter } = require("@socket.io/redis-adapter");
    const { createClient } = require("redis");

    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();

    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      console.log("✅ [Realtime Gateway] Socket.IO connected to Redis 7 Pub/Sub Cluster!");
    });

    redisClient = pubClient;
    return { isDistributed: true, pubClient, subClient };
  } catch (err) {
    console.warn("⚠️ [Realtime Gateway] Redis adapter initialization warning:", err.message);
    return { isDistributed: false };
  }
}

function getRedisClient() {
  return redisClient;
}

module.exports = {
  initRedisAdapter,
  getRedisClient,
};
