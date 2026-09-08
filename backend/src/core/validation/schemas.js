const { z } = require("zod");

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  username: z
    .string()
    .trim()
    .regex(/^[a-z0-9._]{3,30}$/, "Username must be 3-30 lowercase alphanumeric, dots or underscores")
    .optional()
    .or(z.literal("")),
});

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

const googleAuthSchema = z.object({
  credential: z.string().min(10, "Google credential token must be valid"),
});

const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(100),
});

const saveFileSchema = z.object({
  name: z.string().trim().min(1, "File name is required"),
  content: z.string().default(""),
  path: z.string().default("/"),
  version: z.number().int().positive().optional(),
});

const socketChatMessageSchema = z.object({
  conversationId: z.string().min(1, "Conversation ID is required"),
  text: z.string().trim().min(1, "Message text cannot be empty").max(10000),
  clientTempId: z.string().optional(),
});

const aiPromptSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt is required").max(10000),
  conversationId: z.string().optional(),
  projectId: z.string().optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  createProjectSchema,
  saveFileSchema,
  socketChatMessageSchema,
  aiPromptSchema,
};
