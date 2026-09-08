import { chromium } from "playwright";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\kambl\\.gemini\\antigravity-ide\\brain\\8e0c5eef-3972-421e-8d6b-e843b54c0bdd";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log("Capturing Login page...");
  await page.goto("http://localhost:5174/login", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "login_redesigned.png"), fullPage: true });

  console.log("Capturing Register page...");
  await page.goto("http://localhost:5174/register", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "register_redesigned.png"), fullPage: true });

  console.log("Capturing Dashboard page with auth state...");
  await page.addInitScript(() => {
    localStorage.setItem("auth_token", "fake-enterprise-token");
    localStorage.setItem(
      "auth_user",
      JSON.stringify({
        _id: "65f000000000000000000001",
        name: "Lead Systems Architect",
        email: "architect@omniide.cloud",
        authProvider: "google",
      })
    );
  });
  await page.goto("http://localhost:5174/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "dashboard_redesigned.png"), fullPage: true });

  await browser.close();
  console.log("All screenshots captured successfully!");
}

main().catch(console.error);
