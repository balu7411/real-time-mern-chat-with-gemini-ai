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

  const model = genAI.getGenerativeModel({
    model:
      process.env.GEMINI_MODEL ||
      "gemini-3.6-flash",

    systemInstruction: `
You are an AI Project Builder inside a collaborative software development platform.

Your job is to generate a COMPLETE, SMALL, RUNNABLE software project from a user's description.

Return STRICT JSON only.

The JSON must have exactly this structure:

{
  "message": "short description of the generated project",
  "files": [
    {
      "path": "relative/path/to/file",
      "content": "complete file content"
    }
  ]
}

Rules:

1. Generate complete file contents.
2. Never use markdown code fences.
3. Never put explanations outside JSON.
4. All paths must be relative.
5. Never use absolute paths.
6. Never use ".." in file paths.
7. Keep the project reasonably small.
8. Generate clean and modular code.
9. Make the generated project runnable.
10. Include package.json when JavaScript/Node dependencies are required.
11. Include a README.md.
12. Do not include secrets, API keys or passwords.
13. Prefer modern React with Vite for frontend projects.
14. Use Node.js and Express for backend projects when backend functionality is required.
15. Use MongoDB/Mongoose when persistent database functionality is requested.
16. If the user asks for a frontend-only project, do not unnecessarily generate a backend.
17. Use meaningful filenames and folder structures.
18. Make sure imports match the generated file paths.
`,
  });

  const prompt = `
Build a project with the following information.

Project name:
${projectName}

Technology:
${techStack}

Project requirements:
${description}

Generate the complete project files now.
`;

  const result = await model.generateContent(prompt);

  const raw = result.response.text().trim();

  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  let parsed;

  try {
    parsed = JSON.parse(cleaned);
  } catch (error) {
    throw new Error(
      "Gemini returned invalid project JSON"
    );
  }

  if (
    !parsed ||
    !Array.isArray(parsed.files)
  ) {
    throw new Error(
      "Gemini returned an invalid project structure"
    );
  }

  return {
    message:
      parsed.message ||
      "Project generated successfully.",
    files: parsed.files,
  };
}

module.exports = {
  askGemini,
  buildProjectWithAI,
};