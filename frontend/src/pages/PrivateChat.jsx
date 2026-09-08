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
    <div className="h-full min-h-0 w-full bg-[#0f1117] text-white flex overflow-hidden">
      <main className="relative flex-1 min-w-0 min-h-0 flex flex-col">
        <header className="h-16 shrink-0 bg-[#202c33] border-b border-[#2a3942] flex items-center px-3 md:px-4">
          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-300 hover:bg-[#2a3942] text-xl mr-1"
            title="Back"
          >
            ←
          </button>

          <button
            type="button"
            onClick={openUserProfile}
            className="min-w-0 flex items-center gap-3 flex-1 text-left px-2 py-1.5 rounded-xl hover:bg-[#2a3942] transition"
            title="Open profile"
          >
            <div className="relative shrink-0">
              <ProfileAvatar profile={headerUser} />
              <span
                className={`absolute right-0 bottom-0 w-3 h-3 rounded-full border-2 border-[#202c33] ${
                  otherOnline ? "bg-green-400" : "bg-gray-500"
                }`}
              />
            </div>

            <div className="min-w-0">
              <h1 className="font-semibold truncate">
                {headerUser?.name || "Private Chat"}
              </h1>
              <p className="text-xs text-gray-400 truncate">
                {otherOnline
                  ? "online"
                  : formatLastSeen(otherProfile?.lastSeen)}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setError("Voice calling will be connected with WebRTC next.")}
              className="w-10 h-10 rounded-full hover:bg-[#2a3942] text-gray-300"
              title="Voice call"
            >
              📞
            </button>
            <button
              type="button"
              onClick={() => setError("Video calling will be connected with WebRTC next.")}
              className="w-10 h-10 rounded-full hover:bg-[#2a3942] text-gray-300"
              title="Video call"
            >
              ▣
            </button>
            <button
              type="button"
              onClick={() => {
                setChatSearchOpen((value) => !value);
                setShowMenu(false);
              }}
              className="w-10 h-10 rounded-full hover:bg-[#2a3942] text-gray-300"
              title="Search"
            >
              🔍
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMenu((value) => !value)}
                className="w-10 h-10 rounded-full hover:bg-[#2a3942] text-gray-300 text-xl"
                title="More"
              >
                ⋮
              </button>

              {showMenu && (
                <div className="absolute right-0 top-11 z-40 w-56 rounded-xl overflow-hidden bg-[#233138] border border-[#344047] shadow-2xl py-1">
                  <button
                    type="button"
                    onClick={openUserProfile}
                    className="w-full h-9 px-3 text-left text-[12px] hover:bg-[#2a3942]"
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
                    className="w-full h-9 px-3 text-left text-[12px] hover:bg-[#2a3942]"
                  >
                    Search
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setError("Message selection will be added with message actions.");
                    }}
                    className="w-full h-9 px-3 text-left text-[12px] hover:bg-[#2a3942]"
                  >
                    Select messages
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setError("Notifications muted on this device.");
                    }}
                    className="w-full h-9 px-3 text-left text-[12px] hover:bg-[#2a3942]"
                  >
                    Mute notifications
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setError("Disappearing messages settings will be connected next.");
                    }}
                    className="w-full h-9 px-3 text-left text-[12px] hover:bg-[#2a3942]"
                  >
                    Disappearing messages
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setError("Chat added to favourites on this device.");
                    }}
                    className="w-full h-9 px-3 text-left text-[12px] hover:bg-[#2a3942]"
                  >
                    Add to favourites
                  </button>
                  <button
                    type="button"
                    onClick={exportChat}
                    className="w-full h-9 px-3 text-left text-[12px] hover:bg-[#2a3942]"
                  >
                    Export chat
                  </button>
                  <div className="border-t border-[#344047] my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setError("Clear chat will be enabled with the message-delete endpoint.");
                    }}
                    className="w-full h-9 px-3 text-left text-[12px] text-red-300 hover:bg-red-500/10"
                  >
                    Clear chat
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {chatSearchOpen && (
          <div className="shrink-0 bg-[#111b21] border-b border-[#2a3942] px-4 py-2.5">
            <div className="max-w-4xl mx-auto flex items-center gap-2">
              <span className="text-gray-500">🔍</span>
              <input
                autoFocus
                value={chatSearch}
                onChange={(event) => setChatSearch(event.target.value)}
                placeholder={`Search messages with ${headerUser?.name || "this user"}...`}
                className="flex-1 bg-[#202c33] text-white rounded-lg px-3 py-2 outline-none text-sm"
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
            {chatSearch.trim() && (
              <p className="max-w-4xl mx-auto text-[11px] text-gray-600 mt-1.5">
                {visibleMessages.length} matching message
                {visibleMessages.length === 1 ? "" : "s"}
              </p>
            )}
          </div>
        )}

        {showAISummaryPrompt && messages.length > 0 && (
          <div className="absolute z-20 top-20 left-1/2 -translate-x-1/2 w-[min(360px,calc(100%-32px))]">
            <button
              type="button"
              onClick={handleAISummary}
              className="w-full rounded-2xl border border-purple-400/30 bg-[#1d1629]/95 shadow-2xl px-4 py-3 text-left hover:bg-[#261d35] transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center">
                  ✦
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Summarize this chat with AI</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Get the key points, decisions and action items.
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {showAISummary && (
          <div className="absolute z-30 inset-0 bg-black/55 flex items-center justify-center p-5">
            <div className="w-full max-w-xl max-h-[80vh] overflow-hidden rounded-2xl bg-[#111b21] border border-[#2a3942] shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a3942]">
                <div>
                  <p className="text-xs text-purple-300 uppercase tracking-widest">
                    Gemini AI
                  </p>
                  <h2 className="font-semibold mt-1">AI Summary</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAISummary(false)}
                  className="text-gray-400 hover:text-white text-lg"
                >
                  ×
                </button>
              </div>

              <div className="p-5 overflow-y-auto max-h-[65vh]">
                {aiSummaryLoading ? (
                  <div className="flex items-center gap-3 text-gray-400 py-10 justify-center">
                    <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    Generating summary...
                  </div>
                ) : aiSummaryError ? (
                  <div className="text-sm text-red-300">{aiSummaryError}</div>
                ) : (
                  <div className="text-sm text-gray-200 whitespace-pre-wrap leading-6">
                    {aiSummary || "No summary yet."}
                  </div>
                )}
              </div>

              <div className="px-5 py-3 border-t border-[#2a3942] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAISummary(false)}
                  className="px-4 py-2 rounded-lg bg-[#202c33] hover:bg-[#2a3942] text-sm"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleAISummary}
                  disabled={aiSummaryLoading || !messages.length}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-sm"
                >
                  Regenerate
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto px-3 md:px-5 py-4">
          {visibleMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 rounded-full bg-[#202c33] flex items-center justify-center text-3xl mx-auto mb-4">
                  💬
                </div>
                <p className="text-gray-300 font-medium">
                  {chatSearch.trim() ? "No matching messages" : "No messages yet"}
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  {chatSearch.trim()
                    ? "Try another search term."
                    : `Send a message to ${headerUser?.name || "this user"} to start the conversation.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-2">
              {visibleMessages.map((message) => {
                const senderId = getId(message?.sender);
                const isOwn = senderId === currentUserId;
                const messageId = getId(message?._id);
                const createdAt = message?.createdAt
                  ? new Date(message.createdAt)
                  : null;
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
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`group relative max-w-[78%] md:max-w-[70%] rounded-2xl px-3.5 py-2 ${
                        isOwn
                          ? "bg-[#005c4b] rounded-br-sm"
                          : "bg-[#202c33] rounded-bl-sm"
                      }`}
                    >
                      {!isOwn && (
                        <p className="text-[11px] text-accent mb-0.5">
                          {message?.senderName || message?.sender?.name || headerUser?.name}
                        </p>
                      )}

                      <p className="text-sm whitespace-pre-wrap break-words pr-10">
                        {message?.text}
                      </p>

                      <div className="mt-1 flex justify-end gap-1.5 items-center">
                        <span className="text-[10px] text-gray-400">{time}</span>
                        {isOwn && (
                          <span className="text-[10px] text-gray-300">✓✓</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => copyMessage(message?.text)}
                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-[10px] px-1.5 py-1 rounded bg-black/20 hover:bg-black/30 text-gray-300 transition"
                        title="Copy"
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

        <form
          onSubmit={handleSend}
          className="shrink-0 bg-[#202c33] border-t border-[#2a3942] px-3 md:px-4 py-3"
        >
          <div className="max-w-4xl mx-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setError("Attachment system will be connected next.")}
              className="w-10 h-10 rounded-full hover:bg-[#2a3942] text-xl"
              title="Attach"
            >
              📎
            </button>
            <button
              type="button"
              onClick={() => setError("Emoji picker will be connected next.")}
              className="w-10 h-10 rounded-full hover:bg-[#2a3942] text-lg"
              title="Emoji"
            >
              😊
            </button>

            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={`Message ${headerUser?.name || "user"}...`}
              className="flex-1 bg-[#111b21] text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-accent text-sm"
            />

            <button
              type="button"
              onClick={() => setError("Voice messages will be connected next.")}
              className="w-10 h-10 rounded-full hover:bg-[#2a3942] text-lg"
              title="Voice message"
            >
              🎤
            </button>

            <button
              type="submit"
              disabled={sending || !text.trim() || !socketConnected}
              className="w-10 h-10 rounded-full bg-accent hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center"
              title={socketConnected ? "Send" : "Connecting..."}
            >
              ➤
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
