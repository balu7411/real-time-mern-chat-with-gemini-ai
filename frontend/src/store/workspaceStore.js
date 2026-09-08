/**
 * Decoupled Workspace Store
 * Manages active files, open tabs, and optimistic file versioning.
 */

class WorkspaceStore {
  constructor() {
    this.state = {
      currentProjectId: null,
      files: [],
      activeFile: null,
      fileVersions: new Map(), // fileId -> version number (OCC)
      isDirty: false,
    };
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  setProject(projectId, files = []) {
    this.state.currentProjectId = projectId;
    this.state.files = files;
    this.state.activeFile = files[0] || null;
    this.notify();
  }

  setActiveFile(file) {
    this.state.activeFile = file;
    this.notify();
  }

  updateFileContent(path, content, nextVersion = null) {
    const file = this.state.files.find((f) => f.path === path);
    if (file) {
      file.content = content;
      if (nextVersion !== null) {
        this.state.fileVersions.set(file._id || path, nextVersion);
      }
      this.state.isDirty = true;
      this.notify();
    }
  }

  markSaved() {
    this.state.isDirty = false;
    this.notify();
  }
}

export const workspaceStore = new WorkspaceStore();
