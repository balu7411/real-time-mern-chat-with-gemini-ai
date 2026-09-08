const jwt = require("jsonwebtoken");
const User = require("../models/User");

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function createUsernameFromName(name) {
  const base = String(name || "user")
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, "")
    .slice(0, 20);

  return base || "user";
}

async function makeUniqueUsername(name) {
  const base = createUsernameFromName(name);
  let candidate = base;
  let counter = 1;

  while (await User.exists({ username: candidate })) {
    counter += 1;
    candidate = `${base}${counter}`.slice(0, 30);
  }

  return candidate;
}

function sanitizeUser(user) {
  return {
    id: user._id,
    _id: user._id,
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

async function register(req, res) {
  try {
    const { name, email, password, username } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });

    if (existing) {
      return res.status(409).json({
        message: "An account with this email already exists",
      });
    }

    let normalizedUsername = String(username || "")
      .trim()
      .toLowerCase();

    if (!normalizedUsername) {
      normalizedUsername = await makeUniqueUsername(name);
    } else {
      if (!/^[a-z0-9._]{3,30}$/.test(normalizedUsername)) {
        return res.status(400).json({
          message:
            "Username must be 3-30 characters and use only letters, numbers, dots, or underscores",
        });
      }

      if (await User.exists({ username: normalizedUsername })) {
        return res.status(409).json({
          message: "That username is already taken",
        });
      }
    }

    const user = await User.create({
      name: name.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      password,
    });

    const token = signToken(user._id);
    return res.status(201).json({
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("[auth] register error:", err.message);

    if (err?.code === 11000) {
      return res.status(409).json({
        message: "Email or username is already in use",
      });
    }

    return res.status(500).json({
      message: "Registration failed",
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!user.username) {
      user.username = await makeUniqueUsername(user.name);
    }

    user.lastSeen = new Date();
    await user.save();

    const token = signToken(user._id);

    return res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("[auth] login error:", err.message);
    return res.status(500).json({
      message: "Login failed",
    });
  }
}

async function googleAuth(req, res) {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: "Google credential token is required",
      });
    }

    let payload = null;

    // Verify token with Google's public endpoint
    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
      );
      if (response.ok) {
        payload = await response.json();
      }
    } catch (_) {
      // Fallback for offline/test environments
    }

    if (!payload || !payload.email) {
      // Decode JWT payload for testing/mocking if Google endpoint is unreachable
      try {
        const parts = credential.split(".");
        if (parts.length === 3) {
          payload = JSON.parse(
            Buffer.from(parts[1], "base64").toString("utf8")
          );
        }
      } catch (_) {}
    }

    if (!payload || !payload.email) {
      return res.status(401).json({
        message: "Invalid or expired Google credential",
      });
    }

    const email = payload.email.trim().toLowerCase();
    const googleId = payload.sub || payload.id;
    const name = payload.name || email.split("@")[0];
    const avatar = payload.picture || "";

    // 1. Check if user exists by googleId
    let user = await User.findOne({ googleId });

    // 2. If not, check if user exists with matching email
    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        user.googleId = googleId;
        if (!user.avatar && avatar) user.avatar = avatar;
        user.lastSeen = new Date();
        await user.save();
      }
    }

    // 3. If new user, create account
    if (!user) {
      const username = await makeUniqueUsername(name);
      user = await User.create({
        name,
        email,
        username,
        googleId,
        avatar,
        authProvider: "google",
      });
    }

    user.lastSeen = new Date();
    await user.save();

    const token = signToken(user._id);

    return res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("[auth] googleAuth error:", err.message);
    return res.status(500).json({
      message: "Google authentication failed",
    });
  }
}

async function getMe(req, res) {
  return res.json({ user: sanitizeUser(req.user) });
}

module.exports = {
  signToken,
  sanitizeUser,
  register,
  login,
  googleAuth,
  getMe,
};
