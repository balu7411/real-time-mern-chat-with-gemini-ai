const { chromium } = require("@playwright/test");
const path = require("path");

async function capture() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const artifactDir = "C:\\Users\\kambl\\.gemini\\antigravity-ide\\brain\\8e0c5eef-3972-421e-8d6b-e843b54c0bdd";

  console.log("📸 Capturing Login page...");
  await page.goto("http://localhost:5174/login");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactDir, "login_preview.png") });

  console.log("📸 Capturing Register page...");
  await page.goto("http://localhost:5174/register");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactDir, "register_preview.png") });

  console.log("📸 Capturing Google Callback page...");
  await page.goto("http://localhost:5174/auth/google/callback");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactDir, "callback_preview.png") });

  await browser.close();
  console.log("✅ Screenshots captured successfully!");
}

capture().catch(console.error);
