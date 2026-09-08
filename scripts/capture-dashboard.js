const { chromium } = require("@playwright/test");
const path = require("path");

async function captureDashboard() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const artifactDir = "C:\\Users\\kambl\\.gemini\\antigravity-ide\\brain\\8e0c5eef-3972-421e-8d6b-e843b54c0bdd";

  // Simulate authenticated session
  await page.addInitScript(() => {
    sessionStorage.setItem("token", "mock-valid-token-dashboard");
  });

  // Mock /api/auth/me
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          _id: "google-user-101",
          name: "Balu Google Explorer",
          email: "balu.engineer@example.com",
          authProvider: "google",
          avatar: ""
        }
      })
    });
  });

  // Mock /api/conversations
  await page.route("**/api/conversations", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ conversations: [] })
    });
  });

  // Mock /api/projects
  await page.route("**/api/projects", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ projects: [] })
    });
  });

  console.log("📸 Navigating to redesigned Dashboard...");
  await page.goto("http://localhost:5174/");
  await page.waitForTimeout(1500);

  const screenshotPath = path.join(artifactDir, "redesigned_dashboard.png");
  await page.screenshot({ path: screenshotPath });
  console.log("✅ Redesigned dashboard saved to:", screenshotPath);

  await browser.close();
}

captureDashboard().catch(console.error);
