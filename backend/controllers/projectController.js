const Project = require("../models/Project");
const User = require("../models/User");
const Message = require("../models/Message");
const Task = require("../models/Task");
const Meeting = require("../models/Meeting");
const ClientRequest = require("../models/ClientRequest");

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function getId(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  return (
    value._id?.toString() ||
    value.id?.toString() ||
    value.toString?.() ||
    ""
  );
}

function isProjectMember(project, userId) {
  const currentUserId = getId(userId);

  const ownerId = getId(project.owner);

  if (ownerId === currentUserId) {
    return true;
  }

  return (
    project.collaborators?.some(
      (collaborator) =>
        getId(collaborator) === currentUserId
    ) || false
  );
}

async function findProjectForMember(
  projectId,
  userId
) {
  const project = await Project.findById(
    projectId
  );

  if (!project) {
    return {
      project: null,
      error: {
        status: 404,
        message: "Project not found",
      },
    };
  }

  if (!isProjectMember(project, userId)) {
    return {
      project: null,
      error: {
        status: 403,
        message:
          "You do not have access to this project",
      },
    };
  }

  return {
    project,
    error: null,
  };
}

// --------------------------------------------------
// CREATE PROJECT
// POST /api/projects
// --------------------------------------------------

async function createProject(req, res) {
  try {
    const {
      name,
      description = "",
      priority = "Medium",
      status = "Planning",
      startDate = null,
      dueDate = null,
      sourceGroup = null,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Project name is required",
      });
    }

    const project = await Project.create({
      name: name.trim(),
      description:
        description?.trim() || "",
      owner: req.user._id,
      collaborators: [],
      files: [],
      priority,
      status,
      startDate: startDate || null,
      dueDate: dueDate || null,
      sourceGroup: sourceGroup || null,
    });

    const populatedProject =
      await Project.findById(project._id)
        .populate("owner", "name email")
        .populate(
          "collaborators",
          "name email"
        );

    res.status(201).json({
      project: populatedProject,
    });
  } catch (err) {
    console.error(
      "[project] create error:",
      err.message
    );

    res.status(500).json({
      message: "Failed to create project",
    });
  }
}

// --------------------------------------------------
// GET PROJECTS
// GET /api/projects
// --------------------------------------------------

async function getProjects(req, res) {
  try {
    const projects = await Project.find({
      $or: [
        {
          owner: req.user._id,
        },
        {
          collaborators: req.user._id,
        },
      ],
    })
      .populate("owner", "name email")
      .populate(
        "collaborators",
        "name email"
      )
      .sort({
        updatedAt: -1,
      });

    res.json({
      projects,
    });
  } catch (err) {
    console.error(
      "[project] list error:",
      err.message
    );

    res.status(500).json({
      message: "Failed to fetch projects",
    });
  }
}

// --------------------------------------------------
// GET PROJECT
// GET /api/projects/:id
// --------------------------------------------------

async function getProject(req, res) {
  try {
    const { project, error } =
      await findProjectForMember(
        req.params.id,
        req.user._id
      );

    if (error) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    const populatedProject =
      await Project.findById(project._id)
        .populate("owner", "name email")
        .populate(
          "collaborators",
          "name email"
        );

    const messages =
      await Message.find({
        project: project._id,
      })
        .populate(
          "sender",
          "name email"
        )
        .sort({
          createdAt: 1,
        });

    res.json({
      project: populatedProject,
      messages,
    });
  } catch (err) {
    console.error(
      "[project] get error:",
      err.message
    );

    res.status(500).json({
      message: "Failed to fetch project",
    });
  }
}

// --------------------------------------------------
// UPDATE PROJECT
// PATCH /api/projects/:id
// --------------------------------------------------

