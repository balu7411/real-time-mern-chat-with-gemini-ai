const express = require("express");

const Conversation = require("../models/Conversation");
const User = require("../models/User");
const Message = require("../models/Message");

const { protect } = require("../middleware/auth");

const router = express.Router();

/*
====================================================
GET ALL CONVERSATIONS
GET /api/conversations
====================================================
*/
router.get("/", protect, async (req, res) => {
  try {
    const conversations =
      await Conversation.find({
        participants: req.user._id,
      })
        .populate(
          "participants",
          "name email"
        )
        .populate(
          "createdBy",
          "name email"
        )
        .sort({
          updatedAt: -1,
          createdAt: -1,
        });

    const result =
      await Promise.all(
        conversations.map(
          async (conversation) => {
            let otherUser = null;

            if (
              conversation.type ===
              "private"
            ) {
              otherUser =
                conversation.participants.find(
                  (participant) =>
                    participant._id.toString() !==
                    req.user._id.toString()
                ) || null;
            }

            const lastMessage =
              await Message.findOne({
                conversation:
                  conversation._id,
              })
                .sort({
                  createdAt: -1,
                })
                .populate(
                  "sender",
                  "name email"
                );

            return {
              _id:
                conversation._id,

              type:
                conversation.type,

              name:
                conversation.name || "",

              participants:
                conversation.participants,

              createdBy:
                conversation.createdBy ||
                null,

              otherUser,

              lastMessage:
                lastMessage || null,

              createdAt:
                conversation.createdAt,

              updatedAt:
                conversation.updatedAt,
            };
          }
        )
      );

    res.json({
      conversations: result,
    });
  } catch (error) {
    console.error(
      "Get conversations error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to load conversations",
    });
  }
});


/*
====================================================
CREATE OR GET PRIVATE CONVERSATION
POST /api/conversations/private
====================================================
*/
router.post(
  "/private",
  protect,
  async (req, res) => {
    try {
      const { userId } =
        req.body;

      if (!userId) {
        return res.status(400).json({
          message:
            "User ID is required",
        });
      }

      if (
        userId.toString() ===
        req.user._id.toString()
      ) {
        return res.status(400).json({
          message:
            "You cannot start a chat with yourself",
        });
      }

      const otherUser =
        await User.findById(
          userId
        );

      if (!otherUser) {
        return res.status(404).json({
          message:
            "User not found",
        });
      }

      let conversation =
        await Conversation.findOne({
          type: "private",

          participants: {
            $all: [
              req.user._id,
              otherUser._id,
            ],

            $size: 2,
          },
        })
          .populate(
            "participants",
            "name email"
          )
          .populate(
            "createdBy",
            "name email"
          );

      if (!conversation) {
        conversation =
          await Conversation.create({
            participants: [
              req.user._id,
              otherUser._id,
            ],

            type: "private",

            createdBy:
              req.user._id,

            name: "",
          });

        conversation =
          await conversation.populate(
            "participants",
            "name email"
          );
      }

      res.json({
        conversation,
      });
    } catch (error) {
      console.error(
        "Private conversation error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to create private conversation",
      });
    }
  }
);


/*
====================================================
CREATE GROUP
POST /api/conversations/group
====================================================
*/
router.post(
  "/group",
  protect,
  async (req, res) => {
    try {
      const {
        name,
        memberIds,
      } = req.body;

      if (
        !name ||
        !name.trim()
      ) {
        return res.status(400).json({
          message:
            "Group name is required",
        });
      }

      if (
        !Array.isArray(
          memberIds
        )
      ) {
        return res.status(400).json({
          message:
            "Group members are required",
        });
      }

      const cleanedMemberIds =
        [
          ...new Set(
            memberIds
              .map((id) =>
                id?.toString()
              )
              .filter(Boolean)
              .filter(
                (memberId) =>
                  memberId !==
                  req.user._id.toString()
              )
          ),
        ];

      if (
        cleanedMemberIds.length <
        1
      ) {
        return res.status(400).json({
          message:
            "Add at least one other member to create a group",
        });
      }

      const members =
        await User.find({
          _id: {
            $in:
              cleanedMemberIds,
          },
        }).select(
          "_id name email"
        );

      if (
        members.length !==
        cleanedMemberIds.length
      ) {
        return res.status(400).json({
          message:
            "One or more selected users could not be found",
        });
      }

      const conversation =
        await Conversation.create({
          participants: [
            req.user._id,
            ...members.map(
              (member) =>
                member._id
            ),
          ],

          type: "group",

          name:
            name.trim(),

          createdBy:
            req.user._id,
        });

      const populatedConversation =
        await conversation.populate([
          {
            path:
              "participants",
            select:
              "name email",
          },
          {
            path:
              "createdBy",
            select:
              "name email",
          },
        ]);

      res.status(201).json({
        conversation:
          populatedConversation,
      });
    } catch (error) {
      console.error(
        "Create group error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to create group",
      });
    }
  }
);


