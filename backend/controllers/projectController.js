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
// AI PROJECT BUILDER
// POST /api/projects/ai-builder
// --------------------------------------------------

function generateScaffoldFiles(projectName, description, techStack) {
  const isCalc = /calc/i.test(projectName) || /calc/i.test(description);
  const isMern = /node|express|mongo/i.test(techStack);

  if (isCalc) {
    const files = [
      {
        path: "package.json",
        content: JSON.stringify(
          {
            name: projectName.toLowerCase().replace(/\s+/g, "-"),
            version: "1.0.0",
            private: true,
            scripts: {
              dev: "vite",
              build: "vite build",
              preview: "vite preview",
              ...(isMern ? { start: "node server.js" } : {}),
            },
            dependencies: {
              react: "^18.2.0",
              "react-dom": "^18.2.0",
              ...(isMern ? { express: "^4.19.2", cors: "^2.8.5" } : {}),
            },
            devDependencies: {
              vite: "^5.0.0",
              "@vitejs/plugin-react": "^4.2.0",
            },
          },
          null,
          2
        ),
      },
      {
        path: "src/App.jsx",
        content: `import React, { useState } from 'react';

export default function App() {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [history, setHistory] = useState([]);

  function handleNumber(num) {
    setDisplay(prev => (prev === '0' ? String(num) : prev + num));
  }

  function handleOperator(op) {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  }

  function handleClear() {
    setDisplay('0');
    setEquation('');
  }

  function handleDecimal() {
    if (!display.includes('.')) {
      setDisplay(prev => prev + '.');
    }
  }

  function handleEquals() {
    if (!equation) return;
    try {
      const fullExpr = equation + display;
      const sanitized = fullExpr.replace(/[^0-9+\\-*\\/.]/g, '');
      const result = Function('"use strict";return (' + sanitized + ')')();
      const formatted = String(Number(result.toFixed(6)));
      setHistory(prev => [{ expr: fullExpr, result: formatted }, ...prev.slice(0, 9)]);
      setDisplay(formatted);
      setEquation('');
    } catch (err) {
      setDisplay('Error');
    }
  }

  return (
    <div className="calc-container">
      <div className="calc-card">
        <header className="calc-header">
          <h2>${projectName}</h2>
          <span className="badge">AI Scaffolded</span>
        </header>
        
        <div className="calc-screen">
          <div className="equation">{equation}</div>
          <div className="display">{display}</div>
        </div>

        <div className="calc-grid">
          <button onClick={handleClear} className="btn btn-fn">AC</button>
          <button onClick={() => setDisplay(prev => String(-Number(prev)))} className="btn btn-fn">±</button>
          <button onClick={() => setDisplay(prev => String(Number(prev) / 100))} className="btn btn-fn">%</button>
          <button onClick={() => handleOperator('/')} className="btn btn-op">÷</button>

          <button onClick={() => handleNumber(7)} className="btn">7</button>
          <button onClick={() => handleNumber(8)} className="btn">8</button>
          <button onClick={() => handleNumber(9)} className="btn">9</button>
          <button onClick={() => handleOperator('*')} className="btn btn-op">×</button>

          <button onClick={() => handleNumber(4)} className="btn">4</button>
          <button onClick={() => handleNumber(5)} className="btn">5</button>
          <button onClick={() => handleNumber(6)} className="btn">6</button>
          <button onClick={() => handleOperator('-')} className="btn btn-op">-</button>

          <button onClick={() => handleNumber(1)} className="btn">1</button>
          <button onClick={() => handleNumber(2)} className="btn">2</button>
          <button onClick={() => handleNumber(3)} className="btn">3</button>
          <button onClick={() => handleOperator('+')} className="btn btn-op">+</button>

          <button onClick={() => handleNumber(0)} className="btn btn-zero">0</button>
          <button onClick={handleDecimal} className="btn">.</button>
          <button onClick={handleEquals} className="btn btn-eq">=</button>
        </div>

        {history.length > 0 && (
          <div className="calc-history">
            <h4>Calculation History</h4>
            <ul>
              {history.map((h, i) => (
                <li key={i}>{h.expr} = <strong>{h.result}</strong></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}`,
      },
      {
        path: "src/main.jsx",
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
      },
      {
        path: "src/index.css",
        content: `body {
  margin: 0;
  background: #0c0814;
  color: #fff;
  font-family: system-ui, -apple-system, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}
.calc-container { width: 100%; max-width: 380px; padding: 20px; }
.calc-card { background: #140d1e; border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 24px; padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
.calc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.calc-header h2 { margin: 0; font-size: 16px; font-weight: 700; color: #f59e0b; }
.badge { font-size: 10px; background: rgba(245, 158, 11, 0.15); color: #fbbf24; padding: 2px 8px; border-radius: 999px; }
.calc-screen { background: #08050e; border-radius: 16px; padding: 16px; text-align: right; margin-bottom: 20px; min-height: 60px; }
.equation { font-size: 12px; color: #9ca3af; min-height: 16px; }
.display { font-size: 36px; font-weight: 700; color: #fff; }
.calc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); color: #fff; font-size: 18px; font-weight: 600; padding: 14px 0; border-radius: 12px; cursor: pointer; transition: all 0.15s; }
.btn:hover { background: rgba(255,255,255,0.12); transform: translateY(-1px); }
.btn-zero { grid-column: span 2; }
.btn-fn { background: rgba(234, 88, 12, 0.15); color: #fb923c; }
.btn-op { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.btn-eq { background: linear-gradient(135deg, #ea580c, #f59e0b); color: #fff; }
.calc-history { margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px; font-size: 12px; }
.calc-history h4 { margin: 0 0 8px 0; color: #9ca3af; font-size: 11px; text-transform: uppercase; }
.calc-history ul { list-style: none; padding: 0; margin: 0; max-height: 120px; overflow-y: auto; }
.calc-history li { padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.03); display: flex; justify-content: space-between; }`,
      },
      {
        path: "README.md",
        content: `# ${projectName}\n\n${description}\n\n## Architecture Stack\n${techStack}\n\n## Features\n- Addition, subtraction, multiplication, division\n- Clear and percentage operators\n- History tape\n- Responsive modern UI`,
      },
    ];

    if (isMern) {
      files.push({
        path: "server.js",
        content: `const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let calculationHistory = [];

app.get('/api/calculations', (req, res) => {
  res.json({ history: calculationHistory });
});

app.post('/api/calculations', (req, res) => {
  const { expr, result } = req.body;
  const entry = { id: Date.now(), expr, result, timestamp: new Date() };
  calculationHistory.unshift(entry);
  res.status(201).json({ entry });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));`,
      });
    }

    return files;
  }

  // General project template
  return [
    {
      path: "package.json",
      content: JSON.stringify(
        {
          name: projectName.toLowerCase().replace(/\s+/g, "-"),
          version: "1.0.0",
          private: true,
          scripts: { dev: "vite", build: "vite build" },
          dependencies: { react: "^18.2.0", "react-dom": "^18.2.0" },
          devDependencies: { vite: "^5.0.0", "@vitejs/plugin-react": "^4.2.0" },
        },
        null,
        2
      ),
    },
    {
      path: "src/App.jsx",
      content: `import React, { useState } from 'react';

export default function App() {
  const [items, setItems] = useState([
    { id: 1, title: 'Explore Architecture', done: true },
    { id: 2, title: 'Implement Features', done: false }
  ]);
  const [input, setInput] = useState('');

  function addItem(e) {
    e.preventDefault();
    if (!input.trim()) return;
    setItems([...items, { id: Date.now(), title: input.trim(), done: false }]);
    setInput('');
  }

  return (
    <div style={{ padding: 32, fontFamily: 'sans-serif', maxWidth: 600, margin: '0 auto' }}>
      <h1>${projectName}</h1>
      <p style={{ color: '#888' }}>${description}</p>
      
      <form onSubmit={addItem} style={{ display: 'flex', gap: 8, margin: '24px 0' }}>
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder="Add new task or entry..." 
          style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
        />
        <button type="submit" style={{ padding: '10px 18px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>
          Add
        </button>
      </form>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map(item => (
          <li key={item.id} style={{ padding: '12px 16px', background: '#181224', color: '#fff', borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>{item.title}</span>
            <input type="checkbox" checked={item.done} onChange={() => setItems(items.map(i => i.id === item.id ? { ...i, done: !i.done } : i))} />
          </li>
        ))}
      </ul>
    </div>
  );
}`,
    },
    {
      path: "src/main.jsx",
      content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
    },
    {
      path: "src/index.css",
      content: `body { margin: 0; background: #0c0814; color: #fff; }`,
    },
    {
      path: "README.md",
      content: `# ${projectName}\n\n${description}\n\nTech Stack: ${techStack}`,
    },
  ];
}

