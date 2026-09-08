import React, {
  useState,
} from "react";

import api from "../api/axios";

export default function GroupCreator({
  onGroupCreated,
}) {
  const [name, setName] =
    useState("");

  const [query, setQuery] =
    useState("");

  const [users, setUsers] =
    useState([]);

  const [selectedUsers, setSelectedUsers] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [searching, setSearching] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
   * =========================================================
   * SEARCH USERS
   * =========================================================
   */

  async function handleSearch(
    e
  ) {
    const value =
      e.target.value;

    setQuery(value);
    setError("");

    if (!value.trim()) {
      setUsers([]);
      return;
    }

    try {
      setSearching(true);

      const res =
        await api.get(
          `/users/search?q=${encodeURIComponent(
            value
          )}`
        );

      setUsers(
        Array.isArray(
          res.data
        )
          ? res.data
          : []
      );
    } catch (err) {
      console.error(
        "Group user search error:",
        err
      );

      setUsers([]);

      setError(
        err.response?.data?.message ||
          "Failed to search users"
      );
    } finally {
      setSearching(false);
    }
  }

  /*
   * =========================================================
   * SELECT / REMOVE MEMBER
   * =========================================================
   */

  function toggleUser(user) {
    if (!user?._id) {
      return;
    }

    setSelectedUsers(
      (previous) => {
        const exists =
          previous.some(
            (selected) =>
              selected._id ===
              user._id
          );

        if (exists) {
          return previous.filter(
            (selected) =>
              selected._id !==
              user._id
          );
        }

        return [
          ...previous,
          user,
        ];
      }
    );
  }

  /*
   * =========================================================
   * CREATE GROUP
   * =========================================================
   */

  async function handleCreate(
    e
  ) {
    e.preventDefault();

    if (!name.trim()) {
      setError(
        "Group name is required"
      );

      return;
    }

    if (
      selectedUsers.length ===
      0
    ) {
      setError(
        "Select at least one member"
      );

      return;
    }

    try {
      setLoading(true);
      setError("");

      const res =
        await api.post(
          "/conversations/group",
          {
            name:
              name.trim(),

            memberIds:
              selectedUsers.map(
                (member) =>
                  member._id
              ),
          }
        );

      const conversation =
        res.data?.conversation;

      if (
        !conversation?._id
      ) {
        throw new Error(
          "Group conversation was not returned"
        );
      }

      setName("");
      setQuery("");
      setUsers([]);
      setSelectedUsers([]);

      if (
        onGroupCreated
      ) {
        onGroupCreated(
          conversation._id
        );
      }
    } catch (err) {
      console.error(
        "Create group error:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to create group"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* ===================================================== */}
      {/* GROUP NAME */}
      {/* ===================================================== */}

      <div>
        <label className="block text-sm text-gray-300 mb-2">
          Group Name
        </label>

        <input
          value={name}
          onChange={(e) =>
            setName(
              e.target.value
            )
          }
          placeholder="College Friends"
          className="w-full bg-[#202c33] text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {/* ===================================================== */}
      {/* SELECTED MEMBERS */}
      {/* ===================================================== */}

      {selectedUsers.length >
        0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-gray-300">
              Selected Members
            </label>

            <span className="text-xs text-gray-500">
              {
                selectedUsers.length
              }{" "}
              selected
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedUsers.map(
              (member) => (
                <button
                  key={
                    member._id
                  }
                  type="button"
                  onClick={() =>
                    toggleUser(
                      member
                    )
                  }
                  className="flex items-center gap-2 bg-accent/20 border border-accent/40 rounded-full px-3 py-1.5 hover:bg-accent/30 transition"
                >
                  <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-semibold">
                    {member.name
                      ?.charAt(0)
                      ?.toUpperCase() ||
                      "U"}
                  </div>

                  <span className="text-xs text-white max-w-[120px] truncate">
                    {
                      member.name
                    }
                  </span>

                  <span className="text-gray-400">
                    ×
                  </span>
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* SEARCH USERS */}
      {/* ===================================================== */}

      <div>
        <label className="block text-sm text-gray-300 mb-2">
          Add Members
        </label>

        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
            🔍
          </span>

          <input
            value={query}
            onChange={
              handleSearch
            }
            placeholder="Search users..."
            className="w-full bg-[#202c33] text-white rounded-xl py-3 pl-11 pr-4 outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {/* ===================================================== */}
      {/* SEARCH RESULTS */}
      {/* ===================================================== */}

      <div className="max-h-60 overflow-y-auto space-y-2">
        {searching ? (
          <p className="text-gray-500 text-sm text-center py-5">
            Searching...
          </p>
        ) : users.length >
          0 ? (
          users.map((user) => {
            const selected =
              selectedUsers.some(
                (member) =>
                  member._id ===
                  user._id
              );

            return (
              <button
                key={user._id}
                type="button"
                onClick={() =>
                  toggleUser(
                    user
                  )
                }
                className={`
                  w-full
                  text-left
                  flex
                  items-center
                  gap-3
                  p-3
                  rounded-xl
                  border
                  transition
                  ${
                    selected
                      ? "bg-accent/10 border-accent/50"
                      : "bg-[#202c33] border-[#2a3942] hover:bg-[#2a3942]"
                  }
                `}
              >
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-semibold shrink-0">
                  {user.name
                    ?.charAt(0)
                    ?.toUpperCase() ||
                    "U"}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white font-medium truncate">
                    {
                      user.name
                    }
                  </p>

                  <p className="text-xs text-gray-500 truncate">
                    {
                      user.email
                    }
                  </p>
                </div>

                <div
                  className={`
                    w-6 h-6 rounded-full border flex items-center justify-center text-xs
                    ${
                      selected
                        ? "bg-accent border-accent text-white"
                        : "border-gray-600 text-transparent"
                    }
                  `}
                >
                  ✓
                </div>
              </button>
            );
          })
        ) : query.trim() ? (
          <p className="text-gray-500 text-sm text-center py-5">
            No users found.
          </p>
        ) : (
          <p className="text-gray-600 text-xs text-center py-5">
            Search for users to add
            them to your group.
          </p>
        )}
      </div>

      {/* ===================================================== */}
      {/* ERROR */}
      {/* ===================================================== */}

      {error && (
        <p className="text-red-400 text-xs">
          {error}
        </p>
      )}

      {/* ===================================================== */}
      {/* CREATE BUTTON */}
      {/* ===================================================== */}

      <button
        type="button"
        onClick={
          handleCreate
        }
        disabled={
          loading ||
          !name.trim() ||
          selectedUsers.length ===
            0
        }
        className="w-full bg-accent hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-medium transition"
      >
        {loading
          ? "Creating Group..."
          : "Create Group"}
      </button>
    </div>
  );
}