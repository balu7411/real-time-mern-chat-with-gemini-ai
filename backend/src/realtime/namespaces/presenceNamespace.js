function registerPresenceNamespace(io, presenceService) {
  const presenceNsp = io.of("/presence");

  presenceNsp.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId;

    if (userId) {
      presenceService.setUserOnline(userId, socket.id).catch(() => {});
    }

    const onHeartbeat = async (ack) => {
      if (userId) {
        await presenceService.setUserOnline(userId, socket.id).catch(() => {});
      }
      if (typeof ack === "function") {
        ack({ status: "alive", timestamp: Date.now() });
      }
    };
    socket.on("heartbeat", onHeartbeat);

    socket.once("disconnect", async () => {
      if (userId) {
        await presenceService.setUserOffline(userId, socket.id).catch(() => {});
      }
      socket.off("heartbeat", onHeartbeat);
      socket.removeAllListeners();
    });
  });

  return presenceNsp;
}

module.exports = registerPresenceNamespace;
