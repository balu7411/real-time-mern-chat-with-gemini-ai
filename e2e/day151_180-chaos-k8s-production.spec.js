import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

test.describe("Day 151-180: Chaos Testing, Telemetry & Kubernetes Production Deployment", () => {
  test("1. Prometheus /metrics endpoint exports real-time memory and socket metrics", async ({ request }) => {
    const response = await request.get("http://localhost:5000/metrics");
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain("node_memory_rss_bytes");
    expect(body).toContain("node_memory_heap_used_bytes");
    expect(body).toContain("mern_socket_cluster_healthy 1");
  });

  test("2. Chaos concurrency soak test executes multi-request burst with flat memory delta", async () => {
    const { runChaosTest } = await import("../scripts/chaos-concurrency-tester.js");
    const result = await runChaosTest({ rounds: 5, concurrency: 4 });

    expect(result.successfulRequests).toBe(20);
    expect(result.failedRequests).toBe(0);
    expect(result.rssDeltaMb).toBeLessThan(50); // Bounded memory growth under soak
  });

  test("3. Production Kubernetes manifests and disaster recovery runbook exist", async () => {
    const k8sDir = path.resolve(process.cwd(), "k8s");
    expect(fs.existsSync(path.join(k8sDir, "api-gateway-deployment.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(k8sDir, "socket-cluster-deployment.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(k8sDir, "redis-cluster-statefulset.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(k8sDir, "ai-worker-deployment.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(k8sDir, "ingress-nginx.yaml"))).toBe(true);

    const docsPath = path.resolve(process.cwd(), "docs/PRODUCTION_RUNBOOK_AND_DISASTER_RECOVERY.md");
    expect(fs.existsSync(docsPath)).toBe(true);
  });
});
