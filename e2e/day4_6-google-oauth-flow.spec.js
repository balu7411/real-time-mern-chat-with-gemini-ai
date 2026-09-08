import { test, expect } from "@playwright/test";

test.describe("Day 4-6: Google OAuth 2.0 Integration & Callback Flow", () => {
  test("1. Google callback route mounts gracefully with loading indicator", async ({ page }) => {
    await page.goto("/auth/google/callback");

    // Check loading indicator and container
    const container = page.locator('[data-testid="google-callback-container"]');
    await expect(container).toBeVisible({ timeout: 5000 });

    // Should indicate authentication failed when no credential was supplied in URL
    await expect(page.getByText("No credential received from Google authentication.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Return to Login/i })).toBeVisible();
  });

  test("2. Return to Login button navigates back cleanly without console errors", async ({ page }) => {
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/auth/google/callback");
    await page.getByRole("button", { name: /Return to Login/i }).click();

    await expect(page).toHaveURL(/\/login/);
    expect(consoleErrors).toEqual([]);
  });

  test("3. Google callback with mocked credential payload establishes session", async ({ page }) => {
    // Intercept backend /api/auth/google endpoint to simulate successful OAuth exchange
    await page.route("**/api/auth/google", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "mock-google-jwt-token-12345",
          user: {
            _id: "google-user-id-999",
            name: "Enterprise Architect",
            email: "architect@example.com",
            username: "enterprise_architect",
            authProvider: "google",
            avatar: "https://example.com/avatar.png"
          }
        })
      });
    });

    // Also intercept /api/auth/me for session bootstrap
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            _id: "google-user-id-999",
            name: "Enterprise Architect",
            email: "architect@example.com",
            username: "enterprise_architect",
            authProvider: "google"
          }
        })
      });
    });

    // Navigate to callback with simulated credential query parameter
    await page.goto("/auth/google/callback?credential=mock.jwt.header");

    // Verify redirect to root dashboard
    await expect(page).toHaveURL(/\/(#.*)?$/);

    // Verify session token is in storage
    const token = await page.evaluate(() => sessionStorage.getItem("token"));
    expect(token).toBe("mock-google-jwt-token-12345");
  });
});
