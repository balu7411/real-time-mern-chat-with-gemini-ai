require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const userRoutes = require("./routes/userRoutes");
const conversationRoutes = require("./routes/conversationRoutes");

const User = require("./models/User");
const Project = require("./models/Project");
const Message = require("./models/Message");
const Conversation = require("./models/Conversation");

const { askGemini } = require("./services/aiService");

const PORT = process.env.PORT || 5000;

const CLIENT_URL =
  process.env.CLIENT_URL || "http://localhost:5174";

const app = express();

// ----------------------------------------------------
// CORS
// ----------------------------------------------------

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));

// ----------------------------------------------------
// Health check
// ----------------------------------------------------

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

// ----------------------------------------------------
// REST API routes
// ----------------------------------------------------

/*
 * ------------------------------------------------------------
 * General AI conversation summary
 * ------------------------------------------------------------
 *
 * Works for BOTH:
 *   - private conversations
 *   - group conversations
 *
 * A Workplace is NOT required.
 * The summary is returned to the caller and is not saved as a
 * normal chat message.
 */
app.post(
  "/api/conversations/:id/ai-summary",
  async (req, res) => {
    try {
      const authHeader =
        req.headers.authorization || "";

      const token =
        authHeader.startsWith("Bearer ")
          ? authHeader.slice(7)
          : null;

      if (!token) {
        return res.status(401).json({
          message:
            "Authentication required.",
        });
      }

      const decoded =
        jwt.verify(
          token,
          process.env.JWT_SECRET
        );

      const currentUser =
        await User.findById(
          decoded.id
        ).select(
          "_id name email"
        );

      if (!currentUser) {
        return res.status(401).json({
          message:
            "User not found.",
        });
      }

      const conversation =
        await Conversation.findById(
          req.params.id
        )
          .populate(
            "participants",
            "name email"
          )
          .lean();

      if (!conversation) {
        return res.status(404).json({
          message:
            "Conversation not found.",
        });
      }

      const isParticipant =
        (conversation.participants || [])
          .some(
            (participant) =>
              participant?._id?.toString() ===
              currentUser._id.toString()
          );

      if (!isParticipant) {
        return res.status(403).json({
          message:
            "You are not a participant in this conversation.",
        });
      }

      const chatMessages =
        await Message.find({
          conversation:
            conversation._id,
        })
          .sort({
            createdAt: -1,
          })
          .limit(80)
          .populate(
            "sender",
            "name"
          )
          .lean();

      chatMessages.reverse();

      if (
        chatMessages.length ===
        0
      ) {
        return res.json({
          summary:
            "There are no messages to summarize yet.",
        });
      }

      const transcript =
        chatMessages
          .map(
            (message) => {
              const sender =
                message?.senderName ||
                message?.sender?.name ||
                "User";

              const body =
                String(
                  message?.text || ""
                ).trim();

              if (!body) {
                return "";
              }

              return `${sender}: ${body.slice(
                0,
                3000
              )}`;
            }
          )
          .filter(Boolean)
          .join("\n");

      if (!transcript.trim()) {
        return res.json({
          summary:
            "There is no text content to summarize yet.",
        });
      }

      const chatType =
        conversation.type === "group"
          ? "group chat"
          : "private chat";

      const prompt = [
        "You are the AI summary assistant inside a messaging application.",
        `Summarize this ${chatType} using ONLY the conversation provided below.`,
        "Do not invent information, names, deadlines, decisions, tasks, or blockers.",
        "",
        "Use these concise sections:",
        "SUMMARY",
        "KEY POINTS",
        "DECISIONS",
        "ACTION ITEMS",
        "QUESTIONS / BLOCKERS",
        "",
        "Use short bullet points.",
        "For a section with no relevant information, write: None mentioned.",
        "",
        "CONVERSATION:",
        transcript,
      ].join("\n");

      const result =
        await askGemini({
          prompt,
          existingFiles: [],
        });

      return res.json({
        summary:
          result?.message ||
          result?.text ||
          "The AI could not create a summary right now.",
      });
    } catch (err) {
      console.error(
        "[api] conversation AI summary error:",
        err
      );

      if (
        err?.name ===
          "JsonWebTokenError" ||
        err?.name ===
          "TokenExpiredError"
      ) {
        return res.status(401).json({
          message:
            "Invalid or expired authentication token.",
        });
      }

      return res.status(500).json({
        message:
          err?.message ||
          "Failed to generate AI summary.",
      });
    }
  }
);

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);

