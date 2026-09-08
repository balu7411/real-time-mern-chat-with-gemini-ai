import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext.jsx";
import UserSearch from "../components/UserSearch.jsx";
import GroupCreator from "../components/GroupCreator.jsx";
import RetreatHero from "../components/RetreatHero.jsx";
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
  const [aiError, setAiError] = useState("");
  const [aiProgressStep, setAiProgressStep] = useState("");

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
    if (!aiProjectName.trim()) {
      setAiError("Please enter a project name");
      return;
    }
    if (!aiDescription.trim()) {
      setAiError("Please describe the specifications or features");
      return;
    }

    try {
      setAIGenerating(true);
      setAiError("");
      setAiProgressStep("Consulting Gemini AI Engine...");

      const timer1 = setTimeout(() => {
        setAiProgressStep("Designing architecture & component tree...");
      }, 2500);

      const timer2 = setTimeout(() => {
        setAiProgressStep("Generating code files & dependencies...");
      }, 5500);

      const res = await api.post("/projects/ai-builder", {
        projectName: aiProjectName.trim(),
        description: aiDescription.trim(),
        techStack: aiTechStack,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      setShowAIBuilder(false);
      setAIProjectName("");
      setAIDescription("");
      setAiProgressStep("");
      navigate(`/project/${res.data.project._id}`);
    } catch (err) {
      console.error("AI Builder generation error:", err);
      setAiError(err.response?.data?.message || "Failed to generate project. Please try again.");
    } finally {
      setAIGenerating(false);
      setAiProgressStep("");
    }
  }

  return (
    <div className="h-screen bg-[#0b0811] text-gray-100 flex flex-col overflow-hidden font-sans select-none">
      {/* ATMOSPHERIC TWILIGHT RETREAT TOP NAVIGATION */}
      <header className="h-16 px-4 md:px-8 bg-[#130f1c]/90 backdrop-blur-2xl border-b border-amber-500/15 flex items-center justify-between z-30 shrink-0">
        {/* BRAND IDENTITY */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 via-rose-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-amber-600/25 ring-1 ring-amber-400/30">
            <span className="text-amber-200 font-serif font-bold text-lg">✦</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-lg tracking-tight text-white">OmniIDE</span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25 rounded-full font-sans">
                Sanctuary
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium">Architectural Cloud Mesh</p>
          </div>
        </div>

        {/* EDITORIAL NAV LINKS (Directly reflecting reference design) */}
        <nav className="hidden xl:flex items-center gap-8 text-xs font-sans text-gray-300">
          <button onClick={() => setActiveSection("projects")} className="hover:text-amber-300 transition cursor-pointer">
            Architecture
          </button>
          <button onClick={() => setShowAIBuilder(true)} className="hover:text-amber-300 transition cursor-pointer">
            AI Mesh
          </button>
          <button onClick={() => setActiveSection("groups")} className="hover:text-amber-300 transition cursor-pointer">
            Workspaces
          </button>
          <button onClick={() => setActiveSection("private")} className="hover:text-amber-300 transition cursor-pointer">
            Direct
          </button>
        </nav>

        {/* SYSTEM STATUS TELEMETRY PILL */}
        <div className="hidden lg:flex items-center gap-4 bg-black/40 border border-amber-500/20 rounded-full px-4 py-1.5 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 text-xs">🔥</span>
            <span className="text-amber-200 font-medium">Redis 7 Clustered</span>
          </div>
          <span className="text-gray-600">•</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-gray-300 font-medium">BullMQ Active</span>
          </div>
          <span className="text-gray-600">•</span>
          <div className="flex items-center gap-1.5">
            <span className="text-purple-300 font-medium">Gemini 1.5 Pro</span>
          </div>
        </div>

        {/* USER PROFILE & ACTIONS */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAIBuilder(true)}
            className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#0b0811] text-xs font-bold shadow-md shadow-amber-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <span>✨ AI Architect</span>
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
          className={`w-full md:w-[380px] lg:w-[410px] shrink-0 bg-[#0e0915]/95 backdrop-blur-2xl border-r border-amber-500/10 flex flex-col transition-all duration-300 ${
            hasOpenChat ? "hidden md:flex" : "flex"
          }`}
        >
          {/* SEARCH BOX */}
          <div className="p-3.5 border-b border-white/[0.06]">
            <div className="relative group">
              <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations or projects..."
                className="w-full bg-white/[0.03] hover:bg-white/[0.05] focus:bg-[#140e1f] border border-white/[0.08] focus:border-amber-500/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          {/* SEGMENTED CONTROL TABS */}
          <div className="px-3.5 py-2.5 border-b border-white/[0.06]">
            <div className="grid grid-cols-3 gap-1 bg-black/50 p-1 rounded-xl border border-white/[0.05]">
              <button
                onClick={() => setActiveSection("private")}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeSection === "private"
                    ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-600/30"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]"
                }`}
              >
                <span>💬</span>
                <span>Direct</span>
              </button>

              <button
                onClick={() => setActiveSection("groups")}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeSection === "groups"
                    ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-600/30"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]"
                }`}
              >
                <span>👥</span>
                <span>Teams</span>
              </button>

              <button
                onClick={() => setActiveSection("projects")}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeSection === "projects"
                    ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-600/30"
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
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3 shadow-inner">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-200">No workspaces yet</h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                    Create an isolated Monaco sandbox or scaffold one with AI.
                  </p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition cursor-pointer"
                  >
                    + Create Workspace
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
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600/30 to-indigo-600/30 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
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
                <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3 shadow-inner">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold text-gray-200">
                  {activeSection === "private" ? "No discussions yet" : "No team rooms yet"}
                </h4>
                <p className="text-xs text-gray-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                  {activeSection === "private"
                    ? "Connect with team members via encrypted low-latency channels."
                    : "Create a group room for live code reviews and team sync."}
                </p>
                <button
                  onClick={() => (activeSection === "private" ? setShowNewChat(true) : setShowNewGroup(true))}
                  className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition cursor-pointer"
                >
                  {activeSection === "private" ? "+ Start Direct Chat" : "+ Create Team Room"}
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

        {/* RIGHT PANEL: CHAT ROUTE OR STUNNING RETREAT SANCTUARY COMMAND CENTER */}
        <main
          className={`flex-1 min-w-0 bg-[#0b0811] ${
            hasOpenChat ? "block" : "hidden md:flex flex-col items-center p-6 lg:p-8 overflow-y-auto"
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
            /* ARCHITECTURAL SANCTUARY COMMAND CENTER */
            <div className="max-w-5xl w-full my-auto space-y-8 animate-fade-in py-2">
              {/* RETREAT HERO SHOWCASE (Matching reference artwork) */}
              <RetreatHero
                user={user}
                onLaunchAI={() => setShowAIBuilder(true)}
                onLaunchWorkspace={() => setShowModal(true)}
                onNewChat={() => setShowNewChat(true)}
                onNewGroup={() => setShowNewGroup(true)}
              />

              {/* 4-ACTION CABIN WINDOW LAUNCH GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. AI Project Architect */}
                <div
                  onClick={() => setShowAIBuilder(true)}
                  className="p-5 rounded-2xl bg-[#140e1f]/90 border border-amber-500/25 hover:border-amber-400/60 hover:shadow-2xl hover:shadow-amber-500/15 transition-all duration-300 cursor-pointer group"
                >
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors flex items-center justify-between">
                    <span className="font-serif text-base">AI Project Architect</span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">Gemini 1.5 Pro</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                    Prompt Gemini to autonomously scaffold a fullstack MERN project with live virtual files.
                  </p>
                  <div className="mt-3.5 flex items-center text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
                    <span>Scaffold Project &rarr;</span>
                  </div>
                </div>

                {/* 2. Monaco Workspace */}
                <div
                  onClick={() => setShowModal(true)}
                  className="p-5 rounded-2xl bg-[#140e1f]/90 border border-indigo-500/25 hover:border-indigo-400/60 hover:shadow-2xl hover:shadow-indigo-500/15 transition-all duration-300 cursor-pointer group"
                >
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center justify-between">
                    <span className="font-serif text-base">New Code Workspace</span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">Monaco Sandbox</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                    Launch an isolated Monaco editor & WebContainer sandbox with real-time peer sync.
                  </p>
                  <div className="mt-3.5 flex items-center text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
                    <span>Create Workspace &rarr;</span>
                  </div>
                </div>

                {/* 3. Direct Discussion */}
                <div
                  onClick={() => setShowNewChat(true)}
                  className="p-5 rounded-2xl bg-[#140e1f]/90 border border-rose-500/25 hover:border-rose-400/60 hover:shadow-2xl hover:shadow-rose-500/15 transition-all duration-300 cursor-pointer group"
                >
                  <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3 group-hover:scale-110 group-hover:bg-rose-500/20 transition-all">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors flex items-center justify-between">
                    <span className="font-serif text-base">Direct Discussion</span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono">1-on-1 Encrypted</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                    Start a real-time private discussion with encrypted peer routing over Redis Pub/Sub.
                  </p>
                  <div className="mt-3.5 flex items-center text-xs font-semibold text-rose-400 group-hover:translate-x-1 transition-transform">
                    <span>Find Users &rarr;</span>
                  </div>
                </div>

                {/* 4. Team Room */}
                <div
                  onClick={() => setShowNewGroup(true)}
                  className="p-5 rounded-2xl bg-[#140e1f]/90 border border-amber-500/25 hover:border-amber-400/60 hover:shadow-2xl hover:shadow-amber-500/15 transition-all duration-300 cursor-pointer group"
                >
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors flex items-center justify-between">
                    <span className="font-serif text-base">Team Workspace</span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">Multi-Cursor</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                    Assemble a multi-user collaborative group room with live presence and code sharing.
                  </p>
                  <div className="mt-3.5 flex items-center text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
                    <span>Create Room &rarr;</span>
                  </div>
                </div>
              </div>

              {/* QUICK STARTER TEMPLATES */}
              <div className="flex items-center gap-2 flex-wrap justify-center text-xs text-gray-400">
                <span className="text-amber-400/80 font-semibold uppercase tracking-wider text-[10px]">Campfire Starters:</span>
                <button
                  onClick={() => {
                    setAIProjectName("Express-Mongo-API");
                    setAIDescription("Production ready REST API with JWT authentication and Mongoose models");
                    setAITechStack("Node.js + Express + MongoDB");
                    setShowAIBuilder(true);
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-white/[0.03] hover:bg-amber-500/10 border border-white/[0.08] hover:border-amber-500/30 text-gray-300 hover:text-amber-200 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="text-amber-400">⚡</span>
                  <span>Express + Mongo API</span>
                </button>
                <button
                  onClick={() => {
                    setAIProjectName("React19-Monaco-Mesh");
                    setAIDescription("Collaborative code editor sandbox with WebContainer runtime");
                    setAITechStack("React + Vite + Tailwind + WebContainer");
                    setShowAIBuilder(true);
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-white/[0.03] hover:bg-amber-500/10 border border-white/[0.08] hover:border-amber-500/30 text-gray-300 hover:text-amber-200 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="text-indigo-400">⚛️</span>
                  <span>React 19 + Monaco</span>
                </button>
                <button
                  onClick={() => {
                    setAIProjectName("Redis-PubSub-Cluster");
                    setAIDescription("Horizontally scaled Socket.IO microservice with BullMQ job queues");
                    setAITechStack("Node.js + Socket.IO + Redis 7 + BullMQ");
                    setShowAIBuilder(true);
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-white/[0.03] hover:bg-amber-500/10 border border-white/[0.08] hover:border-amber-500/30 text-gray-300 hover:text-amber-200 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="text-rose-400">🔄</span>
                  <span>Redis PubSub Mesh</span>
                </button>
              </div>

              {/* ARCHITECTURE METRICS STATUS BAR */}
              <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/15 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-gray-400">Stateless Socket Nodes:</span>
                  <span className="font-semibold text-gray-200">Clustered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-gray-400">Job Queues:</span>
                  <span className="font-semibold text-amber-200">BullMQ Distributed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="text-gray-400">AI Fallback:</span>
                  <span className="font-semibold text-gray-200">Gemini &bull; Claude &bull; GPT</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleAIProject}
            className="bg-[#130d1e]/95 w-full max-w-lg p-7 rounded-3xl space-y-4 border border-amber-500/30 shadow-2xl shadow-black/90 relative overflow-hidden"
          >
            {/* Top ambient ember glow */}
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 text-sm">
                    ✨
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-white">AI Project Architect</h3>
                    <p className="text-[11px] text-amber-200/60 font-mono">Autonomous MERN Code Engine</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAIBuilder(false)}
                  disabled={aiGenerating}
                  className="text-gray-400 hover:text-white p-1 text-base transition"
                >
                  &times;
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2.5 leading-relaxed">
                Describe the application you want to build. Gemini AI will autonomously scaffold complete, runnable code files and initialize an isolated workspace.
              </p>
            </div>

            {aiError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl p-3 flex items-start gap-2.5">
                <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="leading-relaxed">{aiError}</span>
              </div>
            )}

            {aiGenerating && aiProgressStep && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-xs text-amber-200">
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
                <span className="font-medium animate-pulse">{aiProgressStep}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Project Name</label>
              <input
                value={aiProjectName}
                onChange={(e) => setAIProjectName(e.target.value)}
                placeholder="e.g. Modern Calculator or Task Management API"
                className="w-full bg-[#0a0711]/90 border border-amber-500/20 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-500 placeholder:text-gray-600 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Specifications & Features</label>
              <textarea
                value={aiDescription}
                onChange={(e) => setAIDescription(e.target.value)}
                rows={4}
                placeholder="e.g. All arithmetic operations, calculation history, backspace, responsive dark UI with clean controls."
                className="w-full bg-[#0a0711]/90 border border-amber-500/20 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-500 placeholder:text-gray-600 resize-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Architecture Stack</label>
              <select
                value={aiTechStack}
                onChange={(e) => setAITechStack(e.target.value)}
                className="w-full bg-[#0a0711] border border-amber-500/20 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-amber-400 transition"
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
                className="px-4 py-2 text-xs rounded-xl bg-white/[0.05] text-gray-300 hover:bg-white/[0.1] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={aiGenerating}
                className="px-5 py-2.5 text-xs rounded-xl bg-gradient-to-r from-amber-500 via-rose-600 to-purple-600 hover:from-amber-400 hover:via-rose-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-amber-500/20 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {aiGenerating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Scaffolding Architecture...</span>
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
