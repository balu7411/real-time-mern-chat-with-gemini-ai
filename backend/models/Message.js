const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // Project chat
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },

    // Private/group conversation
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
      index: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    senderName: {
      type: String,
      required: true,
    },

    text: {
      type: String,
      required: true,
    },

    isAI: {
      type: Boolean,
      default: false,
    },

    // If this AI message generated/updated files
    fileRefs: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);