/**
 * Memory Profiling Baseline Diagnostic Utility
 * Captures Node.js process RSS, Heap Total, Heap Used, and External memory.
 */

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getMemoryReport() {
  const usage = process.memoryUsage();
  return {
    timestamp: new Date().toISOString(),
    rss: formatBytes(usage.rss),
    heapTotal: formatBytes(usage.heapTotal),
    heapUsed: formatBytes(usage.heapUsed),
    external: formatBytes(usage.external),
  };
}

console.log("=== Node.js Process Baseline Memory Report ===");
const report = getMemoryReport();
console.table(report);

module.exports = { getMemoryReport };
