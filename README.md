# Real-Time MERN Chat App with Gemini AI Integration

A working implementation of the project described in your report: a MERN-stack
(MongoDB, Express, React, Node.js) real-time chat app where team members
collaborate inside a project workspace, and can ask an embedded **Gemini AI**
assistant for help (explanations, code generation) by prefixing a message with
`@ai`. AI-generated code is saved as project files and shown in a file explorer.

## What's included

- **Auth**: register/login with JWT + bcrypt-hashed passwords
- **Projects**: create a project, add collaborators by email
- **Real-time chat**: Socket.io, messages persisted in MongoDB, live for all
  collaborators in a project room
- **`@ai` command**: forwards your prompt (plus the project's existing files)
  to Gemini; if Gemini returns code, it's saved into the project's file list
  and shown in the file explorer / code viewer pane
- **Docker Compose** setup for one-command local deployment

## Project structure

```
mern-ai-chat/
├── backend/
│   ├── config/db.js
│   ├── models/ (User, Project, Message)
│   ├── middleware/auth.js
│   ├── controllers/ (auth, project)
│   ├── routes/ (auth, project)
│   ├── services/aiService.js   <- Gemini API calls
│   ├── server.js               <- Express + Socket.io + @ai handling
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/axios.js
│   │   ├── context/AuthContext.jsx
│   │   ├── pages/ (Login, Register, Dashboard, ProjectWorkspace)
│   │   ├── components/ (ChatWindow, FileExplorer, CodeViewer, AddCollaboratorModal)
│   │   └── styles/index.css
│   ├── package.json
│   └── .env.example
└── docker-compose.yml
```

---

## 1. Prerequisites

Install these once on your machine:

- **Node.js** v18+ and npm — https://nodejs.org
- **MongoDB** — either install locally (https://www.mongodb.com/try/download/community)
  or use a free cloud database at https://www.mongodb.com/cloud/atlas
  (or just use the Docker option in step 5, which includes Mongo automatically)
- A **Gemini API key** — free at https://aistudio.google.com/apikey

---

## 2. Get the code ready

Unzip the project, then open a terminal in the `mern-ai-chat` folder.

---

## 3. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in:

```
MONGO_URI=mongodb://localhost:27017/mern-ai-chat   # or your Atlas connection string
JWT_SECRET=any_long_random_string
GEMINI_API_KEY=your_real_gemini_api_key
```

Start the backend:

```bash
npm run dev
```

You should see:
```
[db] MongoDB connected -> ...
[server] listening on http://localhost:5000
```

---

## 4. Frontend setup

Open a **second terminal**:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Vite will print a local URL — normally **http://localhost:5173**. Open it in your browser.

---

## 5. (Alternative) Run everything with Docker

If you have Docker + Docker Compose installed, you can skip steps 3–4 entirely:

```bash
cd mern-ai-chat
export JWT_SECRET=any_long_random_string
export GEMINI_API_KEY=your_real_gemini_api_key
docker compose up --build
```

This starts MongoDB, the backend, and the frontend together.
Visit **http://localhost:5173**.

---

## 6. Using the app

1. Go to `/register`, create an account.
2. On the Dashboard, click **+ New project** and give it a name.
3. Inside the project, use the chat box:
   - Normal messages are just broadcast to everyone in the project in real time.
   - Prefix a message with `@ai` to talk to Gemini, e.g.:
     - `@ai explain what this project does`
     - `@ai create a login page which takes input from the user`
     - `@ai add a home page listing south Indian food items`
   - If Gemini generates code, it appears instantly in the **Files** panel on
     the left; click a file to view its contents in the right-hand pane.
4. Click **+ Add collaborator** and enter another registered user's email to
   let them join the same project and chat in real time with you.

---

## 7. Common issues

| Problem | Fix |
|---|---|
| `MongoDB connection failed` | Make sure MongoDB is running locally, or that your Atlas URI/credentials in `.env` are correct |
| AI replies with an error message | Check `GEMINI_API_KEY` in `backend/.env` is set and valid |
| Frontend can't reach backend | Confirm `VITE_API_URL` / `VITE_SOCKET_URL` in `frontend/.env` point to where the backend is actually running |
| CORS errors in browser console | Make sure `CLIENT_URL` in `backend/.env` matches the URL you're opening the frontend at |

---

## 8. Notes on scope vs. the original report

This build implements the **core working system**: auth, real-time chat,
projects/collaborators, and `@ai`-driven code generation with a file
explorer — matching the flowchart, pseudocode, and screenshots in your
report. Features mentioned only in the abstract/objectives (sentiment
detection, AES end-to-end encryption, Redis caching, Docker-based horizontal
scaling, in-browser code *execution* via WebContainers) are **not** included —
they were flagged earlier as scope beyond what the screenshots show, and can
be added incrementally:

- **Redis caching** → add `ioredis`, cache project reads.
- **AES encryption** → encrypt `Message.text` before saving, decrypt on read.
- **Code execution in-browser** → integrate `@webcontainer/api` (StackBlitz) on
  the frontend to actually run generated Node files.
- **Sentiment detection** → have `aiService.js` ask Gemini to also return a
  `sentiment` field and store/display it.