async function updateProject(req, res) {
  try {
    const project =
      await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    if (
      !isProjectMember(
        project,
        req.user._id
      )
    ) {
      return res.status(403).json({
        message:
          "You do not have access to this project",
      });
    }

    const allowedFields = [
      "name",
      "description",
      "status",
      "priority",
      "startDate",
      "dueDate",
      "sourceGroup",
    ];

    for (const field of allowedFields) {
      if (
        req.body[field] !== undefined
      ) {
        project[field] =
          req.body[field];
      }
    }

    await project.save();

    const updatedProject =
      await Project.findById(
        project._id
      )
        .populate(
          "owner",
          "name email"
        )
        .populate(
          "collaborators",
          "name email"
        );

    res.json({
      project: updatedProject,
    });
  } catch (err) {
    console.error(
      "[project] update error:",
      err.message
    );

    res.status(500).json({
      message: "Failed to update project",
    });
  }
}

// --------------------------------------------------
// ADD COLLABORATOR
// POST /api/projects/:id/collaborators
// --------------------------------------------------

async function addCollaborator(req, res) {
  try {
    const { email } =
      req.body;

    if (!email) {
      return res.status(400).json({
        message:
          "Collaborator email is required",
      });
    }

    const project =
      await Project.findById(
        req.params.id
      );

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    if (
      !project.owner.equals(
        req.user._id
      )
    ) {
      return res.status(403).json({
        message:
          "Only the project owner can add collaborators",
      });
    }

    const collaborator =
      await User.findOne({
        email: email
          .toLowerCase()
          .trim(),
      });

    if (!collaborator) {
      return res.status(404).json({
        message:
          "No user found with that email",
      });
    }

    if (
      project.collaborators.some(
        (member) =>
          member.equals(
            collaborator._id
          )
      ) ||
      project.owner.equals(
        collaborator._id
      )
    ) {
      return res.status(409).json({
        message:
          "User is already part of this project",
      });
    }

    project.collaborators.push(
      collaborator._id
    );

    await project.save();

    const updated =
      await Project.findById(
        project._id
      )
        .populate(
          "owner",
          "name email"
        )
        .populate(
          "collaborators",
          "name email"
        );

    res.json({
      project: updated,
    });
  } catch (err) {
    console.error(
      "[project] add collaborator error:",
      err.message
    );

    res.status(500).json({
      message:
        "Failed to add collaborator",
    });
  }
}

// --------------------------------------------------
// GET TASKS
// GET /api/projects/:id/tasks
// --------------------------------------------------

async function getTasks(req, res) {
  try {
    const { project, error } =
      await findProjectForMember(
        req.params.id,
        req.user._id
      );

    if (error) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    const tasks =
      await Task.find({
        project: project._id,
      })
        .populate(
          "assignee",
          "name email"
        )
        .populate(
          "createdBy",
          "name email"
        )
        .sort({
          createdAt: -1,
        });

    res.json({
      tasks,
    });
  } catch (err) {
    console.error(
      "[task] list error:",
      err.message
    );

    res.status(500).json({
      message: "Failed to fetch tasks",
    });
  }
}

// --------------------------------------------------
// CREATE TASK
// POST /api/projects/:id/tasks
// --------------------------------------------------

async function createTask(req, res) {
  try {
    const { project, error } =
      await findProjectForMember(
        req.params.id,
        req.user._id
      );

    if (error) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    const {
      title,
      description = "",
      assignee = null,
      priority = "Medium",
      status = "Todo",
      dueDate = null,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: "Task title is required",
      });
    }

    if (
      assignee &&
      !project.collaborators.some(
        (member) =>
          member.equals(assignee)
      ) &&
      !project.owner.equals(
        assignee
      )
    ) {
      return res.status(400).json({
        message:
          "Assigned user is not a project member",
      });
    }

    const task =
      await Task.create({
        project: project._id,
        title: title.trim(),
        description:
          description?.trim() || "",
        assignee:
          assignee || null,
        priority,
        status,
        dueDate:
          dueDate || null,
        createdBy: req.user._id,
      });

    const populatedTask =
      await Task.findById(
        task._id
      )
        .populate(
          "assignee",
          "name email"
        )
        .populate(
          "createdBy",
          "name email"
        );

    res.status(201).json({
      task: populatedTask,
    });
  } catch (err) {
    console.error(
      "[task] create error:",
      err.message
    );

    res.status(500).json({
      message: "Failed to create task",
    });
  }
}

