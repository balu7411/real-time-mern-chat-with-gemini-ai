import { test, expect } from "@playwright/test";

test.describe("Day 11-13: Structured Logging & Request Correlation ID", () => {
  test("1. Server responds to /api/health with an x-correlation-id header", async ({ request }) => {
    const response = await request.get("http://localhost:5000/api/health");
    expect(response.status()).toBe(200);

    const headers = response.headers();
    const correlationId = headers["x-correlation-id"];
    expect(correlationId).toBeDefined();
    expect(typeof correlationId).toBe("string");
    expect(correlationId.length).toBeGreaterThan(10);
  });

  test("2. Client supplied x-correlation-id is propagated through server response", async ({ request }) => {
    const customId = "trace-custom-uuid-test-999";
    const response = await request.get("http://localhost:5000/api/health", {
      headers: {
        "x-correlation-id": customId
      }
    });

    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers["x-correlation-id"]).toBe(customId);
  });
});
