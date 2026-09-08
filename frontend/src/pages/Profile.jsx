import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext.jsx";

function getInitial(name) {
  return (
    String(name || "U")
      .trim()
      .charAt(0)
      .toUpperCase() || "U"
  );
}

function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [profile, setProfile] = useState(user || null);
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [status, setStatus] = useState(user?.status || "available");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        setLoading(true);
        const res = await api.get("/users/profile");
        const loaded = res.data?.user;

        if (!active || !loaded) return;

        setProfile(loaded);
        setName(loaded.name || "");
        setUsername(loaded.username || "");
        setPhone(loaded.phone || "");
        setBio(loaded.bio || "");
        setStatus(loaded.status || "available");
        setAvatar(loaded.avatar || "");
        updateUser(loaded);
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Failed to load your profile"
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Profile photo must be smaller than 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(String(reader.result || ""));
      setError("");
    };
    reader.onerror = () => setError("Could not read that image.");
    reader.readAsDataURL(file);
  }

  async function handleSave(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Name cannot be empty.");
      return;
    }

    if (!/^[a-z0-9._]{3,30}$/i.test(username.trim())) {
      setError(
        "Username must be 3-30 characters and use only letters, numbers, dots, or underscores."
      );
      return;
    }

    try {
      setSaving(true);

      const res = await api.put("/users/profile", {
        name: name.trim(),
        username: username.trim().toLowerCase(),
        phone: phone.trim(),
        avatar,
        bio: bio.trim(),
        status,
      });

      const updatedUser = res.data?.user;
      setProfile(updatedUser);
      updateUser(updatedUser);
      setName(updatedUser?.name || "");
      setUsername(updatedUser?.username || "");
      setPhone(updatedUser?.phone || "");
      setAvatar(updatedUser?.avatar || "");
      setBio(updatedUser?.bio || "");
      setStatus(updatedUser?.status || "available");
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to update profile"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-[#0f1117] text-white flex items-center justify-center">
        <p className="text-gray-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-[0.18em]">
              Account
            </p>
            <h1 className="text-2xl font-semibold mt-1">My Profile</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg bg-[#202c33] hover:bg-[#2a3942] text-sm"
          >
            Back
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
          <section className="bg-[#111b21] border border-[#202c33] rounded-2xl p-6 flex flex-col items-center justify-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-accent flex items-center justify-center text-4xl font-semibold">
                {avatar ? (
                  <img
                    src={avatar}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitial(name)
                )}
              </div>

              <label className="absolute right-1 bottom-1 w-10 h-10 rounded-full bg-accent hover:bg-blue-600 border-4 border-[#111b21] flex items-center justify-center cursor-pointer">
                ✎
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>

            <h2 className="text-xl font-semibold mt-5 text-center">
              {name || "Your name"}
            </h2>
            <p className="text-accent text-sm mt-1">
              @{username || "username"}
            </p>

            <p className="text-gray-400 text-sm text-center mt-4 leading-6">
              {bio || "Add a short bio about yourself."}
            </p>
          </section>

          <form
            onSubmit={handleSave}
            className="bg-[#111b21] border border-[#202c33] rounded-2xl p-6"
          >
            <div className="space-y-5">
              <div>
                <label className="block text-xs text-gray-500 mb-2">
                  Name
                </label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={80}
                  className="w-full bg-[#202c33] text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2">
                  Username
                </label>
                <div className="flex items-center bg-[#202c33] rounded-xl px-4">
                  <span className="text-gray-500">@</span>
                  <input
                    value={username}
                    onChange={(event) =>
                      setUsername(
                        event.target.value
                          .replace(/\s/g, "")
                          .toLowerCase()
                      )
                    }
                    maxLength={30}
                    className="w-full bg-transparent text-white px-2 py-3 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2">
                  Email
                </label>
                <input
                  value={profile?.email || user?.email || ""}
                  readOnly
                  className="w-full bg-[#182126] text-gray-400 rounded-xl px-4 py-3 outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2">
                  Phone
                </label>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  maxLength={30}
                  placeholder="Add phone number"
                  className="w-full bg-[#202c33] text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2">
                  About
                </label>
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  maxLength={160}
                  rows={4}
                  placeholder="Tell people a little about yourself"
                  className="w-full bg-[#202c33] text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-accent resize-none"
                />
                <p className="text-[11px] text-gray-600 mt-1 text-right">
                  {bio.length}/160
                </p>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="w-full bg-[#202c33] text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="available">Available</option>
                  <option value="busy">Busy</option>
                  <option value="away">Away</option>
                  <option value="offline">Offline</option>
                </select>
              </div>

              <div className="pt-2 border-t border-[#202c33] grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Member since</p>
                  <p className="text-sm text-gray-200 mt-1">
                    {formatDate(profile?.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Profile status</p>
                  <p className="text-sm text-gray-200 mt-1 capitalize">
                    {status}
                  </p>
                </div>
              </div>
            </div>

            {(error || success) && (
              <div className="mt-5">
                {error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}
                {success && (
                  <p className="text-sm text-green-400">{success}</p>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-accent hover:bg-blue-600 disabled:opacity-50 text-white font-medium px-5 py-3 rounded-xl"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
