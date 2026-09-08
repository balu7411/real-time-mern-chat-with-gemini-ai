# 🛡️ Production Runbook & Disaster Recovery Blueprint
## Enterprise Real-Time Collaborative IDE with Multi-Model AI

---

## 1. System Topology Overview

- **Stateless Gateway Pods:** 3 to 20 horizontally scaled REST API pods (`mern-api-gateway`).
- **Real-Time Clustered Sockets:** 4 to 16 stateless Socket.IO nodes connected via `@socket.io/redis-adapter` (`mern-socket-cluster`).
- **Distributed State & Cache:** Redis 7 StatefulSet (`mern-redis-cluster`) with AOF persistence.
- **Asynchronous AI Workers:** Dedicated BullMQ workers (`mern-ai-workers`) scaling on queue backlog.
- **Data Persistence:** MongoDB Enterprise Replica Set with read-preference configured for `secondaryPreferred`.

---

## 2. Emergency Operational Runbooks

### 2.1. Redis Cluster Node Failure
**Symptom:** Client socket disconnections or queue submission timeouts.
1. Inspect Redis StatefulSet pods:
   ```bash
   kubectl get pods -n production -l app=mern-redis
   ```
2. Check Redis logs for replication or memory OOM issues:
   ```bash
   kubectl logs -n production statefulset/mern-redis-cluster
   ```
3. If pod crashed, Kubernetes automatically restarts it with AOF volume intact.
4. Verify Socket nodes reconnected via Redis adapter.

### 2.2. AI Vendor Outage (e.g. Gemini 503 / 429)
**Symptom:** High queue latency or increased API response times.
1. The **`MultiModelAIRouter`** automatically activates the fallback chain (`Gemini -> Claude -> OpenAI -> Ollama -> Mock`).
2. Verify fallback execution in logs:
   ```bash
   kubectl logs -n production -l app=mern-ai-workers --tail=200 | grep -i fallback
   ```
3. If upstream quota is completely exhausted, the **`CircuitBreaker`** trips to `OPEN` state, returning immediate 429 status without tying up node threads.

### 2.3. Memory Leak Prevention & Profiling
1. Check Prometheus metrics endpoint:
   ```bash
   curl -s http://<api-pod>:5000/metrics | grep node_memory
   ```
2. Trigger memory diagnostic profiler:
   ```bash
   npm run profile:memory
   ```
3. If RSS memory exceeds 1 GB limit, Kubernetes liveness probes restart the pod automatically with zero user disruption due to sticky sessions and multi-node redundancy.

---

## 3. Disaster Recovery & Backup Procedures

1. **Database Snapshot:** Automated Hourly MongoDB Cloud Manager backups with Point-In-Time recovery (PITR) up to 35 days.
2. **Redis State:** In the event of catastrophic Redis failure, user sessions are re-established via client JWT re-authentication without persistent data loss.
3. **Rollback Command:**
   ```bash
   kubectl rollout undo deployment/mern-api-gateway -n production
   kubectl rollout undo deployment/mern-socket-cluster -n production
   ```
