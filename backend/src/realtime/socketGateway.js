const { initRedisAdapter } = require("./redisAdapter");
const { defaultPresenceService } = require("./presenceService");
const registerChatNamespace = require("./namespaces/chatNamespace");
const registerWorkspaceNamespace = require("./namespaces/workspaceNamespace");
const registerPresenceNamespace = require("./namespaces/presenceNamespace");

class SocketGateway {
  constructor(io) {
    this.io = io;
    this.presenceService = defaultPresenceService;
  }

  init() {
    // 1. Initialize Redis Adapter for cross-node clustering
    initRedisAdapter(this.io);

    // 2. Register modular namespaces
    this.chatNsp = registerChatNamespace(this.io, this.presenceService);
    this.workspaceNsp = registerWorkspaceNamespace(this.io);
    this.presenceNsp = registerPresenceNamespace(this.io, this.presenceService);

    console.log("🚀 [SocketGateway] Modular namespaces initialized: /chat, /workspace, /presence");
  }
}

module.exports = SocketGateway;
