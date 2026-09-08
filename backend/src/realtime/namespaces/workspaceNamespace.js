const logger = require("../../../utils/logger");

function registerWorkspaceNamespace(io) {
  const workspaceNsp = io.of("/workspace");

  workspaceNsp.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId || socket.id;
    logger.info(`[Socket /workspace] Client connected: ${userId} (socket ${socket.id})`);

    const onJoinProject = (projectId) => {
      if (projectId) {
        socket.join(`project:${projectId}`);
      }
    };
    socket.on("join_project", onJoinProject);

    const onLeaveProject = (projectId) => {
      if (projectId) {
        socket.leave(`project:${projectId}`);
      }
    };
    socket.on("leave_project", onLeaveProject);

    // Code change delta broadcast
    const onFileUpdate = ({ projectId, fileId, delta, version }) => {
      if (projectId) {
        socket.to(`project:${projectId}`).emit("file_updated", {
          fileId,
          delta,
          version,
          editorId: userId,
        });
      }
    };
    socket.on("file_update", onFileUpdate);

    // Cursor position sync
    const onCursorMove = ({ projectId, fileId, position }) => {
      if (projectId) {
        socket.to(`project:${projectId}`).emit("cursor_moved", {
          userId,
          fileId,
          position,
        });
      }
    };
    socket.on("cursor_move", onCursorMove);

    // Leak-free cleanup on disconnect
    socket.once("disconnect", () => {
      socket.off("join_project", onJoinProject);
      socket.off("leave_project", onLeaveProject);
      socket.off("file_update", onFileUpdate);
      socket.off("cursor_move", onCursorMove);
      socket.removeAllListeners();
    });
  });

  return workspaceNsp;
}

module.exports = registerWorkspaceNamespace;
