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

// High-Throughput Compound B-Tree Indexes (Sprint 7 / Days 91-94)
messageSchema.index({ project: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, _id: -1 });

// Keyset Cursor-Based Pagination (Days 95-98)
// Replaces O(N) skip/limit with O(1) indexed keyset seeking
messageSchema.statics.paginateKeyset = async function ({ conversationId, projectId, lastSeenId, limit = 50 }) {
  const query = {};
  if (conversationId) query.conversation = conversationId;
  if (projectId) query.project = projectId;

  if (lastSeenId) {
    query._id = { $lt: lastSeenId };
  }

  return this.find(query)
    .sort({ _id: -1 })
    .limit(limit)
    .lean() // Bypasses Mongoose document overhead (Days 99-102)
    .exec();
};

module.exports = mongoose.model("Message", messageSchema);