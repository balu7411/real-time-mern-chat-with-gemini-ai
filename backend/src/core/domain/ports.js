/**
 * Segregated Port Interfaces & Repository Contracts
 * Enforces Interface Segregation Principle (ISP) & Dependency Inversion Principle (DIP).
 */

class IUserRepository {
  async findById(userId) { throw new Error("Not implemented"); }
  async findByEmail(email) { throw new Error("Not implemented"); }
  async findByGoogleId(googleId) { throw new Error("Not implemented"); }
  async create(userData) { throw new Error("Not implemented"); }
  async update(userId, patch) { throw new Error("Not implemented"); }
}

/**
 * Segregated Project Query Contracts (ISP)
 * Avoids loading massive monolithic documents when only headers or directory trees are required.
 */
class IProjectHeader {
  constructor({ id, name, ownerId, createdAt, collaboratorCount }) {
    this.id = id;
    this.name = name;
    this.ownerId = ownerId;
    this.createdAt = createdAt;
    this.collaboratorCount = collaboratorCount;
  }
}

class IProjectFileDirectory {
  constructor({ projectId, filesSummary }) {
    this.projectId = projectId;
    this.filesSummary = filesSummary; // [{ id, name, path, language }] without full file buffer/content
  }
}

class IProjectTaskView {
  constructor({ projectId, tasks }) {
    this.projectId = projectId;
    this.tasks = tasks;
  }
}

class IProjectRepository {
  async getHeader(projectId) { throw new Error("Not implemented"); }
  async getFileDirectory(projectId) { throw new Error("Not implemented"); }
  async getTasks(projectId) { throw new Error("Not implemented"); }
  async getFileContent(projectId, fileId) { throw new Error("Not implemented"); }
  async saveFile(projectId, fileData, expectedVersion) { throw new Error("Not implemented"); }
}

class IMessageRepository {
  async saveMessage(messageEntity) { throw new Error("Not implemented"); }
  async getRecentMessages(conversationId, { limit, lastSeenId }) { throw new Error("Not implemented"); }
}

class IAIService {
  async generateText(prompt, options) { throw new Error("Not implemented"); }
  async streamTokens(prompt, onToken) { throw new Error("Not implemented"); }
}

class ICacheService {
  async get(key) { throw new Error("Not implemented"); }
  async set(key, value, ttlSeconds) { throw new Error("Not implemented"); }
  async del(key) { throw new Error("Not implemented"); }
}

module.exports = {
  IUserRepository,
  IProjectRepository,
  IMessageRepository,
  IAIService,
  ICacheService,
  IProjectHeader,
  IProjectFileDirectory,
  IProjectTaskView,
};
