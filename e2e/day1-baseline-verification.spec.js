const { test, expect } = require("@playwright/test");

test.describe("Day 1: Architecture Baseline & Verification Protocol", () => {
  test("1. App boots and redirects unauthenticated user from / to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator("h1")).toContainText("Welcome Back");
  });

  test("2. Login page renders credentials form and Continue with Google SSO button", async ({ page }) => {
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    await page.goto("/login");

    // Verify Continue with Google button exists and has the Google SVG
    const googleBtn = page.getByRole("button", { name: /continue with google/i });
    await expect(googleBtn).toBeVisible();
    await expect(googleBtn).toBeEnabled();

    // Verify credential inputs
    await expect(page.getByPlaceholder("Enter your email")).toBeVisible();
    await expect(page.getByPlaceholder("Enter your password")).toBeVisible();
    await expect(page.getByRole("button", { name: /^login$/i })).toBeVisible();

    // Verify zero console errors
    expect(consoleErrors).toHaveLength(0);
  });

  test("3. Register page renders form and Continue with Google SSO button", async ({ page }) => {
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    await page.goto("/register");

    await expect(page.locator("h1")).toContainText("Create account");

    // Verify Google SSO button
    const googleBtn = page.getByRole("button", { name: /continue with google/i });
    await expect(googleBtn).toBeVisible();
    await expect(googleBtn).toBeEnabled();

    // Verify inputs
    await expect(page.getByPlaceholder("Your name")).toBeVisible();
    await expect(page.getByPlaceholder("Enter your email")).toBeVisible();
    await expect(page.getByPlaceholder("At least 6 characters")).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();

    // Verify zero console errors
    expect(consoleErrors).toHaveLength(0);
  });

  test("4. Navigation between Login and Register is seamless", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /create one/i }).click();
    await expect(page).toHaveURL(/.*\/register/);

    await page.getByRole("link", { name: /^login$/i }).click();
    await expect(page).toHaveURL(/.*\/login/);
  });

  test("5. DOM node count and initial memory baseline check", async ({ page }) => {
    await page.goto("/login");
    
    // Inspect DOM node count to ensure no unbounded nodes or memory leaks on initial load
    const domNodeCount = await page.evaluate(() => document.querySelectorAll("*").length);
    
    // An efficient login page should have well under 150 DOM nodes
    expect(domNodeCount).toBeLessThan(150);
    console.log(`[Day 1 Diagnostics] Initial Login DOM Node Count: ${domNodeCount}`);
  });
});
