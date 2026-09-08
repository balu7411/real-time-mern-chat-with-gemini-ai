const { chromium } = require("@playwright/test");
const path = require("path");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to login...");
  await page.goto("http://localhost:5174/login");
  await page.fill('input[type="email"]', "test.architect@example.com");
  await page.fill('input[type="password"]', "Password123!");
  await page.click('button[type="submit"]');

  await page.waitForURL("http://localhost:5174/");
  console.log("✅ Successfully logged in to Dashboard");

  // Click topbar "AI Architect" trigger
  await page.click('button:has-text("AI Architect")');
  console.log("✅ AI Project Architect modal opened");

  // Fill in the exact fields from user's request
  await page.fill('input[placeholder*="Calculator"]', "build calculatior");
  await page.fill('textarea[placeholder*="arithmetic operations"]', "all operations it has to perform");

  console.log("⏳ Clicking Scaffold Codebase...");
  await page.click('button:has-text("Scaffold Codebase")');

  // Wait for navigation to /project/:id
  await page.waitForURL((url) => url.pathname.startsWith("/project/"), { timeout: 35000 });
  console.log("🎉 Successfully navigated to Project Workspace:", page.url());

  await page.waitForTimeout(1500);
  const artifactDir = "C:\\Users\\kambl\\.gemini\\antigravity-ide\\brain\\8e0c5eef-3972-421e-8d6b-e843b54c0bdd";
  const screenshotPath = path.join(artifactDir, "ai_scaffolded_project.png");
  await page.screenshot({ path: screenshotPath });
  console.log("📸 Overview screenshot saved to:", screenshotPath);

  // Click "Code" tab
  console.log("Clicking Code tab...");
  await page.click('button:has-text("Code"), a:has-text("Code"), span:has-text("Code")');
  await page.waitForTimeout(1500);

  // Click on src/App.jsx
  console.log("Clicking src/App.jsx in file tree...");
  await page.click('text="src/App.jsx"');
  await page.waitForTimeout(2000);

  const editorScreenshotPath = path.join(artifactDir, "ai_scaffolded_editor.png");
  await page.screenshot({ path: editorScreenshotPath });
  console.log("📸 Monaco editor screenshot saved to:", editorScreenshotPath);

  await browser.close();
}

main().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
