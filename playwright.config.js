const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5174",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm --prefix backend run start",
      url: "http://localhost:5000/api/health",
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: "npm --prefix frontend run dev",
      url: "http://localhost:5174",
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});
