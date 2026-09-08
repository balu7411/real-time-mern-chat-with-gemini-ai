const express = require("express");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

function publicProfile(user) {
  return {
    _id: user._id,
    id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    phone: user.phone || "",
    avatar: user.avatar || "",
    bio: user.bio || "",
    status: user.status || "available",
    lastSeen: user.lastSeen || null,
    createdAt: user.createdAt || null,
  };
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user: publicProfile(user) });
  } catch (err) {
    console.error("[users] get own profile error:", err.message);
    return res.status(500).json({ message: "Failed to load profile" });
  }
});

router.put("/profile", protect, async (req, res) => {
  try {
    const { name, username, phone, avatar, bio, status } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Name cannot be empty" });
    }

    const update = {
      name: name.trim(),
      phone: String(phone || "").trim().slice(0, 30),
      avatar: String(avatar || ""),
      bio: String(bio || "").trim().slice(0, 160),
      status: ["available", "busy", "away", "offline"].includes(status)
        ? status
        : "available",
    };

    const normalizedUsername = normalizeUsername(username);

    if (!/^[a-z0-9._]{3,30}$/.test(normalizedUsername)) {
      return res.status(400).json({
        message:
          "Username must be 3-30 characters and use only letters, numbers, dots, or underscores",
      });
    }

    const usernameOwner = await User.findOne({
      username: normalizedUsername,
      _id: { $ne: req.user._id },
    });

    if (usernameOwner) {
      return res.status(409).json({
        message: "That username is already taken",
      });
    }

    update.username = normalizedUsername;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      update,
      { new: true, runValidators: true }
    );

    return res.json({
      message: "Profile updated successfully",
      user: publicProfile(user),
    });
  } catch (err) {
    console.error("[users] update profile error:", err.message);

    if (err?.code === 11000) {
      return res.status(409).json({ message: "That username is already taken" });
    }

    return res.status(500).json({ message: "Failed to update profile" });
  }
});

router.get("/:id/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "name username email phone avatar bio status lastSeen createdAt"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user: publicProfile(user) });
  } catch (err) {
    console.error("[users] get public profile error:", err.message);
    return res.status(500).json({ message: "Failed to load user profile" });
  }
});

module.exports = router;
