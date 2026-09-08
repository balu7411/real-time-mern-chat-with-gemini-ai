const { chromium } = require("@playwright/test");
const path = require("path");

async function captureChat() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const artifactDir = "C:\\Users\\kambl\\OneDrive\\Desktop\\mern-ai-chat-backup";
  const brainDir = "C:\\Users\\kambl\\.gemini\\antigravity-ide\\brain\\8e0c5eef-3972-421e-8d6b-e843b54c0bdd";

  await page.addInitScript(() => {
    sessionStorage.setItem("token", "mock-chat-token");
  });

  // Mock user session
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          _id: "my-user-id",
          name: "Balu Google Explorer",
          email: "balu.engineer@example.com",
          authProvider: "google"
        }
      })
    });
  });

  // Mock conversation details
  await page.route("**/api/conversations/conv-123", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        conversation: {
          _id: "conv-123",
          type: "private",
          participants: [
            { _id: "my-user-id", name: "Balu Google Explorer" },
            { _id: "partner-user-id", name: "Sarah Connor (AI Tech Lead)", avatar: "" }
          ]
        }
      })
    });
  });

  // Mock messages
  await page.route("**/api/messages/conv-123**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        messages: [
          {
            _id: "msg-1",
            sender: "partner-user-id",
            senderName: "Sarah Connor (AI Tech Lead)",
            text: "Hey Balu! The new Redis 7 clustered socket gateway is deployed and running with zero dropped packets.",
            createdAt: new Date(Date.now() - 3600000).toISOString()
          },
          {
            _id: "msg-2",
            sender: "my-user-id",
            senderName: "Balu Google Explorer",
            text: "Awesome! The Playwright E2E suites for all 180 days are passing at 100% across Monaco, BullMQ, and RBAC.",
            createdAt: new Date(Date.now() - 1800000).toISOString()
          },
          {
            _id: "msg-3",
            sender: "partner-user-id",
            senderName: "Sarah Connor (AI Tech Lead)",
            text: "Fantastic. Let's run the final chaos validation and push the new obsidian glassmorphism redesign to main.",
            createdAt: new Date(Date.now() - 600000).toISOString()
          }
        ]
      })
    });
  });

  await page.route("**/api/conversations", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        conversations: [
          {
            _id: "conv-123",
            type: "private",
            participants: [
              { _id: "my-user-id", name: "Balu Google Explorer" },
              { _id: "partner-user-id", name: "Sarah Connor (AI Tech Lead)" }
            ],
            lastMessage: {
              text: "Fantastic. Let's run the final chaos validation...",
              createdAt: new Date().toISOString()
            }
          }
        ]
      })
    });
  });

  await page.route("**/api/projects", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ projects: [] })
    });
  });

  console.log("📸 Navigating to private-chat/conv-123...");
  await page.goto("http://localhost:5174/private-chat/conv-123");
  await page.waitForTimeout(1500);

  const screenshotPath = path.join(brainDir, "chat_redesigned.png");
  await page.screenshot({ path: screenshotPath });
  console.log("✅ Chat view saved to:", screenshotPath);

  await browser.close();
}

captureChat().catch(console.error);
