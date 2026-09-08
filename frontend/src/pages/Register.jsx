import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(name, email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-[#0f1117]">
      <form
        onSubmit={handleSubmit}
        className="bg-panel w-full max-w-sm p-8 rounded-xl shadow-lg space-y-4"
      >
        <h1 className="text-2xl font-bold text-white">Create account</h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-300 text-sm rounded-md p-2">
            {error}
          </div>
        )}

        <div>
          <label className="text-sm text-gray-400">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="mt-1 w-full bg-panel2 text-white rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="text-sm text-gray-400">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="mt-1 w-full bg-panel2 text-white rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="text-sm text-gray-400">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="mt-1 w-full bg-panel2 text-white rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-accent hover:bg-blue-600 transition text-white font-medium rounded-md py-2 disabled:opacity-50"
        >
          {busy ? "Creating..." : "Create account"}
        </button>

        <p className="text-sm text-gray-400 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-accent hover:underline">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
