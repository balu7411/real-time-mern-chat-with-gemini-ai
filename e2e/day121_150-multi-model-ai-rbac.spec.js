import { test, expect } from "@playwright/test";

test.describe("Day 121-150: Multi-Model AI Router, RBAC & Enterprise Security", () => {
  test("1. MultiModelAIRouter sanitizes prompts and executes automatic provider fallback", async () => {
    const { MultiModelAIRouter } = await import("../backend/src/ai/multiModelRouter.js");
    const router = new MultiModelAIRouter();

    // 1. Sanitization check
    const rawPrompt = "Hello <script>alert('xss')</script> generate code";
    const sanitized = router.sanitizePrompt(rawPrompt);
    expect(sanitized).not.toContain("<script>");
    expect(sanitized).toContain("Hello  generate code");

    // 2. Fallback execution check (falls back through chain to mock provider gracefully)
    const result = await router.generateWithFallback(rawPrompt);
    expect(result.text).toBeDefined();
    expect(result.provider).toBeDefined();
    expect(typeof result.text).toBe("string");
  });

  test("2. Security headers are present on all HTTP responses", async ({ request }) => {
    const response = await request.get("http://localhost:5000/api/health");
    expect(response.status()).toBe(200);

    const headers = response.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(headers["x-xss-protection"]).toBe("1; mode=block");
  });

  test("3. RBAC middleware restricts Viewer role from performing write operations", async () => {
    const { requirePermission } = await import("../backend/src/security/rbacMiddleware.js");

    const writeGuard = requirePermission("project:write");

    let statusCode = null;
    let responseBody = null;

    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      }
    };

    let nextCalled = false;
    const mockNext = () => { nextCalled = true; };

    // Viewer role attempting write -> Should receive 403 Forbidden
    const viewerReq = { user: { role: "Viewer" } };
    writeGuard(viewerReq, mockRes, mockNext);

    expect(statusCode).toBe(403);
    expect(responseBody.message).toContain("Forbidden: Insufficient permissions");
    expect(nextCalled).toBe(false);

    // Editor role attempting write -> Should succeed
    nextCalled = false;
    const editorReq = { user: { role: "Editor" } };
    writeGuard(editorReq, mockRes, mockNext);
    expect(nextCalled).toBe(true);
  });

  test("4. TokenRevocationList accurately invalidates revoked tokens", async () => {
    const { TokenRevocationList } = await import("../backend/src/security/rbacMiddleware.js");
    const blacklist = new TokenRevocationList();

    const sampleToken = "jwt-session-sample-token-123";
    expect(await blacklist.isRevoked(sampleToken)).toBe(false);

    await blacklist.revokeToken(sampleToken);
    expect(await blacklist.isRevoked(sampleToken)).toBe(true);
  });
});
