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

  const isPrivateChatRoute = location.pathname.startsWith("/private-chat/");
  const isGroupChatRoute = location.pathname.startsWith("/group-chat/");
  const hasOpenChat = isPrivateChatRoute || isGroupChatRoute;

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
  const [aiTechStack, setAITechStack] = useState("React + Node.js + Express + MongoDB");
  const [aiGenerating, setAIGenerating] = useState(false);

  async function loadConversations() {
    try {
      setChatLoading(true);
      setChatError("");
      const res = await api.get("/conversations");
      setConversations(res.data.conversations || []);
    } catch (err) {
      console.error("Load conversations error:", err);
      setChatError(err.response?.data?.message || "Could not load previous chats");
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
      setProjectError(err.response?.data?.message || "Could not load projects");
    } finally {
      setProjectsLoading(false);
    }
  }

  useEffect(() => {
    loadConversations();
    loadProjects();
  }, []);

  const privateChats = useMemo(() => {
    return conversations.filter((c) => c.type === "private");
  }, [conversations]);

  const groupChats = useMemo(() => {
    return conversations.filter((c) => c.type === "group");
  }, [conversations]);

  const filteredPrivateChats = useMemo(() => {
    if (!search.trim()) return privateChats;
    const q = search.toLowerCase();
    return privateChats.filter((chat) => {
      const otherUser = chat.participants?.find((p) => p._id !== user?._id);
      return (
        otherUser?.name?.toLowerCase().includes(q) ||
        otherUser?.email?.toLowerCase().includes(q)
      );
    });
  }, [privateChats, search, user]);

  const filteredGroupChats = useMemo(() => {
    if (!search.trim()) return groupChats;
    const q = search.toLowerCase();
    return groupChats.filter((chat) => chat.name?.toLowerCase().includes(q));
  }, [groupChats, search]);

  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    );
  }, [projects, search]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      setProjectError("");
      const res = await api.post("/projects", { name: newName.trim() });
      setShowModal(false);
      setNewName("");
      navigate(`/project/${res.data.project._id}`);
    } catch (err) {
      setProjectError(err.response?.data?.message || "Failed to create project");
    }
  }

  async function handleAIProject(e) {
    e.preventDefault();
    if (!aiProjectName.trim() || !aiDescription.trim()) {
      setProjectError("Project name and description are required");
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
      setProjectError(err.response?.data?.message || "Failed to generate project");
    } finally {
      setAIGenerating(false);
    }
  }

  return (
    <div className="h-screen bg-[#07090e] text-gray-100 flex flex-col overflow-hidden font-sans select-none">
      {/* ULTRA-PREMIUM GLASSMORPHIC TOP NAVIGATION */}
      <header className="h-16 px-4 md:px-6 bg-[#0c1017]/80 backdrop-blur-xl border-b border-white/[0.08] flex items-center justify-between z-30 shrink-0">
        {/* BRAND IDENTITY */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">OmniIDE</span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                AI Engine
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium">Real-Time Collaborative Mesh</p>
          </div>
        </div>

        {/* SYSTEM STATUS TELEMETRY PILL */}
        <div className="hidden lg:flex items-center gap-4 bg-white/[0.03] border border-white/[0.06] rounded-full px-4 py-1.5 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
            <span className="text-gray-300 font-medium">Redis 7 Cluster</span>
          </div>
          <span className="text-gray-600">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-300 font-medium">BullMQ Active</span>
          </div>
          <span className="text-gray-600">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-purple-400 font-medium">Gemini 1.5 Pro</span>
          </div>
        </div>

        {/* USER PROFILE & ACTIONS */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAIBuilder(true)}
            className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span>AI Architect</span>
          </button>

          {/* User Menu Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowHeaderMenu((prev) => !prev)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-white/[0.06] transition border border-transparent hover:border-white/[0.08]"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center font-bold text-white text-xs shadow-inner">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  getInitial(user?.name)
                )}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-semibold text-gray-200 leading-tight truncate max-w-[120px]">
                  {user?.name || "Explorer"}
                </div>
                <div className="text-[10px] text-gray-500 font-mono">
                  {user?.authProvider === "google" ? "Google SSO" : "Developer"}
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showHeaderMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0f141f] border border-white/[0.1] shadow-2xl overflow-hidden py-1 z-50 backdrop-blur-2xl">
                <div className="px-4 py-2.5 border-b border-white/[0.06]">
                  <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setShowHeaderMenu(false);
                    setShowNewChat(true);
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-white/[0.06] hover:text-white flex items-center gap-2.5 transition"
                >
                  <span>💬</span>
                  <span>New Discussion</span>
                </button>
                <button
                  onClick={() => {
                    setShowHeaderMenu(false);
                    setShowNewGroup(true);
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-white/[0.06] hover:text-white flex items-center gap-2.5 transition"
                >
                  <span>👥</span>
                  <span>Create Team Room</span>
                </button>
                <button
                  onClick={() => {
                    setShowHeaderMenu(false);
                    setShowModal(true);
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-white/[0.06] hover:text-white flex items-center gap-2.5 transition"
                >
                  <span>💻</span>
                  <span>New Workspace</span>
                </button>
                <div className="my-1 border-t border-white/[0.06]" />
                <button
                  onClick={() => {
                    setShowHeaderMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2.5 transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex min-h-0 relative">
        {/* SIDEBAR */}
        <aside
          className={`w-full md:w-[380px] lg:w-[410px] shrink-0 bg-[#090c13]/90 backdrop-blur-xl border-r border-white/[0.06] flex flex-col transition-all duration-300 ${
            hasOpenChat ? "hidden md:flex" : "flex"
          }`}
        >
          {/* SEARCH BOX */}
          <div className="p-3.5 border-b border-white/[0.06]">
            <div className="relative group">
              <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations or projects..."
                className="w-full bg-white/[0.04] hover:bg-white/[0.06] focus:bg-white/[0.07] border border-white/[0.08] focus:border-blue-500/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          {/* SEGMENTED CONTROL TABS */}
          <div className="px-3.5 py-2.5 border-b border-white/[0.06]">
            <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.04]">
              <button
                onClick={() => setActiveSection("private")}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeSection === "private"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]"
                }`}
              >
                <span>💬</span>
                <span>Direct</span>
              </button>

              <button
                onClick={() => setActiveSection("groups")}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeSection === "groups"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]"
                }`}
              >
                <span>👥</span>
                <span>Teams</span>
              </button>

              <button
                onClick={() => setActiveSection("projects")}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeSection === "projects"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]"
                }`}
              >
                <span>💻</span>
                <span>Projects</span>
              </button>
            </div>
          </div>

          {/* SECTION HEADER & QUICK ACTION */}
          <div className="px-4 py-2.5 flex items-center justify-between border-b border-white/[0.04] bg-white/[0.01]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              {activeSection === "private"
                ? "Direct Messages"
                : activeSection === "groups"
                ? "Team Workspaces"
                : "Code Repositories"}
            </span>

            {activeSection === "private" && (
              <button
                onClick={() => setShowNewChat(true)}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition"
              >
                <span>+ New Chat</span>
              </button>
            )}
            {activeSection === "groups" && (
              <button
                onClick={() => setShowNewGroup(true)}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition"
              >
                <span>+ New Group</span>
              </button>
            )}
            {activeSection === "projects" && (
              <button
                onClick={() => setShowModal(true)}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition"
              >
                <span>+ New Project</span>
              </button>
            )}
          </div>

          {/* LIST CONTAINER */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
            {activeSection === "projects" ? (
              projectsLoading ? (
                <div className="py-12 text-center text-xs text-gray-500">Loading workspaces...</div>
              ) : filteredProjects.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-2xl mb-3">
                    📁
                  </div>
                  <h4 className="text-sm font-semibold text-gray-300">No projects yet</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-[200px] mx-auto">
                    Create an interactive workspace or scaffold one with AI.
                  </p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="mt-4 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition"
                  >
                    Create Workspace
                  </button>
                </div>
              ) : (
                filteredProjects.map((project) => (
                  <button
                    key={project._id}
                    onClick={() => navigate(`/project/${project._id}`)}
                    className="w-full text-left p-3 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600/30 to-indigo-600/30 border border-blue-500/20 flex items-center justify-center text-sm shrink-0">
                        💻
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold text-gray-200 group-hover:text-blue-400 transition truncate">
                            {project.name}
                          </h4>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {project.status || "Active"}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          {project.description || "Interactive WebContainer sandbox"}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-500">
                          <span>{project.files?.length || 0} files</span>
                          <span>•</span>
                          <span>{project.collaborators?.length || 0} collaborators</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )
            ) : chatLoading ? (
              <div className="py-12 text-center text-xs text-gray-500">Loading conversations...</div>
            ) : (activeSection === "private" ? filteredPrivateChats : filteredGroupChats).length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-2xl mb-3">
                  💬
                </div>
                <h4 className="text-sm font-semibold text-gray-300">
                  {activeSection === "private" ? "No private chats yet" : "No team rooms yet"}
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-[200px] mx-auto">
                  {activeSection === "private"
                    ? "Start a direct conversation with a colleague."
                    : "Create a group room for your project team."}
                </p>
                <button
                  onClick={() => (activeSection === "private" ? setShowNewChat(true) : setShowNewGroup(true))}
                  className="mt-4 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition"
                >
                  {activeSection === "private" ? "Start Direct Chat" : "Create Team Room"}
                </button>
              </div>
            ) : (
              (activeSection === "private" ? filteredPrivateChats : filteredGroupChats).map((chat) => {
                const isGroup = chat.type === "group";
                const otherUser = !isGroup ? chat.participants?.find((p) => p._id !== user?._id) : null;
                const displayName = isGroup ? chat.name : otherUser?.name || "User";
                const lastMessage = chat.lastMessage;
                const isMine = lastMessage?.sender === user?._id;

                return (
                  <button
                    key={chat._id}
                    onClick={() =>
                      navigate(isGroup ? `/group-chat/${chat._id}` : `/private-chat/${chat._id}`)
                    }
                    className="w-full text-left p-2.5 rounded-xl border border-transparent hover:border-white/[0.08] hover:bg-white/[0.04] transition-all flex items-center gap-3 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-blue-500/20 border border-white/[0.1] flex items-center justify-center font-semibold text-xs text-blue-400 shrink-0">
                      {isGroup ? "👥" : getInitial(displayName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-semibold text-gray-200 group-hover:text-white truncate">
                          {displayName}
                        </h4>
                        <span className="text-[10px] text-gray-500 shrink-0">
                          {formatChatTime(lastMessage?.createdAt || chat.updatedAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {lastMessage ? (
                          <>
                            {isMine && <span className="text-blue-400">You: </span>}
                            {lastMessage.text}
                          </>
                        ) : (
                          <span className="text-gray-600 italic">No messages yet</span>
                        )}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT PANEL: CHAT ROUTE OR STUNNING COLLABORATIVE COMMAND CENTER */}
        <main
          className={`flex-1 min-w-0 bg-[#07090e] ${
            hasOpenChat ? "block" : "hidden md:flex flex-col items-center justify-center p-8 overflow-y-auto"
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
            /* ULTRA-MODERN COMMAND CENTER DASHBOARD HUB */
            <div className="max-w-3xl w-full my-auto space-y-8 animate-fade-in">
              {/* HERO BANNER */}
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium shadow-sm">
                  <span className="text-purple-400">✨</span>
                  <span>Collaborative Cloud IDE & Multi-Model AI Engine</span>
                </div>
                <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                  Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">{user?.name || "Developer"}</span>
                </h2>
                <p className="text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
                  Select an active conversation on the left, or jump straight into an AI-powered code workspace with live collaborative synchronization.
                </p>
              </div>

              {/* 4-ACTION QUICK LAUNCH GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. AI Project Architect */}
                <div
                  onClick={() => setShowAIBuilder(true)}
                  className="p-5 rounded-2xl bg-gradient-to-br from-[#121624] to-[#0c0f17] border border-purple-500/20 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-lg mb-3 group-hover:scale-110 transition-transform">
                    🤖
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                    AI Project Architect
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 leading-normal">
                    Prompt Gemini to generate a complete fullstack MERN project with live virtual files.
                  </p>
                  <div className="mt-3 flex items-center text-xs font-semibold text-purple-400 group-hover:translate-x-1 transition-transform">
                    <span>Scaffold Project &rarr;</span>
                  </div>
                </div>

                {/* 2. Monaco Workspace */}
                <div
                  onClick={() => setShowModal(true)}
                  className="p-5 rounded-2xl bg-gradient-to-br from-[#121624] to-[#0c0f17] border border-blue-500/20 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-lg mb-3 group-hover:scale-110 transition-transform">
                    💻
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                    New Code Workspace
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 leading-normal">
                    Launch an isolated Monaco editor & WebContainer sandbox with real-time peer sync.
                  </p>
                  <div className="mt-3 flex items-center text-xs font-semibold text-blue-400 group-hover:translate-x-1 transition-transform">
                    <span>Create Workspace &rarr;</span>
                  </div>
                </div>

                {/* 3. Direct Discussion */}
                <div
                  onClick={() => setShowNewChat(true)}
                  className="p-5 rounded-2xl bg-gradient-to-br from-[#121624] to-[#0c0f17] border border-emerald-500/20 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-lg mb-3 group-hover:scale-110 transition-transform">
                    💬
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Direct Discussion
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 leading-normal">
                    Start a real-time private channel with team members over Redis Pub/Sub.
                  </p>
                  <div className="mt-3 flex items-center text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
                    <span>Find Users &rarr;</span>
                  </div>
                </div>

                {/* 4. Team Room */}
                <div
                  onClick={() => setShowNewGroup(true)}
                  className="p-5 rounded-2xl bg-gradient-to-br from-[#121624] to-[#0c0f17] border border-cyan-500/20 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-lg mb-3 group-hover:scale-110 transition-transform">
                    👥
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    Team Workspace
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 leading-normal">
                    Assemble a multi-user collaborative group with live presence and code sharing.
                  </p>
                  <div className="mt-3 flex items-center text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
                    <span>Create Room &rarr;</span>
                  </div>
                </div>
              </div>

              {/* ARCHITECTURE METRICS STATUS BAR */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-gray-400">Stateless Socket Nodes:</span>
                  <span className="font-semibold text-gray-200">Clustered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-gray-400">Job Queues:</span>
                  <span className="font-semibold text-gray-200">BullMQ Distributed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-gray-400">AI Fallback:</span>
                  <span className="font-semibold text-gray-200">Gemini &bull; Claude &bull; GPT</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-gray-400">Memory Protocol:</span>
                  <span className="font-semibold text-emerald-400">Zero-Leak Disposed</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* NEW CHAT MODAL */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0e121a] border border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">Start New Discussion</h3>
                <p className="text-xs text-gray-400 mt-0.5">Search for users by name or email</p>
              </div>
              <button onClick={() => setShowNewChat(false)} className="text-gray-400 hover:text-white text-lg p-1">
                &times;
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0e121a] border border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">Create Team Room</h3>
                <p className="text-xs text-gray-400 mt-0.5">Assemble a project group for live collaboration</p>
              </div>
              <button onClick={() => setShowNewGroup(false)} className="text-gray-400 hover:text-white text-lg p-1">
                &times;
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

      {/* NEW PROJECT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreate}
            className="bg-[#0e121a] w-full max-w-sm p-6 rounded-2xl space-y-4 border border-white/[0.1] shadow-2xl"
          >
            <h3 className="font-bold text-lg text-white">New Code Workspace</h3>
            <p className="text-xs text-gray-400">Initialize a workspace sandbox for real-time collaboration</p>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. distributed-chat-engine"
              className="w-full bg-white/[0.05] border border-white/[0.1] text-white rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs rounded-xl bg-white/[0.05] text-gray-300 hover:bg-white/[0.1] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition shadow-md shadow-blue-600/20"
              >
                Create Workspace
              </button>
            </div>
          </form>
        </div>
      )}

      {/* AI PROJECT BUILDER MODAL */}
      {showAIBuilder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleAIProject}
            className="bg-[#0e121a] w-full max-w-lg p-6 rounded-2xl space-y-4 border border-purple-500/30 shadow-2xl shadow-purple-500/10"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">✨</span>
                <h3 className="font-bold text-lg text-white">AI Project Architect</h3>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Describe the system you want to build, and Gemini AI will scaffold files and structure automatically.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Project Name</label>
              <input
                value={aiProjectName}
                onChange={(e) => setAIProjectName(e.target.value)}
                placeholder="Realtime Task Management System"
                className="w-full bg-white/[0.05] border border-white/[0.1] text-white rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Specifications & Features</label>
              <textarea
                value={aiDescription}
                onChange={(e) => setAIDescription(e.target.value)}
                rows={5}
                placeholder="Create a fullstack application with user authentication, Kanban board, task assignment, and real-time status updates."
                className="w-full bg-white/[0.05] border border-white/[0.1] text-white rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Architecture Stack</label>
              <select
                value={aiTechStack}
                onChange={(e) => setAITechStack(e.target.value)}
                className="w-full bg-[#151a24] border border-white/[0.1] text-white rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-purple-500"
              >
                <option>React + Node.js + Express + MongoDB</option>
                <option>React + Vite + TailwindCSS</option>
                <option>HTML5 + Vanilla CSS + JavaScript</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAIBuilder(false)}
                disabled={aiGenerating}
                className="px-4 py-2 text-xs rounded-xl bg-white/[0.05] text-gray-300 hover:bg-white/[0.1] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={aiGenerating}
                className="px-5 py-2 text-xs rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold shadow-md shadow-purple-600/30 transition disabled:opacity-50 flex items-center gap-2"
              >
                {aiGenerating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating Architecture...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Scaffold Codebase</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
