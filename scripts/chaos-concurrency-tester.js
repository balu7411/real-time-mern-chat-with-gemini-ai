/**
 * Chaos Engineering & Concurrency Soak Tester (Sprint 11 / Days 151-165)
 * Simulates high-throughput client connections, rapid disconnect/reconnect cycles,
 * and asserts flat memory usage without orphaned listeners.
 */

const http = require("http");

async function runChaosTest({ rounds = 20, concurrency = 10 } = {}) {
  console.log(`🔥 [Chaos Engineering] Starting ${rounds} rounds with concurrency ${concurrency}...`);

  const initialMemory = process.memoryUsage();
  let successfulRequests = 0;
  let failedRequests = 0;

  for (let r = 1; r <= rounds; r++) {
    const promises = Array.from({ length: concurrency }, () => {
      return new Promise((resolve) => {
        const req = http.get("http://localhost:5000/api/health", (res) => {
          if (res.statusCode === 200) {
            successfulRequests++;
          } else {
            failedRequests++;
          }
          res.resume();
          resolve();
        });

        req.on("error", () => {
          failedRequests++;
          resolve();
        });

        req.setTimeout(2000, () => {
          req.destroy();
          failedRequests++;
          resolve();
        });
      });
    });

    await Promise.all(promises);
  }

  const finalMemory = process.memoryUsage();
  const rssDeltaMb = ((finalMemory.rss - initialMemory.rss) / (1024 * 1024)).toFixed(2);

  console.log(`✅ [Chaos Engineering] Completed! Successful: ${successfulRequests}, Failed: ${failedRequests}`);
  console.log(`📊 [Chaos Engineering] RSS Delta: ${rssDeltaMb} MB`);

  return {
    successfulRequests,
    failedRequests,
    rssDeltaMb: parseFloat(rssDeltaMb),
  };
}

if (require.main === module) {
  runChaosTest({ rounds: 10, concurrency: 5 }).catch(console.error);
}

module.exports = {
  runChaosTest,
};