/*
====================================================
ADD MEMBER TO GROUP
POST /api/conversations/:id/members
====================================================
*/
router.post(
  "/:id/members",
  protect,
  async (req, res) => {
    try {
      const {
        userId,
      } = req.body;

      if (!userId) {
        return res.status(400).json({
          message:
            "User ID is required",
        });
      }

      const conversation =
        await Conversation.findById(
          req.params.id
        );

      if (!conversation) {
        return res.status(404).json({
          message:
            "Conversation not found",
        });
      }

      if (
        conversation.type !==
        "group"
      ) {
        return res.status(400).json({
          message:
            "This conversation is not a group",
        });
      }

      /*
       * Only group creator/admin can add members.
       */
      if (
        !conversation.createdBy ||
        conversation.createdBy.toString() !==
          req.user._id.toString()
      ) {
        return res.status(403).json({
          message:
            "Only the group admin can add members",
        });
      }

      /*
       * Cannot add yourself.
       */
      if (
        userId.toString() ===
        req.user._id.toString()
      ) {
        return res.status(400).json({
          message:
            "You are already a group member",
        });
      }

      /*
       * Check user exists.
       */
      const userToAdd =
        await User.findById(
          userId
        ).select(
          "_id name email"
        );

      if (!userToAdd) {
        return res.status(404).json({
          message:
            "User not found",
        });
      }

      /*
       * Check if already member.
       */
      const alreadyMember =
        conversation.participants.some(
          (participantId) =>
            participantId.toString() ===
            userId.toString()
        );

      if (alreadyMember) {
        return res.status(400).json({
          message:
            "User is already a member of this group",
        });
      }

      conversation.participants.push(
        userToAdd._id
      );

      conversation.updatedAt =
        new Date();

      await conversation.save();

      const populatedConversation =
        await conversation.populate([
          {
            path:
              "participants",
            select:
              "name email",
          },
          {
            path:
              "createdBy",
            select:
              "name email",
          },
        ]);

      /*
       * Notify existing group members.
       */
      const io =
        req.app.get("io");

      if (io) {
        io.to(
          `conversation:${conversation._id}`
        ).emit(
          "groupUpdated",
          {
            conversation:
              populatedConversation,
          }
        );

        /*
         * Notify the newly added user's
         * currently connected clients.
         */
        io.to(
          `user:${userToAdd._id.toString()}`
        ).emit(
          "groupAdded",
          {
            conversation:
              populatedConversation,
          }
        );
      }

      res.json({
        conversation:
          populatedConversation,
      });
    } catch (error) {
      console.error(
        "Add group member error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to add group member",
      });
    }
  }
);


