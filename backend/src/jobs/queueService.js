/**
 * Distributed Queue Service (BullMQ-compatible Architecture)
 * Decouples AI generation and project builds from the main event loop.
 */

class CircuitBreaker {
  constructor({ failureThreshold = 5, cooldownPeriodMs = 30000 }) {
    this.failureThreshold = failureThreshold;
    this.cooldownPeriodMs = cooldownPeriodMs;
    this.failureCount = 0;
    this.state = "CLOSED"; // CLOSED, OPEN, HALF-OPEN
    this.lastFailureTime = null;
  }

  canExecute() {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.cooldownPeriodMs) {
        this.state = "HALF-OPEN";
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess() {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  recordFailure() {
    this.failureCount += 1;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
      console.warn(`⚠️ [CircuitBreaker] Breaker tripped to OPEN! Fast-failing downstream calls.`);
    }
  }
}

class QueueService {
  constructor() {
    this.queues = new Map();
    this.handlers = new Map();
    this.circuitBreaker = new CircuitBreaker({});
  }

  registerWorker(queueName, handler) {
    this.handlers.set(queueName, handler);
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, []);
    }
  }

  async addJob(queueName, jobData, options = {}) {
    const jobId = `job-${queueName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const job = {
      id: jobId,
      data: jobData,
      options: { attempts: 3, backoffMs: 1000, ...options },
      status: "queued",
      createdAt: new Date(),
    };

    if (!this.circuitBreaker.canExecute()) {
      throw new Error("Circuit breaker is OPEN. Service temporarily throttled to prevent cascade failure.");
    }

    // Process asynchronously without blocking caller event loop
    setImmediate(async () => {
      await this.processJob(queueName, job);
    });

    return { jobId, status: "queued" };
  }

  async processJob(queueName, job) {
    const handler = this.handlers.get(queueName);
    if (!handler) {
      console.error(`[QueueService] No handler registered for queue ${queueName}`);
      return;
    }

    job.status = "processing";
    let attempts = 0;
    const maxAttempts = job.options.attempts || 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        job.result = await handler(job.data);
        job.status = "completed";
        this.circuitBreaker.recordSuccess();
        return;
      } catch (err) {
        console.warn(`[QueueService] Job ${job.id} failed attempt ${attempts}/${maxAttempts}: ${err.message}`);
        if (attempts >= maxAttempts) {
          job.status = "failed";
          job.error = err.message;
          this.circuitBreaker.recordFailure();
        } else {
          // Exponential backoff
          const delay = (job.options.backoffMs || 1000) * Math.pow(2, attempts - 1);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
  }
}

const defaultQueueService = new QueueService();

module.exports = {
  QueueService,
  defaultQueueService,
  CircuitBreaker,
};
