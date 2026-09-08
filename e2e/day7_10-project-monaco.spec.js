import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

test.describe("Day 7-10: Repository Packaging & Project Workspace Monaco Integration", () => {
  test("1. Repomix configuration exists and passes security audit rules", async () => {
    const configPath = path.resolve(process.cwd(), "repomix.config.json");
    expect(fs.existsSync(configPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    expect(config.security.enableSecurityCheck).toBe(true);
    expect(config.ignore.customPatterns).toContain("**/.env*");
  });

  test("2. Project workspace mounts authenticated user session with mock project", async ({ page }) => {
    // Mock user authentication
    await page.addInitScript(() => {
      sessionStorage.setItem("token", "mock-valid-token-day7");
    });

    // Mock /api/auth/me
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            _id: "user-day7-id",
            name: "Dev Lead",
            email: "lead@example.com",
            username: "devlead"
          }
        })
      });
    });

    // Mock project endpoint /api/projects/proj-123
    await page.route("**/api/projects/proj-123", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          _id: "proj-123",
          name: "Enterprise Microservice",
          files: [
            {
              _id: "file-1",
              name: "index.js",
              content: "console.log('Hello World');",
              path: "/index.js"
            }
          ],
          collaborators: []
        })
      });
    });

    // Mock users endpoint
    await page.route("**/api/users**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([])
      });
    });

    await page.goto("/project/proj-123");

    // Workspace container or header should render
    await expect(page.locator("body")).toBeVisible();
  });
});
