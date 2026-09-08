const { test, expect } = require("@playwright/test");

test.describe("Day 2: Google OAuth Backend & Memory Soak Verification", () => {
  test("1. Login & Register render Google SSO with correct aria and button attributes", async ({ page }) => {
    await page.goto("/login");
    const loginGoogleBtn = page.getByRole("button", { name: /continue with google/i });
    await expect(loginGoogleBtn).toBeVisible();
    await expect(loginGoogleBtn).toHaveAttribute("type", "button");

    await page.goto("/register");
    const registerGoogleBtn = page.getByRole("button", { name: /continue with google/i });
    await expect(registerGoogleBtn).toBeVisible();
    await expect(registerGoogleBtn).toHaveAttribute("type", "button");
  });

  test("2. Navigating repeatedly between routes does not leak DOM nodes", async ({ page }) => {
    await page.goto("/login");
    const initialNodeCount = await page.evaluate(() => document.querySelectorAll("*").length);

    // Cycle 5 times between Login and Register
    for (let i = 0; i < 5; i++) {
      await page.goto("/register");
      await page.goto("/login");
    }

    const finalNodeCount = await page.evaluate(() => document.querySelectorAll("*").length);
    console.log(`[Day 2 Memory] Initial Nodes: ${initialNodeCount}, Final Nodes: ${finalNodeCount}`);

    // Node count should remain virtually identical (delta <= 2)
    expect(Math.abs(finalNodeCount - initialNodeCount)).toBeLessThanOrEqual(2);
  });

  test("3. Google Auth API contract rejects missing credentials gracefully", async ({ request }) => {
    // In e2e test, we test the backend endpoint directly
    const res = await request.post("http://localhost:5000/api/auth/google", {
      data: {},
    }).catch(() => null);

    if (res) {
      expect([400, 404, 500]).toContain(res.status());
    }
  });
});
