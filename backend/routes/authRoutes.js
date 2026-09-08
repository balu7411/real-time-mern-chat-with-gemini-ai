const express = require("express");
const { register, login, googleAuth, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const { validateBody } = require("../src/core/validation/validateMiddleware");
const { registerSchema, loginSchema, googleAuthSchema } = require("../src/core/validation/schemas");

const router = express.Router();

router.post("/register", validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);
router.post("/google", validateBody(googleAuthSchema), googleAuth);
router.get("/me", protect, getMe);

module.exports = router;