// --------------------------------------------------
// UPDATE TASK
// PATCH /api/projects/:id/tasks/:taskId
// --------------------------------------------------

async function updateTask(req, res) {
  try {
    const { project, error } =
      await findProjectForMember(
        req.params.id,
        req.user._id
      );

    if (error) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    const task =
      await Task.findOne({
        _id: req.params.taskId,
        project: project._id,
      });

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    if (
      req.body.assignee &&
      req.body.assignee !==
        "null" &&
      !project.collaborators.some(
        (member) =>
          member.equals(
            req.body.assignee
          )
      ) &&
      !project.owner.equals(
        req.body.assignee
      )
    ) {
      return res.status(400).json({
        message:
          "Assigned user is not a project member",
      });
    }

    const allowedFields = [
      "title",
      "description",
      "assignee",
      "priority",
      "status",
      "dueDate",
    ];

    for (const field of allowedFields) {
      if (
        req.body[field] !== undefined
      ) {
        task[field] =
          req.body[field];
      }
    }

    await task.save();

    const updatedTask =
      await Task.findById(
        task._id
      )
        .populate(
          "assignee",
          "name email"
        )
        .populate(
          "createdBy",
          "name email"
        );

    res.json({
      task: updatedTask,
    });
  } catch (err) {
    console.error(
      "[task] update error:",
      err.message
    );

    res.status(500).json({
      message: "Failed to update task",
    });
  }
}

// --------------------------------------------------
// GET MEETINGS
// GET /api/projects/:id/meetings
// --------------------------------------------------

async function getMeetings(req, res) {
  try {
    const { project, error } =
      await findProjectForMember(
        req.params.id,
        req.user._id
      );

    if (error) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    const meetings =
      await Meeting.find({
        project: project._id,
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
          startAt: 1,
        });

    res.json({
      meetings,
    });
  } catch (err) {
    console.error(
      "[meeting] list error:",
      err.message
    );

    res.status(500).json({
      message:
        "Failed to fetch meetings",
    });
  }
}

// --------------------------------------------------
// CREATE MEETING
// POST /api/projects/:id/meetings
// --------------------------------------------------

async function createMeeting(req, res) {
  try {
    const { project, error } =
      await findProjectForMember(
        req.params.id,
        req.user._id
      );

    if (error) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    const {
      title,
      description = "",
      startAt,
      endAt = null,
      participants = [],
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message:
          "Meeting title is required",
      });
    }

    if (!startAt) {
      return res.status(400).json({
        message:
          "Meeting date and time are required",
      });
    }

    const projectMemberIds = [
      getId(project.owner),
      ...(project.collaborators || []).map(
        getId
      ),
    ];

    const safeParticipants =
      [
        ...new Set(
          [
            req.user._id.toString(),
            ...participants.map(
              (participant) =>
                participant.toString()
            ),
          ].filter((participant) =>
            projectMemberIds.includes(
              participant
            )
          )
        ),
      ];

    const meeting =
      await Meeting.create({
        project: project._id,
        title: title.trim(),
        description:
          description?.trim() || "",
        startAt,
        endAt:
          endAt || null,
        participants:
          safeParticipants,
        createdBy:
          req.user._id,
      });

    const populatedMeeting =
      await Meeting.findById(
        meeting._id
      )
        .populate(
          "participants",
          "name email"
        )
        .populate(
          "createdBy",
          "name email"
        );

    res.status(201).json({
      meeting:
        populatedMeeting,
    });
  } catch (err) {
    console.error(
      "[meeting] create error:",
      err.message
    );

    res.status(500).json({
      message:
        "Failed to create meeting",
    });
  }
}

// --------------------------------------------------
// GET CLIENT REQUESTS
// GET /api/projects/:id/client-requests
// --------------------------------------------------