// ----------------------------------------------------
// HTTP server
// ----------------------------------------------------

const server = http.createServer(app);

// ----------------------------------------------------
// Socket.IO
// ----------------------------------------------------

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
  },
});

// ----------------------------------------------------
// Online user tracking
// ----------------------------------------------------

// userId -> number of active socket connections
const onlineUsers = new Map();

// ----------------------------------------------------
// Socket.IO authentication
// ----------------------------------------------------

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(
        new Error("No auth token provided")
      );
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.id);

    if (!user) {
      return next(
        new Error("User not found")
      );
    }

    socket.user = user;

    next();
  } catch (err) {
    console.error(
      "[socket] authentication failed:",
      err.message
    );

    next(
      new Error("Invalid or expired token")
    );
  }
});

// ----------------------------------------------------
// Socket.IO connection
// ----------------------------------------------------

io.on("connection", (socket) => {
  const userId =
    socket.user._id.toString();

  const userName =
    socket.user.name;

  console.log(
    `[socket] connected: ${userName} (${socket.id})`
  );

  // --------------------------------------------------
  // Register online user
  // --------------------------------------------------

  const previousCount =
    onlineUsers.get(userId) || 0;

  onlineUsers.set(
    userId,
    previousCount + 1
  );

  // Record the latest active time for the user profile.
  User.findByIdAndUpdate(
    userId,
    { lastSeen: new Date() }
  ).catch((err) => {
    console.error(
      "[socket] failed to update user lastSeen:",
      err.message
    );
  });

  // Personal room for presence notifications
  socket.join(`user:${userId}`);

  // Tell everyone that this user is online
  if (previousCount === 0) {
    io.emit("userPresence", {
      userId,
      online: true,
    });
  }

  // --------------------------------------------------
  // Join project room
  // --------------------------------------------------

  socket.on(
    "joinProject",
    async (projectId) => {
      try {
        if (!projectId) return;

        const project =
          await Project.findById(projectId);

        if (!project) {
          console.log(
            `[socket] project not found: ${projectId}`
          );

          return;
        }

        const isMember =
          project.owner.equals(
            socket.user._id
          ) ||
          project.collaborators.some((c) =>
            c.equals(socket.user._id)
          );

        if (!isMember) {
          console.log(
            `[socket] unauthorized project access: ${socket.user.name}`
          );

          return;
        }

        socket.join(projectId);

        socket.currentProjectId =
          projectId;

        console.log(
          `[socket] ${socket.user.name} joined project ${projectId}`
        );
      } catch (err) {
        console.error(
          "[socket] joinProject error:",
          err.message
        );
      }
    }
  );

  // --------------------------------------------------
  // Save/update project file
  // --------------------------------------------------

  socket.on(
    "fileUpdated",
    async ({
      projectId,
      path,
      content,
    }) => {
      try {
        if (
          !projectId ||
          !path ||
          typeof content !== "string"
        ) {
          return;
        }

        const project =
          await Project.findById(projectId);

        if (!project) {
          return;
        }

        const isMember =
          project.owner.equals(
            socket.user._id
          ) ||
          project.collaborators.some((c) =>
            c.equals(socket.user._id)
          );

        if (!isMember) {
          return;
        }

        const existingFile =
          project.files.find(
            (file) =>
              file.path === path
          );

        if (existingFile) {
          existingFile.content =
            content;
        } else {
          project.files.push({
            path,
            content,
          });
        }

        await project.save();

        // Send updated files to everyone else
        // in the same project room.
        socket
          .to(projectId)
          .emit("filesUpdated", {
            projectId,
            files: project.files,
          });

        console.log(
          `[socket] file updated: ${path} by ${socket.user.name}`
        );
      } catch (err) {
        console.error(
          "[socket] fileUpdated error:",
          err.message
        );
      }
    }
  );

  // --------------------------------------------------
  // Project Chat + Gemini AI
  // --------------------------------------------------

  socket.on(
    "sendMessage",
    async ({
      projectId,
      text,
    }) => {
      if (
        !projectId ||
        !text?.trim()
      ) {
        return;
      }

      try {
        const project =
          await Project.findById(projectId);

        if (!project) {
          return;
        }

        const isMember =
          project.owner.equals(
            socket.user._id
          ) ||
          project.collaborators.some((c) =>
            c.equals(socket.user._id)
          );

        if (!isMember) {
          return;
        }

        // --------------------------------------------
        // Persist human message
        // --------------------------------------------

        const userMessage =
          await Message.create({
            project: projectId,
            sender: socket.user._id,
            senderName: socket.user.name,
            text: text.trim(),
            isAI: false,
          });

        io.to(projectId).emit(
          "newMessage",
          userMessage
        );

        // --------------------------------------------
        // Gemini AI request
        // --------------------------------------------

        if (
          /^@ai\b/i.test(
            text.trim()
          )
        ) {
          const prompt =
            text
              .trim()
              .replace(
                /^@ai\b/i,
                ""
              )
              .trim();

          io.to(projectId).emit(
            "aiThinking",
            {
              projectId,
            }
          );

          try {
            const result =
              await askGemini({
                prompt,
                existingFiles:
                  project.files.map(
                    (f) => ({
                      path: f.path,
                      content:
                        f.content,
                    })
                  ),
              });

            let fileRefs = [];

            // ----------------------------------------
            // Save Gemini-generated files
            // ----------------------------------------

            if (
              result.isFileResponse
            ) {
              for (
                const f of result.files
              ) {
                const idx =
                  project.files.findIndex(
                    (existing) =>
                      existing.path ===
                      f.path
                  );

                if (idx >= 0) {
                  project.files[
                    idx
                  ].content =
                    f.content;
                } else {
                  project.files.push({
                    path: f.path,
                    content:
                      f.content,
                  });
                }

                fileRefs.push(
                  f.path
                );
              }

              await project.save();
            }

            // ----------------------------------------
            // Save Gemini message
            // ----------------------------------------

            const aiMessage =
              await Message.create({
                project: projectId,
                sender: null,
                senderName:
                  "Gemini AI",
                text:
                  result.message,
                isAI: true,
                fileRefs,
              });

            io.to(projectId).emit(
              "newMessage",
              aiMessage
            );

            // ----------------------------------------
            // Broadcast generated files
            // ----------------------------------------

            if (
              fileRefs.length > 0
            ) {
              io.to(projectId).emit(
                "filesUpdated",
                {
                  projectId,
                  files:
                    project.files,
                }
              );
            }
          } catch (aiErr) {
            console.error(
              "[ai] Gemini call failed:",
              aiErr.message
            );

            const errMessage =
              await Message.create({
                project: projectId,
                sender: null,
                senderName:
                  "Gemini AI",
                text:
                  "Sorry, I couldn't process that request right now. Please try again later.",
                isAI: true,
              });

            io.to(projectId).emit(
              "newMessage",
              errMessage
            );
          }
        }
      } catch (err) {
        console.error(
          "[socket] sendMessage error:",
          err.message
        );
      }
    }
  );

  // --------------------------------------------------
  // Join private conversation
  // --------------------------------------------------

  socket.on(
    "joinConversation",
    async (conversationId) => {
      try {
        if (!conversationId) {
          return;
        }

        const conversation =
          await Conversation.findById(
            conversationId
          );

        if (!conversation) {
          console.log(
            `[socket] conversation not found: ${conversationId}`
          );

          return;
        }

        const isParticipant =
          conversation.participants.some(
            (participant) =>
              participant.equals(
                socket.user._id
              )
          );

        if (!isParticipant) {
          console.log(
            `[socket] unauthorized conversation access: ${socket.user.name}`
          );

          return;
        }

        socket.join(
          `conversation:${conversationId}`
        );

        socket.currentConversationId =
          conversationId;

        console.log(
          `[socket] ${socket.user.name} joined conversation ${conversationId}`
        );
      } catch (err) {
        console.error(
          "[socket] joinConversation error:",
          err.message
        );
      }
    }
  );

  // --------------------------------------------------
  // Check whether another user is currently online
  // --------------------------------------------------

  socket.on(
    "checkUserOnline",
    (targetUserId) => {
      if (!targetUserId) {
        return;
      }

      const online =
        onlineUsers.has(
          targetUserId.toString()
        );

      socket.emit(
        "userOnlineStatus",
        {
          userId:
            targetUserId.toString(),
          online,
        }
      );
    }
  );

  // --------------------------------------------------
  // Leave private conversation
  // --------------------------------------------------

  socket.on(
    "leaveConversation",
    (conversationId) => {
      if (!conversationId) {
        return;
      }

      socket.leave(
        `conversation:${conversationId}`
      );

      if (
        socket.currentConversationId ===
        conversationId
      ) {
        socket.currentConversationId =
          null;
      }

      console.log(
        `[socket] ${socket.user.name} left conversation ${conversationId}`
      );
    }
  );

  // --------------------------------------------------
  // Send private message
  // --------------------------------------------------

  socket.on(
    "sendPrivateMessage",
    async ({
      conversationId,
      text,
    }) => {
      try {
        if (
          !conversationId ||
          !text?.trim()
        ) {
          return;
        }

        const conversation =
          await Conversation.findById(
            conversationId
          );

        if (!conversation) {
          console.log(
            "[socket] private conversation not found"
          );

          return;
        }

        const isParticipant =
          conversation.participants.some(
            (participant) =>
              participant.equals(
                socket.user._id
              )
          );

        if (!isParticipant) {
          console.log(
            `[socket] unauthorized private message by ${socket.user.name}`
          );

          return;
        }

        // --------------------------------------------
        // Save private message
        // --------------------------------------------

        let message =
          await Message.create({
            project: null,
            conversation:
              conversationId,
            sender:
              socket.user._id,
            senderName:
              socket.user.name,
            text: text.trim(),
            isAI: false,
          });

        // Include sender information
        message =
          await message.populate(
            "sender",
            "name email"
          );

        // --------------------------------------------
        // Broadcast to both users
        // --------------------------------------------

        io.to(
          `conversation:${conversationId}`
        ).emit(
          "newPrivateMessage",
          message
        );

        console.log(
          `[socket] private message from ${socket.user.name} in ${conversationId}`
        );
      } catch (err) {
        console.error(
          "[socket] sendPrivateMessage error:",
          err.message
        );
      }
    }
  );

  // --------------------------------------------------
  // Disconnect
  // --------------------------------------------------

  socket.on(
    "disconnect",
    () => {
      const currentCount =
        onlineUsers.get(userId) || 0;

      if (currentCount <= 1) {
        onlineUsers.delete(userId);

        User.findByIdAndUpdate(
          userId,
          { lastSeen: new Date() }
        ).catch((err) => {
          console.error(
            "[socket] failed to save user lastSeen:",
            err.message
          );
        });

        // Tell everyone this user is offline
        io.emit("userPresence", {
          userId,
          online: false,
        });
      } else {
        onlineUsers.set(
          userId,
          currentCount - 1
        );
      }

      console.log(
        `[socket] disconnected: ${socket.user?.name} (${socket.id})`
      );
    }
  );
});

// ----------------------------------------------------
// Start server
// ----------------------------------------------------

connectDB().then(() => {
  server.listen(
    PORT,
    () => {
      console.log(
        `[server] listening on http://localhost:${PORT}`
      );
    }
  );
});