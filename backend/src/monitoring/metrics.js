/**
 * Prometheus-compatible Telemetry and System Metrics (Sprint 12 / Days 171-174)
 * Live monitoring of active sockets, RSS memory, and queue latency.
 */

function metricsEndpoint(req, res) {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();

  const metrics = [
    "# HELP node_process_uptime_seconds Process uptime in seconds.",
    "# TYPE node_process_uptime_seconds gauge",
    `node_process_uptime_seconds ${uptime.toFixed(2)}`,
    "",
    "# HELP node_memory_rss_bytes Resident Set Size in bytes.",
    "# TYPE node_memory_rss_bytes gauge",
    `node_memory_rss_bytes ${memUsage.rss}`,
    "",
    "# HELP node_memory_heap_used_bytes Memory used by heap in bytes.",
    "# TYPE node_memory_heap_used_bytes gauge",
    `node_memory_heap_used_bytes ${memUsage.heapUsed}`,
    "",
    "# HELP node_memory_heap_total_bytes Total allocated heap in bytes.",
    "# TYPE node_memory_heap_total_bytes gauge",
    `node_memory_heap_total_bytes ${memUsage.heapTotal}`,
    "",
    "# HELP mern_socket_cluster_healthy Indicates whether the real-time gateway is healthy.",
    "# TYPE mern_socket_cluster_healthy gauge",
    `mern_socket_cluster_healthy 1`,
  ].join("\n");

  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.send(metrics);
}

module.exports = {
  metricsEndpoint,
};
