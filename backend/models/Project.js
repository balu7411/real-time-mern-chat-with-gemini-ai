const mongoose = require("mongoose");

// A single file inside a project's generated file tree
const fileSchema = new mongoose.Schema(
  {
    path: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    collaborators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Used later to connect Group -> Workplace
    sourceGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
    },

    status: {
      type: String,
      enum: ["Planning", "Active", "On Hold", "Completed"],
      default: "Planning",
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },

    startDate: {
      type: Date,
      default: null,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    files: [fileSchema],
  },
  {
    timestamps: true,
    optimisticConcurrency: true, // Prevents concurrent overwrite race conditions (__v OCC)
  }
);

// High-Throughput Compound B-Tree Indexes (Sprint 7 / Days 91-94)
projectSchema.index({ owner: 1, createdAt: -1 });
projectSchema.index({ collaborators: 1 });
projectSchema.index({ status: 1, priority: 1 });

module.exports = mongoose.model("Project", projectSchema);