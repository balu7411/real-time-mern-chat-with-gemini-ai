/**
 * Clean Architecture Domain Entities
 * Independent of databases, frameworks, or transport layers.
 */

class UserEntity {
  constructor({ id, name, email, username, avatar = "", authProvider = "local", role = "Viewer", createdAt = new Date() }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.username = username;
    this.avatar = avatar;
    this.authProvider = authProvider;
    this.role = role;
    this.createdAt = createdAt;
  }

  isGoogleUser() {
    return this.authProvider === "google";
  }
}

class WorkspaceFileEntity {
  constructor({ id, name, content = "", path = "/", language = "javascript", updatedAt = new Date() }) {
    this.id = id;
    this.name = name;
    this.content = content;
    this.path = path;
    this.language = language;
    this.updatedAt = updatedAt;
  }
}

class ProjectEntity {
  constructor({ id, name, ownerId, files = [], collaborators = [], createdAt = new Date(), version = 1 }) {
    this.id = id;
    this.name = name;
    this.ownerId = ownerId;
    this.files = files.map((f) => (f instanceof WorkspaceFileEntity ? f : new WorkspaceFileEntity(f)));
    this.collaborators = collaborators;
    this.createdAt = createdAt;
    this.version = version; // Optimistic Concurrency Control
  }
}

class TaskEntity {
  constructor({ id, title, description = "", status = "todo", projectId, assigneeId = null, createdAt = new Date() }) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.status = status;
    this.projectId = projectId;
    this.assigneeId = assigneeId;
    this.createdAt = createdAt;
  }
}

module.exports = {
  UserEntity,
  WorkspaceFileEntity,
  ProjectEntity,
  TaskEntity,
};
