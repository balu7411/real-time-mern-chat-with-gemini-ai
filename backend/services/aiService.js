const { GoogleGenerativeAI } = require("@google/generative-ai");

let client = null;
function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in the environment");
  }
  if (!client) {
    client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return client;
}

// System instruction that steers Gemini toward the behaviour used in the
// project report: either a normal explanatory answer, OR one/more code files
// returned as strict JSON so the frontend can render them in the file explorer.
const SYSTEM_INSTRUCTION = `You are an AI pair-programmer embedded inside a real-time MERN team chat.
Team members send you messages prefixed with "@ai". You must reply helpfully.

Rules for your reply:
1. If the user is only asking a question, discussing an idea, or asking for an explanation,
   reply with plain, concise text (no JSON).
2. If the user asks you to create, add, or modify code/files, respond with STRICT JSON only,
   matching exactly this shape and nothing else (no markdown fences, no commentary outside the JSON):
   {
     "type": "files",
     "message": "one short sentence summarizing what you generated or changed",
     "files": [
       { "path": "relative/file/path.ext", "content": "full file contents as a string" }
     ]
   }
   - Reuse existing file paths when the user asks you to modify something that already exists.
   - Keep generated code clean, modular, and runnable.
3. Never include explanations before/after the JSON when returning files — the JSON must be the entire response.`;

/**
 * Calls Gemini with the user's prompt plus the project's current file tree
 * (so it can extend/modify existing files instead of only creating new ones).
 */
async function askGemini({ prompt, existingFiles = [] }) {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  const contextBlock =
    existingFiles.length > 0
      ? `Current project files (for context, modify these if relevant):\n${JSON.stringify(
          existingFiles,
          null,
          2
        )}`
      : "The project currently has no files yet.";

  const result = await model.generateContent(
    `${contextBlock}\n\nUser request: ${prompt}`
  );

  const raw = result.response.text().trim();

  // Try to parse as the structured "files" JSON contract; fall back to plain text.
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && parsed.type === "files" && Array.isArray(parsed.files)) {
      return {
        isFileResponse: true,
        message: parsed.message || "Files updated.",
        files: parsed.files,
      };
    }
  } catch (_) {
    // Not JSON -> treat as a normal text reply
  }

  return { isFileResponse: false, message: raw, files: [] };
}


async function buildProjectWithAI({
  projectName,
  description,
  techStack = "React + Node.js + Express + MongoDB",
}) {
  const genAI = getClient();
  const modelsToTry = [
    "gemini-flash-lite-latest",
    "gemini-3.5-flash",
    process.env.GEMINI_MODEL || "gemini-3.6-flash",
  ];

  const prompt = `
Build a software project with the following requirements:
Project Name: ${projectName}
Technology: ${techStack}
Requirements: ${description}

Generate clean, runnable code for the core application files.
`;

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
        },
        systemInstruction: `
You are an AI Project Builder inside a collaborative software development platform.
Generate a concise, clean, and runnable project based on the user's description.
Return STRICT JSON only matching this schema:
{
  "message": "short description of the project",
  "files": [
    { "path": "package.json", "content": "..." },
    { "path": "src/App.jsx", "content": "..." },
    { "path": "src/main.jsx", "content": "..." },
    { "path": "src/index.css", "content": "..." },
    { "path": "README.md", "content": "..." }
  ]
}
Include essential runnable code for 4 to 6 key files. Do not use markdown code fences. Keep files concise, functional, and self-contained.
`,
      });

      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout on model ${modelName}`)), 15000)
        ),
      ]);

      const raw = result.response.text().trim();
      const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/```$/i, "")
        .trim();

      const parsed = JSON.parse(cleaned);

      if (parsed && Array.isArray(parsed.files) && parsed.files.length > 0) {
        // Normalize file objects so they always have { path, content }
        const normalizedFiles = parsed.files.map((f) => ({
          path: f.path || f.name || f.filename || "file.txt",
          content: typeof f.content === "string" ? f.content : JSON.stringify(f.content || "", null, 2),
        }));

        return {
          message: parsed.message || "Project generated successfully.",
          files: normalizedFiles,
        };
      }
    } catch (err) {
      console.warn(`[aiService] model ${modelName} failed:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error("All AI models failed to generate project");
}

module.exports = {
  askGemini,
  buildProjectWithAI,
};