async function createAIProject(req, res) {
  try {
    const { projectName, description, techStack = "React + Node.js + Express + MongoDB" } = req.body;

    if (!projectName || !projectName.trim()) {
      return res.status(400).json({ message: "Project name is required" });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ message: "Project description is required" });
    }

    let files = [];
    let generationSummary = "Project generated successfully.";

    // 1. Try Gemini generation first
    try {
      const { buildProjectWithAI } = require("../services/aiService");
      const aiResult = await buildProjectWithAI({
        projectName: projectName.trim(),
        description: description.trim(),
        techStack,
      });

      if (aiResult && Array.isArray(aiResult.files) && aiResult.files.length > 0) {
        files = aiResult.files;
        generationSummary = aiResult.message || generationSummary;
      }
    } catch (aiErr) {
      console.warn("[projectController] Gemini generation fallback:", aiErr.message);
    }

    // 2. Intelligent Scaffolding Fallback
    if (!files || files.length === 0) {
      files = generateScaffoldFiles(projectName.trim(), description.trim(), techStack);
      generationSummary = `Project ${projectName.trim()} scaffolded with ${files.length} core architecture files.`;
    }

    // 3. Create Project in DB
    const project = await Project.create({
      name: projectName.trim(),
      description: description.trim(),
      owner: req.user._id,
      collaborators: [],
      files,
      priority: "High",
      status: "Active",
    });

    const populatedProject = await Project.findById(project._id)
      .populate("owner", "name email")
      .populate("collaborators", "name email");

    res.status(201).json({
      success: true,
      message: generationSummary,
      project: populatedProject,
    });
  } catch (err) {
    console.error("[projectController] createAIProject error:", err.message);
    res.status(500).json({
      message: err.message || "Failed to generate project",
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
  createAIProject,
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