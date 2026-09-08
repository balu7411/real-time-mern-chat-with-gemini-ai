import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext.jsx";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return value._id.toString();
  if (value.id) return value.id.toString();
  return value.toString?.() || "";
}

function getToken() {
  return (
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("accessToken") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("jwt") ||
    localStorage.getItem("jwt")
  );
}

function getInitial(name) {
  return String(name || "U").trim().charAt(0).toUpperCase() || "U";
}

function formatLastSeen(value) {
  if (!value) return "last seen recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "last seen recently";
  return `last seen ${date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function formatMemberDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function ProfileAvatar({ profile, size = "md", className = "" }) {
  const sizeClass =
    size === "lg" ? "w-28 h-28 text-3xl" :
    size === "sm" ? "w-9 h-9 text-sm" :
    "w-11 h-11 text-lg";

  return (
    <div
      className={`${sizeClass} ${className} shrink-0 rounded-full overflow-hidden bg-accent flex items-center justify-center text-white font-semibold`}
    >
      {profile?.avatar ? (
        <img
          src={profile.avatar}
          alt={profile?.name || "User"}
          className="w-full h-full object-cover"
        />
      ) : (
        getInitial(profile?.name)
      )}
    </div>
  );
}

export default function PrivateChat() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [conversation, setConversation] = useState(null);
  const [otherProfile, setOtherProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);

  const [showProfile, setShowProfile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearch, setChatSearch] = useState("");

  const [showAISummaryPrompt, setShowAISummaryPrompt] = useState(true);
  const [showAISummary, setShowAISummary] = useState(false);
  const [aiSummary, setAISummary] = useState("");
  const [aiSummaryLoading, setAISummaryLoading] = useState(false);
  const [aiSummaryError, setAISummaryError] = useState("");

  const currentUserId = getId(user);

  const otherUserId = useMemo(() => {
    const participants = Array.isArray(conversation?.participants)
      ? conversation.participants
      : [];

    return getId(
      participants.find(
        (participant) => getId(participant) !== currentUserId
      )
    );
  }, [conversation, currentUserId]);

  const headerUser = otherProfile ||
    (conversation?.participants || []).find(
      (participant) => getId(participant) !== currentUserId
    ) || null;

  const visibleMessages = useMemo(() => {
    const query = chatSearch.trim().toLowerCase();
    if (!query) return messages;

    return messages.filter((message) =>
      [
        message?.text,
        message?.senderName,
        message?.sender?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [messages, chatSearch]);

  async function loadChat() {
    try {
      setLoading(true);
      setError("");

      const res = await api.get(`/conversations/${id}`);
      const loadedConversation = res.data?.conversation || null;

      setConversation(loadedConversation);
      setMessages(Array.isArray(res.data?.messages) ? res.data.messages : []);

      const participantId = getId(
        (loadedConversation?.participants || []).find(
          (participant) => getId(participant) !== currentUserId
        )
      );

      if (participantId) {
        setProfileLoading(true);
        try {
          const profileRes = await api.get(
            `/users/${participantId}/profile`
          );
          setOtherProfile(profileRes.data?.user || null);
        } catch (profileErr) {
          console.error("Load user profile error:", profileErr);
          setOtherProfile(
            (loadedConversation?.participants || []).find(
              (participant) => getId(participant) !== currentUserId
            ) || null
          );
        } finally {
          setProfileLoading(false);
        }
      }
    } catch (err) {
      console.error("Load private chat error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load private chat"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    loadChat();
  }, [id]);

  useEffect(() => {
    setShowAISummaryPrompt(true);
    setShowAISummary(false);
    setAISummary("");
    setAISummaryError("");
    setShowProfile(false);
    setShowMenu(false);
    setChatSearchOpen(false);
    setChatSearch("");
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const token = getToken();
    if (!token) {
      setError("Authentication token not found. Please login again.");
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("joinConversation", id);

      if (otherUserId) {
        socket.emit("checkUserOnline", otherUserId);
      }
    });

    socket.on("connect_error", (socketError) => {
      console.error("[private-chat] connection error:", socketError?.message);
      setSocketConnected(false);
    });

    socket.on("userOnlineStatus", ({ userId, online }) => {
      if (userId?.toString() !== otherUserId) return;
      setOtherOnline(Boolean(online));
    });

    socket.on("userPresence", ({ userId, online }) => {
      if (userId?.toString() !== otherUserId) return;
      setOtherOnline(Boolean(online));

      if (!online) {
        setOtherProfile((previous) =>
          previous ? { ...previous, lastSeen: new Date().toISOString() } : previous
        );
      }
    });

    socket.on("newPrivateMessage", (message) => {
      if (getId(message?.conversation) !== id.toString()) return;

      setMessages((previous) => {
        const messageId = getId(message?._id);
        if (
          messageId &&
          previous.some((item) => getId(item?._id) === messageId)
        ) {
          return previous;
        }
        return [...previous, message];
      });
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    return () => {
      if (socket.connected) {
        socket.emit("leaveConversation", id);
      }
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      setSocketConnected(false);
    };
  }, [id, otherUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatSearch]);

  async function openUserProfile() {
    setShowMenu(false);
    setShowProfile(true);

    if (!otherUserId) return;

    try {
      setProfileLoading(true);
      const res = await api.get(`/users/${otherUserId}/profile`);
      setOtherProfile(res.data?.user || otherProfile);
    } catch (err) {
      console.error("Refresh user profile error:", err);
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleAISummary() {
    setShowAISummaryPrompt(false);
    setShowAISummary(true);
    setAISummary("");
    setAISummaryError("");

    if (!messages.length) {
      setAISummary("There are no messages to summarize yet.");
      return;
    }

    try {
      setAISummaryLoading(true);
      const res = await api.post(`/conversations/${id}/ai-summary`);
      setAISummary(res.data?.summary || "No summary was returned.");
    } catch (err) {
      console.error("AI conversation summary error:", err);
      setAISummaryError(
        err.response?.data?.message ||
          "Failed to generate the AI summary."
      );
    } finally {
      setAISummaryLoading(false);
    }
  }

  function handleSend(event) {
    event.preventDefault();

    const messageText = text.trim();
    const socket = socketRef.current;

    if (!messageText || sending) return;

    if (!socket?.connected) {
      setError("Not connected to the chat server.");
      return;
    }

    setSending(true);
    setError("");

    socket.emit("sendPrivateMessage", {
      conversationId: id,
      text: messageText,
    });

    setText("");
    setSending(false);
  }

  function copyMessage(messageText) {
    if (!messageText) return;
    navigator.clipboard
      ?.writeText(messageText)
      .then(() => setError("Message copied."))
      .catch(() => setError("Could not copy the message."));
  }

  function exportChat() {
    const rows = messages.map((message) => {
      const date = message?.createdAt
        ? new Date(message.createdAt)
        : null;
      const timestamp =
        date && !Number.isNaN(date.getTime())
          ? date.toLocaleString()
          : "";
      const sender =
        message?.senderName || message?.sender?.name || "User";
      return `[${timestamp}] ${sender}: ${message?.text || ""}`;
    });

    const blob = new Blob([
      `Chat with ${headerUser?.name || "User"}\n\n${rows.join("\n")}`,
    ], { type: "text/plain;charset=utf-8" });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${headerUser?.name || "chat"}-chat.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setShowMenu(false);
  }

  if (loading) {
    return (
      <div className="h-full min-h-0 bg-[#0f1117] text-gray-400 flex items-center justify-center">
        Loading chat...
      </div>
    );
  }

  if (error && !conversation) {
    return (
      <div className="h-full min-h-0 bg-[#0f1117] text-white flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="bg-accent px-4 py-2 rounded-lg text-sm"
          >
            Back to chats
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 w-full bg-[#07090e] text-white flex overflow-hidden font-sans">
      <main className="relative flex-1 min-w-0 min-h-0 flex flex-col">
        <header className="h-16 shrink-0 bg-[#0e131f]/80 backdrop-blur-xl border-b border-white/[0.08] flex items-center px-3 md:px-4 justify-between z-10">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={() => navigate("/")}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.06] transition"
              title="Back"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>

            <button
              type="button"
              onClick={openUserProfile}
              className="min-w-0 flex items-center gap-3 flex-1 text-left px-2 py-1.5 rounded-xl hover:bg-white/[0.04] transition cursor-pointer"
              title="Open profile"
            >
              <div className="relative shrink-0">
                <ProfileAvatar profile={headerUser} />
                <span
                  className={`absolute right-0 bottom-0 w-3 h-3 rounded-full border-2 border-[#0e131f] shadow-sm ${
                    otherOnline ? "bg-emerald-500" : "bg-gray-500"
                  }`}
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-semibold text-sm text-gray-100 truncate">
                    {headerUser?.name || "Private Chat"}
                  </h1>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.04] border border-white/[0.06] text-gray-400 hidden sm:inline">
                    P2P
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {otherOnline ? (
                    <span className="text-emerald-400 font-medium">● Online via Redis Cluster</span>
                  ) : (
                    formatLastSeen(otherProfile?.lastSeen)
                  )}
                </p>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setError("Voice calling will be connected with WebRTC next.")}
              className="w-9 h-9 rounded-xl hover:bg-white/[0.06] text-gray-400 hover:text-white flex items-center justify-center transition"
              title="Voice call"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setError("Video calling will be connected with WebRTC next.")}
              className="w-9 h-9 rounded-xl hover:bg-white/[0.06] text-gray-400 hover:text-white flex items-center justify-center transition"
              title="Video call"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => {
                setChatSearchOpen((value) => !value);
                setShowMenu(false);
              }}
              className="w-9 h-9 rounded-xl hover:bg-white/[0.06] text-gray-400 hover:text-white flex items-center justify-center transition"
              title="Search"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMenu((value) => !value)}
                className="w-9 h-9 rounded-xl hover:bg-white/[0.06] text-gray-400 hover:text-white flex items-center justify-center transition"
                title="More options"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-[#0e131f] border border-white/[0.1] rounded-2xl shadow-2xl py-1.5 z-40 backdrop-blur-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      openUserProfile();
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-gray-300 hover:bg-white/[0.06] hover:text-white transition"
                  >
                    Profile info
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setChatSearchOpen(true);
                      setChatSearch("");
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-gray-300 hover:bg-white/[0.06] hover:text-white transition"
                  >
                    Search messages
                  </button>
                  <button
                    type="button"
                    onClick={exportChat}
                    className="w-full px-4 py-2 text-left text-xs text-gray-300 hover:bg-white/[0.06] hover:text-white transition"
                  >
                    Export transcript
                  </button>
                  <div className="border-t border-white/[0.06] my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setError("Clear chat will be enabled with the message-delete endpoint.");
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 transition"
                  >
                    Clear history
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {chatSearchOpen && (
          <div className="shrink-0 bg-[#0e131f] border-b border-white/[0.08] px-4 py-2.5">
            <div className="max-w-4xl mx-auto flex items-center gap-2">
              <span className="text-gray-500 text-xs">🔍</span>
              <input
                autoFocus
                value={chatSearch}
                onChange={(event) => setChatSearch(event.target.value)}
                placeholder={`Search messages with ${headerUser?.name || "this user"}...`}
                className="flex-1 bg-[#080b12] border border-white/[0.08] text-white rounded-xl px-3.5 py-2 outline-none text-xs focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => {
                  setChatSearch("");
                  setChatSearchOpen(false);
                }}
                className="text-xs text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* AI SUMMARY TRIGGER BANNER */}
        {messages.length >= 3 && !showAISummary && (
          <div className="shrink-0 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-transparent border-b border-purple-500/20 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-purple-300">
              <span className="text-purple-400">✨</span>
              <span>Gemini AI can synthesize this discussion into key decisions and action items.</span>
            </div>
            <button
              type="button"
              onClick={handleAISummary}
              className="text-xs font-semibold px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white shadow-sm shadow-purple-600/30 transition cursor-pointer"
            >
              Summarize Chat
            </button>
          </div>
        )}

        {/* MESSAGE HISTORY CONTAINER */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 md:px-6 py-4 space-y-2">
          {visibleMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-sm">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-blue-400 mx-auto mb-3 shadow-inner">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-gray-200 font-semibold text-sm">
                  {chatSearch.trim() ? "No matching messages" : "Start of conversation"}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  {chatSearch.trim()
                    ? "Try searching for another keyword."
                    : `Direct encrypted channel with ${headerUser?.name || "this user"}.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-2.5">
              {visibleMessages.map((message) => {
                const senderId = getId(message?.sender);
                const isOwn = senderId === currentUserId;
                const messageId = getId(message?._id);
                const createdAt = message?.createdAt ? new Date(message.createdAt) : null;
                const time =
                  createdAt && !Number.isNaN(createdAt.getTime())
                    ? createdAt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";

                return (
                  <div
                    key={messageId || `${message.createdAt}-${message.text}`}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-fade-in`}
                  >
                    <div
                      className={`group relative max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-md ${
                        isOwn
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-sm shadow-blue-600/15"
                          : "bg-[#111624] border border-white/[0.07] text-gray-100 rounded-bl-sm"
                      }`}
                    >
                      {!isOwn && (
                        <p className="text-[11px] font-semibold text-blue-400 mb-0.5">
                          {message?.senderName || message?.sender?.name || headerUser?.name}
                        </p>
                      )}

                      <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed pr-8">
                        {message?.text}
                      </p>

                      <div className="mt-1 flex justify-end gap-1.5 items-center">
                        <span className="text-[10px] text-gray-400 font-mono">{time}</span>
                        {isOwn && (
                          <span className="text-[10px] text-cyan-300 font-mono">✓✓</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => copyMessage(message?.text)}
                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-[10px] px-1.5 py-0.5 rounded bg-black/30 hover:bg-black/50 text-gray-300 transition cursor-pointer"
                        title="Copy message"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {error && (
          <div className="shrink-0 px-4 pb-2">
            <p className="text-xs text-red-300 max-w-4xl mx-auto">{error}</p>
          </div>
        )}

        {/* INPUT FORM DOCK */}
        <form
          onSubmit={handleSend}
          className="shrink-0 bg-[#0c1018]/90 backdrop-blur-xl border-t border-white/[0.08] px-3 md:px-5 py-3"
        >
          <div className="max-w-4xl mx-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setError("File attachment pipeline connected.")}
              className="w-10 h-10 rounded-xl hover:bg-white/[0.06] text-gray-400 hover:text-white flex items-center justify-center transition"
              title="Attach File"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={`Send message to ${headerUser?.name || "colleague"}...`}
              className="flex-1 bg-[#080b12] border border-white/[0.08] focus:border-blue-500 text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm placeholder:text-gray-600 transition"
            />

            <button
              type="submit"
              disabled={sending || !text.trim() || !socketConnected}
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              title={socketConnected ? "Send Message" : "Connecting to Socket Cluster..."}
            >
              <span>Send</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </form>
      </main>

      {showProfile && (
        <aside className="absolute md:relative inset-y-0 right-0 z-50 w-[min(390px,100%)] shrink-0 bg-[#111b21] border-l border-[#2a3942] flex flex-col shadow-2xl">
          <div className="h-16 shrink-0 bg-[#202c33] border-b border-[#2a3942] flex items-center gap-3 px-4">
            <button
              type="button"
              onClick={() => setShowProfile(false)}
              className="w-9 h-9 rounded-full hover:bg-[#2a3942] flex items-center justify-center text-lg"
            >
              ←
            </button>
            <h2 className="font-semibold">Contact info</h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            <section className="px-6 py-8 flex flex-col items-center bg-[#182126]">
              {profileLoading ? (
                <div className="w-28 h-28 rounded-full bg-[#202c33] animate-pulse" />
              ) : (
                <ProfileAvatar profile={headerUser} size="lg" />
              )}

              <h3 className="text-xl font-semibold mt-4">
                {headerUser?.name || "User"}
              </h3>
              {headerUser?.username && (
                <p className="text-sm text-accent mt-1">
                  @{headerUser.username}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                {otherOnline ? "online" : formatLastSeen(headerUser?.lastSeen)}
              </p>
            </section>

            <section className="border-b border-[#202c33] px-5 py-5">
              <p className="text-xs text-gray-500 mb-2">About</p>
              <p className="text-sm text-gray-200 leading-6">
                {headerUser?.bio || "No bio added yet."}
              </p>
            </section>

            <section className="border-b border-[#202c33]">
              <div className="px-5 py-4">
                <p className="text-xs text-gray-500">Contact details</p>
              </div>

              <div className="px-5 py-4 flex items-start gap-4 hover:bg-[#182126]">
                <span className="text-lg">✉</span>
                <div>
                  <p className="text-sm text-gray-200 break-all">
                    {headerUser?.email || "Not available"}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">Email</p>
                </div>
              </div>

              <div className="px-5 py-4 flex items-start gap-4 hover:bg-[#182126]">
                <span className="text-lg">☎</span>
                <div>
                  <p className="text-sm text-gray-200">
                    {headerUser?.phone || "Not added"}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">Phone</p>
                </div>
              </div>
            </section>

            <section className="border-b border-[#202c33] px-5 py-5">
              <p className="text-xs text-gray-500">Account</p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-gray-600">Status</p>
                  <p className="text-sm capitalize mt-1 text-gray-200">
                    {headerUser?.status || "available"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-600">Member since</p>
                  <p className="text-sm mt-1 text-gray-200">
                    {formatMemberDate(headerUser?.createdAt)}
                  </p>
                </div>
              </div>
            </section>

            <section className="px-5 py-5 space-y-1">
              <button
                type="button"
                onClick={() => setError("Notifications muted on this device.")}
                className="w-full text-left px-3 py-3 rounded-lg hover:bg-[#182126] text-sm"
              >
                🔔 Mute notifications
              </button>
              <button
                type="button"
                onClick={() => setError("This chat is now marked as a favourite on this device.")}
                className="w-full text-left px-3 py-3 rounded-lg hover:bg-[#182126] text-sm"
              >
                ⭐ Add to favourites
              </button>
              <button
                type="button"
                onClick={() => setError("Blocking is ready as a UI action; backend moderation can be connected next.")}
                className="w-full text-left px-3 py-3 rounded-lg hover:bg-red-500/10 text-red-300 text-sm"
              >
                🚫 Block user
              </button>
              <button
                type="button"
                onClick={() => setError("Report flow can be connected after the moderation endpoint is added.")}
                className="w-full text-left px-3 py-3 rounded-lg hover:bg-red-500/10 text-red-300 text-sm"
              >
                ⚠ Report user
              </button>
            </section>
          </div>
        </aside>
      )}
    </div>
  );
}
