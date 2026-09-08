import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext.jsx";
import UserSearch from "../components/UserSearch.jsx";
import GroupCreator from "../components/GroupCreator.jsx";
import PrivateChat from "./PrivateChat.jsx";
import GroupChat from "./GroupChat.jsx";

function getInitial(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || "U";
}

function formatChatTime(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "2-digit",
  });
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isPrivateChatRoute =
    location.pathname.startsWith("/private-chat/");
  const isGroupChatRoute =
    location.pathname.startsWith("/group-chat/");
  const hasOpenChat =
    isPrivateChatRoute || isGroupChatRoute;

  const [conversations, setConversations] = useState([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState("");
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState("private");
  const [showNewChat, setShowNewChat] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectError, setProjectError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");

  const [showAIBuilder, setShowAIBuilder] = useState(false);
  const [aiProjectName, setAIProjectName] = useState("");
  const [aiDescription, setAIDescription] = useState("");
  const [aiTechStack, setAITechStack] = useState(
    "React + Node.js + Express + MongoDB"
  );
  const [aiGenerating, setAIGenerating] = useState(false);

  async function loadConversations() {
    try {
      setChatLoading(true);
      setChatError("");
      const res = await api.get("/conversations");
      setConversations(res.data.conversations || []);
    } catch (err) {
      console.error("Load conversations error:", err);
      setChatError(
        err.response?.data?.message || "Could not load previous chats"
      );
    } finally {
      setChatLoading(false);
    }
  }

  async function loadProjects() {
    try {
      setProjectsLoading(true);
      setProjectError("");
      const res = await api.get("/projects");
      setProjects(res.data.projects || []);
    } catch (err) {
      console.error("Load projects error:", err);
      setProjectError("Could not load projects");
    } finally {
      setProjectsLoading(false);
    }
  }

  useEffect(() => {
    if (isGroupChatRoute) {
      setActiveSection("groups");
    } else if (isPrivateChatRoute) {
      setActiveSection("private");
    }
  }, [isGroupChatRoute, isPrivateChatRoute]);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeSection === "projects") {
      loadProjects();
    }
  }, [activeSection]);

  const filteredConversations = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return conversations;

    return conversations.filter((chat) => {
      const name = chat.otherUser?.name || "";
      const email = chat.otherUser?.email || "";
      const lastText = chat.lastMessage?.text || "";

      return (
        name.toLowerCase().includes(value) ||
        email.toLowerCase().includes(value) ||
        lastText.toLowerCase().includes(value)
      );
    });
  }, [conversations, search]);

  const filteredPrivateConversations = useMemo(() => {
    return filteredConversations.filter(
      (chat) => chat.type !== "group"
    );
  }, [filteredConversations]);

  const filteredGroupConversations = useMemo(() => {
    return filteredConversations.filter(
      (chat) => chat.type === "group"
    );
  }, [filteredConversations]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      const res = await api.post("/projects", {
        name: newName.trim(),
      });

      setShowModal(false);
      setNewName("");
      setActiveSection("projects");
      loadProjects();
      navigate(`/project/${res.data.project._id}`);
    } catch (err) {
      setProjectError(
        err.response?.data?.message || "Failed to create project"
      );
    }
  }

  async function handleAIProject(e) {
    e.preventDefault();

    if (!aiProjectName.trim()) {
      setProjectError("Project name is required");
      return;
    }

    if (!aiDescription.trim()) {
      setProjectError("Project description is required");
      return;
    }

    try {
      setAIGenerating(true);
      setProjectError("");

      const res = await api.post("/projects/ai-builder", {
        projectName: aiProjectName.trim(),
        description: aiDescription.trim(),
        techStack: aiTechStack,
      });

      setShowAIBuilder(false);
      setAIProjectName("");
      setAIDescription("");
      navigate(`/project/${res.data.project._id}`);
    } catch (err) {
      setProjectError(
        err.response?.data?.message || "Failed to generate project"
      );
    } finally {
      setAIGenerating(false);
    }
  }

  return (
    <div className="h-screen bg-[#0b141a] text-white overflow-hidden">
      {/* TOP BAR */}
      <header className="h-16 bg-[#202c33] border-b border-[#2a3942] flex items-center px-4 md:px-6 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold shrink-0">
            {getInitial(user?.name)}
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold truncate">Chat</h1>
            <p className="text-xs text-gray-400 truncate">
              {user?.name || "User"}
            </p>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowHeaderMenu((value) => !value)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-2xl leading-none text-gray-300 hover:bg-[#2a3942] transition"
              title="More"
              aria-label="More options"
            >
              ⋮
            </button>

            {showHeaderMenu && (
              <div className="absolute left-0 top-10 z-[90] w-52 rounded-xl bg-[#202c33] border border-[#2a3942] shadow-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setShowHeaderMenu(false);
                    setShowNewChat(true);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-100 hover:bg-[#2a3942] transition"
                >
                  ✚&nbsp;&nbsp; New chat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowHeaderMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-100 hover:bg-[#2a3942] transition"
                >
                  ↪&nbsp;&nbsp; Log out
                </button>
              </div>
            )}
          </div>
        </div>


      </header>

      <div className="h-[calc(100vh-4rem)] min-h-0 flex">
        {/* LEFT CHAT LIST */}
        <aside
          className={`w-full md:w-[380px] lg:w-[420px] shrink-0 bg-[#111b21] border-r border-[#2a3942] flex flex-col ${
            hasOpenChat ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="p-4 border-b border-[#202c33]">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                🔍
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chats"
                className="w-full bg-[#202c33] rounded-xl py-3 pl-11 pr-4 text-[15px] text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* SECTION NAVIGATION */}
          <div className="px-3 py-3 border-b border-[#202c33]">
            <div className="grid grid-cols-3 gap-1 bg-[#202c33] rounded-xl p-1">
              <button
                onClick={() => setActiveSection("private")}
                className={`px-2 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
                  activeSection === "private"
                    ? "bg-accent text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                💬 Private Chats
              </button>

              <button
                onClick={() => setActiveSection("groups")}
                className={`px-2 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
                  activeSection === "groups"
                    ? "bg-accent text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                👥 Groups
              </button>

              <button
                onClick={() => {
                  setActiveSection("projects");
                }}
                className={`px-2 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
                  activeSection === "projects"
                    ? "bg-accent text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                📁 Projects
              </button>
            </div>
          </div>

          {/* SECTION TITLE / ACTION */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-[#202c33]">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {activeSection === "private"
                ? "Private Chats"
                : activeSection === "groups"
                ? "Groups"
                : "Projects"}
            </div>

            {activeSection === "private" && (
              <button
                onClick={() => setShowNewChat(true)}
                className="text-xs text-accent hover:text-white transition"
              >
                + New
              </button>
            )}

            {activeSection === "groups" && (
              <button
                onClick={() => setShowNewGroup(true)}
                className="text-xs text-accent hover:text-white transition"
              >
                + New
              </button>
            )}

            {activeSection === "projects" && (
              <button
                onClick={() => setShowModal(true)}
                className="text-xs text-accent hover:text-white transition"
              >
                + New Project
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeSection === "projects" ? (
              <div className="p-3">
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex-1 bg-accent hover:bg-blue-600 px-3 py-2 rounded-lg text-sm font-medium transition"
                  >
                    + New Project
                  </button>
                  <button
                    onClick={() => setShowAIBuilder(true)}
                    className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-sm font-medium transition"
                    title="AI Project Builder"
                  >
                    🤖
                  </button>
                </div>

                {projectError && (
                  <p className="text-red-400 text-xs px-2 py-2">
                    {projectError}
                  </p>
                )}

                {projectsLoading ? (
                  <div className="px-2 py-8 text-center text-gray-500 text-sm">
                    Loading projects...
                  </div>
                ) : projects.length === 0 ? (
                  <div className="px-2 py-10 text-center">
                    <div className="text-4xl mb-3">📁</div>
                    <p className="text-gray-300 font-medium">
                      No projects yet
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Create your first project workspace.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {projects.map((project) => (
                      <button
                        key={project._id}
                        onClick={() => navigate(`/project/${project._id}`)}
                        className="w-full text-left px-3 py-3 rounded-xl border border-[#202c33] bg-[#151f25] hover:bg-[#202c33] hover:border-[#344650] transition"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#24343d] flex items-center justify-center text-lg shrink-0">
                            📁
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="font-medium text-sm truncate">
                                {project.name}
                              </h3>
                              <span className="text-[10px] text-gray-600 shrink-0">
                                {project.collaborators?.length || 0} members
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 truncate">
                              {project.description || "Project workspace"}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-600">
                              <span>{project.files?.length || 0} files</span>
                              <span>•</span>
                              <span>{project.status || "Planning"}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : chatLoading ? (
              <div className="px-5 py-10 text-center text-gray-500 text-sm">
                Loading...
              </div>
            ) : chatError ? (
              <div className="px-5 py-10 text-center">
                <p className="text-red-400 text-sm mb-3">
                  {chatError}
                </p>
                <button
                  onClick={loadConversations}
                  className="text-accent text-sm hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : (
              (() => {
                const list =
                  activeSection === "private"
                    ? filteredPrivateConversations
                    : filteredGroupConversations;

                if (list.length === 0) {
                  return (
                    <div className="px-5 py-12 text-center">
                      <div className="text-4xl mb-3">
                        {activeSection === "groups" ? "👥" : "💬"}
                      </div>

                      <p className="text-gray-300 font-medium">
                        {search
                          ? `No ${
                              activeSection === "groups"
                                ? "groups"
                                : "private chats"
                            } found`
                          : activeSection === "groups"
                          ? "No groups yet"
                          : "No private chats yet"}
                      </p>

                      <p className="text-gray-500 text-sm mt-1">
                        {search
                          ? "Try another search."
                          : activeSection === "groups"
                          ? "Create a group to start collaborating."
                          : "Start a new private chat."}
                      </p>

                      {!search && (
                        <button
                          onClick={() =>
                            activeSection === "groups"
                              ? setShowNewGroup(true)
                              : setShowNewChat(true)
                          }
                          className="mt-4 bg-accent hover:bg-blue-600 px-4 py-2 rounded-lg text-sm"
                        >
                          {activeSection === "groups"
                            ? "Create group"
                            : "Start new chat"}
                        </button>
                      )}
                    </div>
                  );
                }

                return list.map((chat) => {
                  const isGroup =
                    chat.type === "group";

                  const displayName = isGroup
                    ? chat.name || "Unnamed Group"
                    : chat.otherUser?.name || "Unknown user";

                  const avatarLetter = getInitial(
                    displayName
                  );

                  const lastMessage =
                    chat.lastMessage;

                  const senderId =
                    lastMessage?.sender?._id ||
                    lastMessage?.sender?.id ||
                    lastMessage?.sender;

                  const currentUserId =
                    user?._id || user?.id;

                  const isMine =
                    senderId?.toString() ===
                    currentUserId?.toString();

                  return (
                    <button
                      key={chat._id}
                      onClick={() =>
                        navigate(
                          isGroup
                            ? `/group-chat/${chat._id}`
                            : `/private-chat/${chat._id}`
                        )
                      }
                      className="w-full text-left px-4 py-4 flex items-center gap-4 border-b border-[#202c33] hover:bg-[#202c33] transition"
                    >
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-white font-semibold text-xl">
                          {isGroup ? "👥" : avatarLetter}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-medium truncate">
                            {displayName}
                          </h3>

                          <span className="text-[11px] text-gray-500 shrink-0">
                            {formatChatTime(
                              lastMessage?.createdAt ||
                                chat.updatedAt ||
                                chat.createdAt
                            )}
                          </span>
                        </div>

                        <p className="text-sm text-gray-500 truncate mt-1">
                          {lastMessage ? (
                            <>
                              {isGroup && (
                                <span className="text-gray-400">
                                  {lastMessage.senderName
                                    ? `${lastMessage.senderName}: `
                                    : ""}
                                </span>
                              )}

                              {!isGroup && isMine && (
                                <span className="text-gray-400">
                                  You:{" "}
                                </span>
                              )}

                              {lastMessage.text ||
                                "Message"}
                            </>
                          ) : (
                            "No messages yet"
                          )}
                        </p>
                      </div>
                    </button>
                  );
                });
              })()
            )}
          </div>
        </aside>

        {/* RIGHT CHAT AREA */}
        <main
          className={`flex-1 min-w-0 bg-[#0b141a] ${
            hasOpenChat
              ? "block"
              : "hidden md:flex items-center justify-center relative"
          }`}
        >
          {isPrivateChatRoute ? (
            <div className="h-full w-full min-h-0">
              <PrivateChat />
            </div>
          ) : isGroupChatRoute ? (
            <div className="h-full w-full min-h-0">
              <GroupChat />
            </div>
          ) : (
            <div className="text-center max-w-md px-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-[#202c33] flex items-center justify-center text-5xl mb-6">
                💬
              </div>

              <h2 className="text-2xl font-semibold text-gray-200">
                Select a chat
              </h2>

              <p className="text-gray-500 mt-2 text-sm leading-6">
                Choose a conversation from the left to continue messaging.
                Your previous chats will stay here like a normal messenger.
              </p>

              <div className="mt-6 text-xs text-gray-600">
                Real-Time MERN Chat + Gemini AI
              </div>
            </div>
          )}
        </main>
      </div>

      {/* NEW CHAT MODAL */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#111b21] border border-[#2a3942] rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-[#2a3942] flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg">New Chat</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Find a user and start a private conversation.
                </p>
              </div>
              <button
                onClick={() => setShowNewChat(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            <div className="p-5">
              <UserSearch />
            </div>
          </div>
        </div>
      )}

      {/* NEW GROUP MODAL */}
      {showNewGroup && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#111b21] border border-[#2a3942] rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-[#2a3942] flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg">
                  Create Group
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Create a group and add your team members.
                </p>
              </div>

              <button
                onClick={() => setShowNewGroup(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            <div className="p-5">
              <GroupCreator
                onGroupCreated={(conversationId) => {
                  setShowNewGroup(false);
                  setActiveSection("groups");
                  loadConversations();
                  navigate(`/group-chat/${conversationId}`);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* NORMAL PROJECT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <form
            onSubmit={handleCreate}
            className="bg-[#202c33] w-full max-w-sm p-6 rounded-xl space-y-4 border border-[#2a3942]"
          >
            <h3 className="font-semibold text-lg">Create New Project</h3>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project Name"
              className="w-full bg-[#111b21] text-white rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm rounded-lg bg-[#2a3942] text-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm rounded-lg bg-accent text-white"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* AI PROJECT BUILDER */}
      {showAIBuilder && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4">
          <form
            onSubmit={handleAIProject}
            className="bg-[#202c33] w-full max-w-lg p-6 rounded-xl space-y-5 border border-[#2a3942]"
          >
            <div>
              <h3 className="font-semibold text-xl">🤖 AI Project Builder</h3>
              <p className="text-gray-500 text-sm mt-1">
                Describe your application and Gemini will create the project files for you.
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Project Name
              </label>
              <input
                value={aiProjectName}
                onChange={(e) => setAIProjectName(e.target.value)}
                placeholder="Student Management System"
                className="w-full bg-[#111b21] text-white rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">
                What do you want to build?
              </label>
              <textarea
                value={aiDescription}
                onChange={(e) => setAIDescription(e.target.value)}
                rows={6}
                placeholder="Create a student management system with login, dashboard, student registration, student list and CRUD operations."
                className="w-full bg-[#111b21] text-white rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Technology
              </label>
              <select
                value={aiTechStack}
                onChange={(e) => setAITechStack(e.target.value)}
                className="w-full bg-[#111b21] text-white rounded-lg px-3 py-2.5 outline-none"
              >
                <option>React + Node.js + Express + MongoDB</option>
                <option>React + JavaScript</option>
                <option>HTML + CSS + JavaScript</option>
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAIBuilder(false)}
                disabled={aiGenerating}
                className="px-4 py-2 text-sm rounded-lg bg-[#2a3942] text-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={aiGenerating}
                className="px-5 py-2 text-sm rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium"
              >
                {aiGenerating ? "🤖 Generating..." : "✨ Generate Project"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
