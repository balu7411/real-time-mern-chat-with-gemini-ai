const express = require("express");

const {
  createProject,
  createAIProject,
  getProjects,
  getProject,
  addCollaborator,
  updateProject,
  getTasks,
  createTask,
  updateTask,
  getMeetings,
  createMeeting,
  getClientRequests,
  createClientRequest,
  updateClientRequest,
} = require("../controllers/projectController");

const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

// AI Project Builder
router.post("/ai-builder", createAIProject);

// Projects
router.post("/", createProject);
router.get("/", getProjects);
router.get("/:id", getProject);
router.patch("/:id", updateProject);

// Collaborators
router.post("/:id/collaborators", addCollaborator);

// Tasks
router.get("/:id/tasks", getTasks);
router.post("/:id/tasks", createTask);
router.patch("/:id/tasks/:taskId", updateTask);

// Meetings
router.get("/:id/meetings", getMeetings);
router.post("/:id/meetings", createMeeting);

// Client requests
router.get(
  "/:id/client-requests",
  getClientRequests
);

router.post(
  "/:id/client-requests",
  createClientRequest
);

router.patch(
  "/:id/client-requests/:requestId",
  updateClientRequest
);

module.exports = router;