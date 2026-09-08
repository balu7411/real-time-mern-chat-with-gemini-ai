const { defaultQueueService } = require("./queueService");
const { askGemini } = require("../../services/aiService");
const { AIMessage } = require("../core/domain/messages");
const logger = require("../../utils/logger");

function startAIWorker(io) {
  defaultQueueService.registerWorker("ai-generation-queue", async (data) => {
    const { prompt, conversationId, userContext } = data;
    logger.info(`[AIWorker] Processing prompt for conversation ${conversationId}: "${prompt.substring(0, 40)}..."`);

    try {
      // Execute AI generation in isolated worker context
      const aiResponseText = await askGemini(prompt, userContext);

      const aiMessage = new AIMessage({
        id: `ai-${Date.now()}`,
        conversationId,
        text: aiResponseText,
        senderId: "gemini-ai-bot",
        senderName: "Gemini AI",
        model: "gemini-1.5-flash",
      });

      // Emit formatted message to Socket room
      if (io) {
        io.of("/chat").to(`conv:${conversationId}`).emit("new_message", aiMessage.format());
      }

      return aiMessage.format();
    } catch (err) {
      logger.error(`[AIWorker] Error generating AI response: ${err.message}`);
      throw err;
    }
  });

  console.log("👷 [AIWorker] BullMQ-compatible AI Generation Worker registered and listening!");
}

module.exports = startAIWorker;