/*
====================================================
REMOVE MEMBER FROM GROUP
DELETE /api/conversations/:id/members/:userId
====================================================
*/
router.delete(
  "/:id/members/:userId",
  protect,
  async (req, res) => {
    try {
      const conversation =
        await Conversation.findById(
          req.params.id
        );

      if (!conversation) {
        return res.status(404).json({
          message:
            "Conversation not found",
        });
      }

      if (
        conversation.type !==
        "group"
      ) {
        return res.status(400).json({
          message:
            "This conversation is not a group",
        });
      }

      /*
       * Only admin can remove members.
       */
      if (
        !conversation.createdBy ||
        conversation.createdBy.toString() !==
          req.user._id.toString()
      ) {
        return res.status(403).json({
          message:
            "Only the group admin can remove members",
        });
      }

      /*
       * Admin cannot remove themselves.
       */
      if (
        req.params.userId.toString() ===
        req.user._id.toString()
      ) {
        return res.status(400).json({
          message:
            "The group admin cannot remove themselves",
        });
      }

      const memberExists =
        conversation.participants.some(
          (participantId) =>
            participantId.toString() ===
            req.params.userId.toString()
        );

      if (!memberExists) {
        return res.status(404).json({
          message:
            "User is not a member of this group",
        });
      }

      conversation.participants =
        conversation.participants.filter(
          (participantId) =>
            participantId.toString() !==
            req.params.userId.toString()
        );

      conversation.updatedAt =
        new Date();

      await conversation.save();

      const populatedConversation =
        await conversation.populate([
          {
            path:
              "participants",
            select:
              "name email",
          },
          {
            path:
              "createdBy",
            select:
              "name email",
          },
        ]);

      const io =
        req.app.get("io");

      if (io) {
        /*
         * Tell remaining group members
         * about the update.
         */
        io.to(
          `conversation:${conversation._id}`
        ).emit(
          "groupUpdated",
          {
            conversation:
              populatedConversation,
          }
        );

        /*
         * Tell removed user.
         */
        io.to(
          `user:${req.params.userId.toString()}`
        ).emit(
          "groupMemberRemoved",
          {
            conversationId:
              conversation._id.toString(),
          }
        );

        /*
         * Remove all sockets belonging to the
         * removed user from the group room.
         */
        try {
          const sockets =
            await io
              .in(
                `user:${req.params.userId.toString()}`
              )
              .fetchSockets();

          for (
            const memberSocket of sockets
          ) {
            memberSocket.leave(
              `conversation:${conversation._id}`
            );
          }
        } catch (socketErr) {
          console.error(
            "Remove user from group socket room error:",
            socketErr.message
          );
        }
      }

      res.json({
        conversation:
          populatedConversation,
      });
    } catch (error) {
      console.error(
        "Remove group member error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to remove group member",
      });
    }
  }
);


/*
====================================================
RENAME GROUP
PUT /api/conversations/:id/name
====================================================
*/
router.put(
  "/:id/name",
  protect,
  async (req, res) => {
    try {
      const {
        name,
      } = req.body;

      if (
        !name ||
        !name.trim()
      ) {
        return res.status(400).json({
          message:
            "Group name is required",
        });
      }

      const conversation =
        await Conversation.findById(
          req.params.id
        );

      if (!conversation) {
        return res.status(404).json({
          message:
            "Conversation not found",
        });
      }

      if (
        conversation.type !==
        "group"
      ) {
        return res.status(400).json({
          message:
            "This conversation is not a group",
        });
      }

      /*
       * Only admin can rename.
       */
      if (
        !conversation.createdBy ||
        conversation.createdBy.toString() !==
          req.user._id.toString()
      ) {
        return res.status(403).json({
          message:
            "Only the group admin can rename the group",
        });
      }

      conversation.name =
        name.trim();

      conversation.updatedAt =
        new Date();

      await conversation.save();

      const populatedConversation =
        await conversation.populate([
          {
            path:
              "participants",
            select:
              "name email",
          },
          {
            path:
              "createdBy",
            select:
              "name email",
          },
        ]);

      const io =
        req.app.get("io");

      if (io) {
        io.to(
          `conversation:${conversation._id}`
        ).emit(
          "groupUpdated",
          {
            conversation:
              populatedConversation,
          }
        );
      }

      res.json({
        conversation:
          populatedConversation,
      });
    } catch (error) {
      console.error(
        "Rename group error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to rename group",
      });
    }
  }
);


