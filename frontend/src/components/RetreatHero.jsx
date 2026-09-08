import React from "react";
import retreatHeroImg from "../assets/retreat-hero.jpg";

export default function RetreatHero({
  user,
  onLaunchAI,
  onLaunchWorkspace,
  onNewChat,
  onNewGroup,
  onSelectTemplate,
}) {
  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-amber-500/20 shadow-2xl shadow-black/80 group">
      {/* BACKGROUND IMAGE WITH CINEMATIC SUNSET GRADIENT OVERLAYS */}
      <div className="relative h-[340px] sm:h-[400px] lg:h-[460px] w-full overflow-hidden">
        <img
          src={retreatHeroImg}
          alt="Architectural Retreat at Sunset"
          className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-1000 ease-out"
        />

        {/* Ambient Twilight Vignette and Lighting Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0811] via-[#0b0811]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0811]/90 via-[#0b0811]/60 to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Floating Telemetry & Tagline Badge */}
        <div className="absolute top-6 left-6 sm:left-10 flex items-center gap-3">
          <span className="text-[11px] font-mono tracking-widest uppercase text-amber-300/90 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-amber-500/30 shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-sm shadow-amber-400/80" />
            <span>01/05 • Architectural Sanctuary</span>
          </span>
          <span className="hidden sm:inline-block text-[11px] font-mono text-gray-400 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
            Lat. 45°N • Sunset Twilight
          </span>
        </div>

        {/* HERO EDITORIAL CONTENT OVERLAY */}
        <div className="absolute bottom-6 left-6 sm:left-10 right-6 sm:right-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-xl space-y-3">
            <h1 className="text-4xl sm:text-6xl font-serif font-bold text-white tracking-tight leading-none drop-shadow-md">
              Retreat<span className="text-amber-400 italic font-light">.</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 font-sans leading-relaxed max-w-md drop-shadow">
              Welcome to the sanctuary for collaborative software craftsmanship. An atmospheric space where autonomous AI agents and real-time human engineering unite.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onLaunchAI}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#0b0811] text-xs font-bold font-sans shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2"
              >
                <span>Explore AI Architect</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>

              <button
                onClick={onLaunchWorkspace}
                className="px-5 py-2.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 hover:border-amber-400/50 text-white text-xs font-semibold font-sans transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Enter Workspace</span>
              </button>
            </div>
          </div>

          {/* Quick Campfire Live Status Pill */}
          <div className="hidden lg:flex flex-col items-end gap-2 bg-[#120d1c]/80 backdrop-blur-xl border border-amber-500/20 p-4 rounded-2xl shadow-xl max-w-xs">
            <div className="flex items-center gap-2 text-xs text-amber-300 font-medium">
              <span className="text-amber-400 text-sm">🔥</span>
              <span>Campfire Mesh Active</span>
            </div>
            <p className="text-[11px] text-gray-400 text-right leading-normal">
              Redis 7 cluster synchronization with sub-15ms latency across all peer nodes.
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Zero-Leak Monaco Disposed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