async function getClientRequests(
  req,
  res
) {
  try {
    const { project, error } =
      await findProjectForMember(
        req.params.id,
        req.user._id
      );

    if (error) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    const requests =
      await ClientRequest.find({
        project: project._id,
      })
        .populate(
          "assignedTo",
          "name email"
        )
        .populate(
          "createdBy",
          "name email"
        )
        .sort({
          createdAt: -1,
        });

    res.json({
      requests,
    });
  } catch (err) {
    console.error(
      "[client-request] list error:",
      err.message
    );

    res.status(500).json({
      message:
        "Failed to fetch client requests",
    });
  }
}

// --------------------------------------------------
// CREATE CLIENT REQUEST
// POST /api/projects/:id/client-requests
// --------------------------------------------------

async function createClientRequest(
  req,
  res
) {
  try {
    const { project, error } =
      await findProjectForMember(
        req.params.id,
        req.user._id
      );

    if (error) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    const {
      title,
      description = "",
      status = "Pending",
      priority = "Medium",
      requestedBy = "Client",
      assignedTo = null,
      dueDate = null,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message:
          "Client request title is required",
      });
    }

    if (
      assignedTo &&
      !project.collaborators.some(
        (member) =>
          member.equals(
            assignedTo
          )
      ) &&
      !project.owner.equals(
        assignedTo
      )
    ) {
      return res.status(400).json({
        message:
          "Assigned user is not a project member",
      });
    }

    const request =
      await ClientRequest.create({
        project: project._id,
        title: title.trim(),
        description:
          description?.trim() || "",
        status,
        priority,
        requestedBy:
          requestedBy?.trim() ||
          "Client",
        assignedTo:
          assignedTo || null,
        dueDate:
          dueDate || null,
        createdBy:
          req.user._id,
      });

    const populatedRequest =
      await ClientRequest.findById(
        request._id
      )
        .populate(
          "assignedTo",
          "name email"
        )
        .populate(
          "createdBy",
          "name email"
        );

    res.status(201).json({
      request:
        populatedRequest,
    });
  } catch (err) {
    console.error(
      "[client-request] create error:",
      err.message
    );

    res.status(500).json({
      message:
        "Failed to create client request",
    });
  }
}

// --------------------------------------------------
// UPDATE CLIENT REQUEST
// PATCH /api/projects/:id/client-requests/:requestId
// --------------------------------------------------

async function updateClientRequest(
  req,
  res
) {
  try {
    const { project, error } =
      await findProjectForMember(
        req.params.id,
        req.user._id
      );

    if (error) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    const request =
      await ClientRequest.findOne({
        _id: req.params.requestId,
        project: project._id,
      });

    if (!request) {
      return res.status(404).json({
        message:
          "Client request not found",
      });
    }

    if (
      req.body.assignedTo &&
      !project.collaborators.some(
        (member) =>
          member.equals(
            req.body.assignedTo
          )
      ) &&
      !project.owner.equals(
        req.body.assignedTo
      )
    ) {
      return res.status(400).json({
        message:
          "Assigned user is not a project member",
      });
    }

    const allowedFields = [
      "title",
      "description",
      "status",
      "priority",
      "requestedBy",
      "assignedTo",
      "dueDate",
    ];

    for (const field of allowedFields) {
      if (
        req.body[field] !== undefined
      ) {
        request[field] =
          req.body[field];
      }
    }

    await request.save();

    const updatedRequest =
      await ClientRequest.findById(
        request._id
      )
        .populate(
          "assignedTo",
          "name email"
        )
        .populate(
          "createdBy",
          "name email"
        );

    res.json({
      request:
        updatedRequest,
    });
  } catch (err) {
    console.error(
      "[client-request] update error:",
      err.message
    );

    res.status(500).json({
      message:
        "Failed to update client request",
    });
  }
}

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  addCollaborator,

  getTasks,
  createTask,
  updateTask,

  getMeetings,
  createMeeting,

  getClientRequests,
  createClientRequest,
  updateClientRequest,
};