/*
====================================================
LEAVE GROUP
POST /api/conversations/:id/leave
====================================================
*/
router.post(
  "/:id/leave",
  protect,
  async (req, res) => {
    try {
      const conversation =
        await Conversation.findById(
          req.params.id
        );

      if (!conversation) {
        return res.status(404).json({
          message:
            "Conversation not found",
        });
      }

      if (
        conversation.type !==
        "group"
      ) {
        return res.status(400).json({
          message:
            "This conversation is not a group",
        });
      }

      /*
       * Admin cannot leave yet.
       * We can add admin transfer later.
       */
      if (
        conversation.createdBy &&
        conversation.createdBy.toString() ===
          req.user._id.toString()
      ) {
        return res.status(400).json({
          message:
            "The group admin cannot leave the group yet. Transfer admin controls will be added later.",
        });
      }

      const isParticipant =
        conversation.participants.some(
          (participantId) =>
            participantId.toString() ===
            req.user._id.toString()
        );

      if (!isParticipant) {
        return res.status(400).json({
          message:
            "You are not a member of this group",
        });
      }

      conversation.participants =
        conversation.participants.filter(
          (participantId) =>
            participantId.toString() !==
            req.user._id.toString()
        );

      conversation.updatedAt =
        new Date();

      await conversation.save();

      const populatedConversation =
        await conversation.populate([
          {
            path:
              "participants",
            select:
              "name email",
          },
          {
            path:
              "createdBy",
            select:
              "name email",
          },
        ]);

      const io =
        req.app.get("io");

      if (io) {
        /*
         * Update remaining group members.
         */
        io.to(
          `conversation:${conversation._id}`
        ).emit(
          "groupUpdated",
          {
            conversation:
              populatedConversation,
          }
        );

        /*
         * Remove current user's sockets
         * from the group room.
         */
        try {
          const sockets =
            await io
              .in(
                `user:${req.user._id.toString()}`
              )
              .fetchSockets();

          for (
            const memberSocket of sockets
          ) {
            memberSocket.leave(
              `conversation:${conversation._id}`
            );
          }
        } catch (socketErr) {
          console.error(
            "Leave group socket cleanup error:",
            socketErr.message
          );
        }
      }

      res.json({
        success: true,
        conversation:
          populatedConversation,
      });
    } catch (error) {
      console.error(
        "Leave group error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to leave group",
      });
    }
  }
);


/*
====================================================
GET CONVERSATION + MESSAGES
GET /api/conversations/:id
====================================================
*/
router.get(
  "/:id",
  protect,
  async (req, res) => {
    try {
      const conversation =
        await Conversation.findById(
          req.params.id
        )
          .populate(
            "participants",
            "name email"
          )
          .populate(
            "createdBy",
            "name email"
          );

      if (!conversation) {
        return res.status(404).json({
          message:
            "Conversation not found",
        });
      }

      const isParticipant =
        conversation.participants.some(
          (participant) =>
            participant._id.toString() ===
            req.user._id.toString()
        );

      if (!isParticipant) {
        return res.status(403).json({
          message:
            "You are not a participant in this conversation",
        });
      }

      const messages =
        await Message.find({
          conversation:
            conversation._id,
        })
          .sort({
            createdAt: 1,
          })
          .limit(200)
          .populate(
            "sender",
            "name email"
          );

      res.json({
        conversation,
        messages,
      });
    } catch (error) {
      console.error(
        "Get conversation error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to load conversation",
      });
    }
  }
);


/*
====================================================
SEND MESSAGE USING REST
POST /api/conversations/:id/messages
====================================================
*/
router.post(
  "/:id/messages",
  protect,
  async (req, res) => {
    try {
      const {
        text,
      } = req.body;

      if (
        !text ||
        !text.trim()
      ) {
        return res.status(400).json({
          message:
            "Message cannot be empty",
        });
      }

      const conversation =
        await Conversation.findById(
          req.params.id
        );

      if (!conversation) {
        return res.status(404).json({
          message:
            "Conversation not found",
        });
      }

      const isParticipant =
        conversation.participants.some(
          (participantId) =>
            participantId.toString() ===
            req.user._id.toString()
        );

      if (!isParticipant) {
        return res.status(403).json({
          message:
            "You are not a participant in this conversation",
        });
      }

      const message =
        await Message.create({
          conversation:
            conversation._id,

          sender:
            req.user._id,

          senderName:
            req.user.name,

          text:
            text.trim(),

          isAI: false,
        });

      const populatedMessage =
        await message.populate(
          "sender",
          "name email"
        );

      res.status(201).json({
        message:
          populatedMessage,
      });
    } catch (error) {
      console.error(
        "Send conversation message error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to send message",
      });
    }
  }
);


module.exports = router;