const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    // Users participating in this conversation
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    // Optional project/workspace connected to this conversation
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },

    // Conversation type
    type: {
      type: String,
      enum: ["private", "group"],
      default: "private",
    },

    // Used later for group chats
    name: {
      type: String,
      default: "",
      trim: true,
    },

    // User who created the group
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "Conversation",
  conversationSchema
);