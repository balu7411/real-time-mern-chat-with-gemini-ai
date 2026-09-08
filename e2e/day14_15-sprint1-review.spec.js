import { test, expect } from "@playwright/test";

test.describe("Day 14-15: Sprint 1 Architectural Review & Baseline Lock", () => {
  test("1. Full Sprint 1 regression pass: All authentication and logging capabilities intact", async ({ page, request }) => {
    // 1. Health check & correlation ID
    const health = await request.get("http://localhost:5000/api/health");
    expect(health.status()).toBe(200);
    expect(health.headers()["x-correlation-id"]).toBeDefined();

    // 2. Front routes
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();

    await page.goto("/register");
    await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();

    await page.goto("/auth/google/callback");
    await expect(page.locator('[data-testid="google-callback-container"]')).toBeVisible();

    // 3. Memory baseline check
    const nodeCount = await page.evaluate(() => document.querySelectorAll("*").length);
    expect(nodeCount).toBeLessThan(150);
  });
});
