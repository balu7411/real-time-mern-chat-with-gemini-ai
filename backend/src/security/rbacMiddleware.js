/**
 * Enterprise RBAC, Token Revocation & Security Guards
 * Hardens backend for enterprise SOC-2 compliance standards.
 */

const ROLE_PERMISSIONS = {
  Owner: ["project:read", "project:write", "project:delete", "project:admin", "chat:read", "chat:write"],
  Editor: ["project:read", "project:write", "chat:read", "chat:write"],
  Reviewer: ["project:read", "chat:read", "chat:write"],
  Viewer: ["project:read", "chat:read"],
};

class TokenRevocationList {
  constructor(redisClient = null) {
    this.redisClient = redisClient;
    this.inMemoryBlacklist = new Set();
  }

  async revokeToken(token, expirySeconds = 86400) {
    if (this.redisClient && this.redisClient.isOpen) {
      await this.redisClient.setEx(`blacklist:${token}`, expirySeconds, "revoked");
      return;
    }
    this.inMemoryBlacklist.add(token);
  }

  async isRevoked(token) {
    if (this.redisClient && this.redisClient.isOpen) {
      return (await this.redisClient.exists(`blacklist:${token}`)) === 1;
    }
    return this.inMemoryBlacklist.has(token);
  }

  clear() {
    this.inMemoryBlacklist.clear();
  }
}

const defaultTokenBlacklist = new TokenRevocationList();

function requirePermission(requiredPermission) {
  return (req, res, next) => {
    const userRole = req.user?.role || "Viewer";
    const userPermissions = ROLE_PERMISSIONS[userRole] || [];

    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json({
        message: `Forbidden: Insufficient permissions. Required: '${requiredPermission}', Role: '${userRole}'`,
      });
    }

    next();
  };
}

function securityHeadersMiddleware(req, res, next) {
  // Enterprise Security Headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
}

module.exports = {
  ROLE_PERMISSIONS,
  TokenRevocationList,
  defaultTokenBlacklist,
  requirePermission,
  securityHeadersMiddleware,
};
