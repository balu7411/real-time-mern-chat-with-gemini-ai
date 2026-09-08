import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function UserSearch({ onChatOpened }) {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(false);
  const [openingChat, setOpeningChat] =
    useState(null);

  const [error, setError] = useState("");

  // ==================================================
  // SEARCH USERS
  // ==================================================

  async function handleSearch(e) {
    const value = e.target.value;

    setQuery(value);
    setError("");

    if (!value.trim()) {
      setUsers([]);
      return;
    }

    try {
      setLoading(true);

      const res = await api.get(
        `/users/search?q=${encodeURIComponent(
          value
        )}`
      );

      setUsers(res.data || []);
    } catch (err) {
      console.error(
        "User search error:",
        err
      );

      setUsers([]);

      setError(
        err.response?.data?.message ||
          "Failed to search users"
      );
    } finally {
      setLoading(false);
    }
  }

  // ==================================================
  // OPEN CHAT
  // ==================================================

  async function handleChat(userId) {
    if (!userId) {
      return;
    }

    try {
      setOpeningChat(userId);
      setError("");

      const res =
        await api.post(
          "/conversations/private",
          {
            userId,
          }
        );

      const conversation =
        res.data?.conversation;

      if (!conversation?._id) {
        throw new Error(
          "Conversation ID was not returned"
        );
      }

      // Clear search
      setQuery("");
      setUsers([]);

      // If Dashboard provides callback,
      // open the chat inside Dashboard.
      if (onChatOpened) {
        onChatOpened(
          conversation._id
        );
      } else {
        // Fallback for other pages
        navigate(
          `/private-chat/${conversation._id}`
        );
      }
    } catch (err) {
      console.error(
        "Open private chat error:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to open private chat"
      );
    } finally {
      setOpeningChat(null);
    }
  }

  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="w-full">
      {/* SEARCH INPUT */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
          🔍
        </span>

        <input
          value={query}
          onChange={handleSearch}
          placeholder="Search by name or email..."
          autoFocus
          className="w-full bg-[#202c33] text-white rounded-xl py-3 pl-11 pr-4 outline-none border border-[#2a3942] focus:border-accent focus:ring-1 focus:ring-accent placeholder-gray-500"
        />
      </div>

      {/* ERROR */}
      {error && (
        <div className="mt-3">
          <p className="text-red-400 text-sm">
            {error}
          </p>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="py-6 text-center">
          <p className="text-gray-500 text-sm">
            Searching users...
          </p>
        </div>
      )}

      {/* RESULTS */}
      {!loading &&
        users.length > 0 && (
          <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-[#2a3942] overflow-hidden">
            {users.map((foundUser) => {
              const userId =
                foundUser._id ||
                foundUser.id;

              return (
                <div
                  key={userId}
                  className="flex items-center gap-3 px-4 py-3 bg-[#111b21] hover:bg-[#202c33] border-b border-[#202c33] last:border-b-0"
                >
                  {/* AVATAR */}
                  <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center text-white font-semibold shrink-0">
                    {foundUser.name
                      ?.charAt(0)
                      ?.toUpperCase() ||
                      "U"}
                  </div>

                  {/* USER INFO */}
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium truncate">
                      {foundUser.name ||
                        "Unknown user"}
                    </p>

                    <p className="text-gray-500 text-xs truncate mt-1">
                      {foundUser.email ||
                        ""}
                    </p>
                  </div>

                  {/* CHAT BUTTON */}
                  <button
                    onClick={() =>
                      handleChat(userId)
                    }
                    disabled={
                      openingChat ===
                      userId
                    }
                    className="shrink-0 bg-accent hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg"
                  >
                    {openingChat ===
                    userId
                      ? "Opening..."
                      : "Chat"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

      {/* NO RESULTS */}
      {!loading &&
        query.trim() &&
        users.length === 0 &&
        !error && (
          <div className="py-8 text-center">
            <div className="text-3xl mb-2">
              🔎
            </div>

            <p className="text-gray-400 text-sm">
              No users found
            </p>

            <p className="text-gray-600 text-xs mt-1">
              Try another name or email.
            </p>
          </div>
        )}

      {/* EMPTY STATE */}
      {!query.trim() && (
        <div className="py-8 text-center">
          <div className="text-3xl mb-2">
            👤
          </div>

          <p className="text-gray-400 text-sm">
            Search for a user
          </p>

          <p className="text-gray-600 text-xs mt-1">
            Enter a name or email to start a
            private chat.
          </p>
        </div>
      )}
    </div>
  );
}