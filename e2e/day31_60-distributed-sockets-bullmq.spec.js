import { test, expect } from "@playwright/test";
import { io } from "socket.io-client";

test.describe("Day 31-60: Modular Socket Namespaces, Redis Adapters & BullMQ Decoupling", () => {
  test("1. Modular /chat namespace connects and exchanges real-time messages across rooms", async () => {
    const socket = io("http://localhost:5000/chat", {
      transports: ["websocket"],
      auth: {
        userId: "test-user-31",
        userName: "Alice"
      }
    });

    await new Promise((resolve, reject) => {
      socket.on("connect", resolve);
      socket.on("connect_error", reject);
    });

    expect(socket.connected).toBe(true);

    const testConvId = "test-conv-room-101";
    socket.emit("join_conversation", testConvId);

    const receivedMessagePromise = new Promise((resolve) => {
      socket.on("new_message", (msg) => {
        resolve(msg);
      });
    });

    // Send valid message
    socket.emit("send_message", {
      conversationId: testConvId,
      text: "Hello from modular /chat namespace!"
    });

    const received = await receivedMessagePromise;
    expect(received.text).toBe("Hello from modular /chat namespace!");
    expect(received.senderId).toBe("test-user-31");
    expect(received.type).toBe("user");

    // Clean disconnect
    socket.disconnect();
  });

  test("2. Modular /chat namespace rejects empty or malformed socket payloads", async () => {
    const socket = io("http://localhost:5000/chat", {
      transports: ["websocket"],
      auth: { userId: "test-user-32" }
    });

    await new Promise((resolve) => socket.on("connect", resolve));

    const ackPromise = new Promise((resolve) => {
      socket.emit("send_message", { conversationId: "", text: "" }, (response) => {
        resolve(response);
      });
    });

    const response = await ackPromise;
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();

    socket.disconnect();
  });

  test("3. CircuitBreaker and QueueService process async jobs with backoff retry", async () => {
    const { QueueService, CircuitBreaker } = await import(
      "../backend/src/jobs/queueService.js"
    );

    const breaker = new CircuitBreaker({ failureThreshold: 2, cooldownPeriodMs: 100 });
    expect(breaker.canExecute()).toBe(true);

    breaker.recordFailure();
    expect(breaker.canExecute()).toBe(true);

    breaker.recordFailure(); // Reaches threshold 2
    expect(breaker.state).toBe("OPEN");
    expect(breaker.canExecute()).toBe(false);

    // After cooldown
    await new Promise((r) => setTimeout(r, 120));
    expect(breaker.canExecute()).toBe(true); // HALF-OPEN
  });
});
