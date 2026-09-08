import React, { useState } from "react";
import api from "../api/axios";

export default function AddCollaboratorModal({ projectId, onClose, onAdded }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api.post(`/projects/${projectId}/collaborators`, { email });
      onAdded(res.data.project);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add collaborator");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-panel w-full max-w-sm p-6 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">Add collaborator</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <input
          autoFocus
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Collaborator's registered email"
          className="w-full bg-panel2 text-white rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
        />

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-accent hover:bg-blue-600 transition text-white rounded-md py-2 disabled:opacity-50"
        >
          {busy ? "Adding..." : "Add"}
        </button>
      </form>
    </div>
  );
}
