const { validateSocketPayload } = require("../../core/validation/validateMiddleware");
const { socketChatMessageSchema } = require("../../core/validation/schemas");
const { UserMessage } = require("../../core/domain/messages");
const logger = require("../../../utils/logger");

function registerChatNamespace(io, presenceService) {
  const chatNsp = io.of("/chat");

  chatNsp.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId || socket.id;
    logger.info(`[Socket /chat] User connected: ${userId} (socket ${socket.id})`);

    // Track presence
    presenceService.setUserOnline(userId, socket.id).catch(() => {});

    // Join room handler
    const onJoinConversation = (conversationId) => {
      if (conversationId) {
        socket.join(`conv:${conversationId}`);
      }
    };
    socket.on("join_conversation", onJoinConversation);

    // Leave room handler
    const onLeaveConversation = (conversationId) => {
      if (conversationId) {
        socket.leave(`conv:${conversationId}`);
      }
    };
    socket.on("leave_conversation", onLeaveConversation);

    // Send message handler with Zod validation
    const onSendMessage = async (payload, callback) => {
      try {
        const validated = validateSocketPayload(socketChatMessageSchema, payload);

        const domainMsg = new UserMessage({
          id: `msg-${Date.now()}`,
          conversationId: validated.conversationId,
          text: validated.text,
          senderId: userId,
          senderName: socket.handshake.auth?.userName || "User",
        });

        // Broadcast to all participants in this room across nodes
        chatNsp.to(`conv:${validated.conversationId}`).emit("new_message", domainMsg.format());

        if (typeof callback === "function") {
          callback({ success: true, messageId: domainMsg.id });
        }
      } catch (err) {
        if (typeof callback === "function") {
          callback({ success: false, error: err.message });
        }
      }
    };
    socket.on("send_message", onSendMessage);

    // Typing indicator
    const onTyping = ({ conversationId, isTyping }) => {
      if (conversationId) {
        socket.to(`conv:${conversationId}`).emit("user_typing", {
          userId,
          isTyping,
          conversationId,
        });
      }
    };
    socket.on("typing", onTyping);

    // Strict Memory Leak Eradication on Disconnect:
    // Detach all listeners explicitly
    socket.once("disconnect", async () => {
      logger.info(`[Socket /chat] User disconnected: ${userId} (socket ${socket.id})`);
      await presenceService.setUserOffline(userId, socket.id).catch(() => {});

      socket.off("join_conversation", onJoinConversation);
      socket.off("leave_conversation", onLeaveConversation);
      socket.off("send_message", onSendMessage);
      socket.off("typing", onTyping);
      socket.removeAllListeners();
    });
  });

  return chatNsp;
}

module.exports = registerChatNamespace;
