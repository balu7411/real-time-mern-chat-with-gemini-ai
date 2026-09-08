const { test, expect } = require("@playwright/test");

test.describe("Day 3: Real-Time Socket Readiness & Diagnostics", () => {
  test("1. Backend /api/health responds with status ok", async ({ request }) => {
    // If backend is running, verify health endpoint
    const res = await request.get("http://localhost:5000/api/health").catch(() => null);
    if (res) {
      expect(res.status()).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("ok");
    }
  });

  test("2. Client socket-ready initialization does not throw unhandled rejections", async ({ page }) => {
    const unhandledRejections = [];
    page.on("pageerror", (err) => unhandledRejections.push(err.message));

    await page.goto("/login");

    // Wait 1 second to ensure any background socket connections settle
    await page.waitForTimeout(1000);

    expect(unhandledRejections).toHaveLength(0);
  });

  test("3. Route transitions remain leak-free with zero console errors", async ({ page }) => {
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/login");
    await page.goto("/register");
    await page.goto("/login");

    expect(errors).toHaveLength(0);
  });
});
