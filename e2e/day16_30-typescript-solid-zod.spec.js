import { test, expect } from "@playwright/test";

test.describe("Day 16-30: TypeScript Domain Contracts, SOLID Principles & Zod Validation", () => {
  test("1. Zod validation rejects invalid registration payloads with structured 400 error", async ({ request }) => {
    const response = await request.post("http://localhost:5000/api/auth/register", {
      data: {
        name: "A", // too short (min 2)
        email: "not-an-email",
        password: "123", // too short (min 6)
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.errors).toBeDefined();
    expect(body.errors.length).toBeGreaterThan(0);
  });

  test("2. Zod validation rejects invalid login payloads gracefully", async ({ request }) => {
    const response = await request.post("http://localhost:5000/api/auth/login", {
      data: {
        email: "invalid-email-format",
        password: "",
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBeDefined();
  });

  test("3. Zod validation rejects truncated Google OAuth token", async ({ request }) => {
    const response = await request.post("http://localhost:5000/api/auth/google", {
      data: {
        credential: "short", // min 10
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toContain("Google credential token must be valid");
  });

  test("4. Server continues to serve /api/health with active correlation IDs", async ({ request }) => {
    const res = await request.get("http://localhost:5000/api/health");
    expect(res.status()).toBe(200);
    expect(res.headers()["x-correlation-id"]).toBeDefined();
  });
});
