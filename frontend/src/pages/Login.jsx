import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Check your credentials.");
    } finally {
      setBusy(false);
    }
  }

  function handleDemoFill() {
    setEmail("admin@enterprise.internal");
    setPassword("EnterpriseAdmin2026!");
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-[#0c0814]">
      {/* Radiant ambient twilight & campfire glow orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-rose-900/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-950/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md p-8 sm:p-10 rounded-3xl bg-[#130d1e]/90 backdrop-blur-2xl border border-amber-500/20 shadow-2xl shadow-black/80 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-600 to-purple-700 shadow-lg shadow-amber-500/25 mb-1 text-amber-100">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C11.5 2 11 2.19 10.59 2.59L2.59 10.59C1.8 11.37 1.8 12.63 2.59 13.41L10.59 21.41C11.37 22.2 12.63 22.2 13.41 21.41L21.41 13.41C22.2 12.63 22.2 11.37 21.41 10.59L13.41 2.59C13 2.19 12.5 2 12 2Z" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-[10px] tracking-widest uppercase font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
              Sanctuary Access
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-white">
            Welcome Back
          </h1>
          <p className="text-xs sm:text-sm text-amber-200/60 font-sans">
            Sign in to your account • OmniIDE Cloud Mesh
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl p-3 flex items-start gap-2.5">
            <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Google SSO Button */}
        <button
          type="button"
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-white/[0.2] text-white text-sm font-semibold rounded-xl py-3 px-4 transition-all duration-200 shadow-sm cursor-pointer group"
        >
          <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center">
          <div className="flex-grow border-t border-white/[0.08]"></div>
          <span className="px-3 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">or with email</span>
          <div className="flex-grow border-t border-white/[0.08]"></div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full bg-[#0a0711]/90 border border-amber-500/20 focus:border-amber-400 text-white rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-300">Password</label>
              <button
                type="button"
                onClick={handleDemoFill}
                className="text-[11px] text-amber-400 hover:text-amber-300 transition cursor-pointer font-medium"
              >
                Use Demo Login
              </button>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full bg-[#0a0711]/90 border border-amber-500/20 focus:border-amber-400 text-white rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full mt-2 bg-gradient-to-r from-amber-500 via-rose-600 to-purple-600 hover:from-amber-400 hover:via-rose-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl py-2.5 px-4 shadow-lg shadow-amber-500/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {busy ? "Signing in..." : "Login"}
          </button>
        </form>

        {/* Footer Link */}
        <p className="text-xs text-gray-400 text-center pt-1">
          Don't have an account?{" "}
          <Link to="/register" className="text-amber-400 hover:text-amber-300 font-semibold transition">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
