"use client";

import { useState } from "react";
import { Settings, User } from "lucide-react";

// Filter tags data
const filterTags = [
  { id: "all", label: "全部賽事", emoji: "" },
  { id: "upset", label: "爆冷預警", emoji: "🔥" },
  { id: "streak", label: "終結連勝", emoji: "🛑" },
  { id: "hell", label: "地獄賽程", emoji: "🥵" },
  { id: "record", label: "紀錄之夜", emoji: "👑" },
];

// Mock match data for skeleton cards
const mockMatches = [
  {
    id: "1",
    homeTeam: "Los Angeles Lakers",
    awayTeam: "Golden State Warriors",
    date: "2026-03-22",
    time: "19:30",
    status: "LIVE",
    edge: 8.5,
    tag: "upset",
  },
  {
    id: "2",
    homeTeam: "Boston Celtics",
    awayTeam: "Miami Heat",
    date: "2026-03-22",
    time: "21:00",
    status: "PRE-MATCH",
    edge: -3.2,
    tag: "streak",
  },
  {
    id: "3",
    homeTeam: "Phoenix Suns",
    awayTeam: "Denver Nuggets",
    date: "2026-03-23",
    time: "20:00",
    status: "PRE-MATCH",
    edge: 12.1,
    tag: "record",
  },
];

// Match Card Component
function MatchCard({
  match,
}: {
  match: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    date: string;
    time: string;
    status: string;
    edge: number;
    tag: string;
  };
}) {
  const tagInfo = filterTags.find((t) => t.id === match.tag);

  return (
    <div className="group bg-slate-900 rounded-xl p-5 border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer relative overflow-hidden">
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative z-10">
        {/* Header with status and tag */}
        <div className="flex justify-between items-start mb-4">
          <div
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              match.status === "LIVE"
                ? "bg-red-500/20 text-red-400 animate-pulse"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {match.status === "LIVE" && (
              <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5 animate-pulse" />
            )}
            {match.status}
          </div>
          {tagInfo && tagInfo.emoji && (
            <span className="text-sm">{tagInfo.emoji}</span>
          )}
        </div>

        {/* Teams */}
        <div className="space-y-2 mb-5">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-white truncate pr-2">
              {match.homeTeam}
            </span>
            <span className="text-xs text-slate-500 font-medium">HOME</span>
          </div>
          <div className="flex items-center gap-2 px-2">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-xs text-slate-600 font-medium">VS</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-white truncate pr-2">
              {match.awayTeam}
            </span>
            <span className="text-xs text-slate-500 font-medium">AWAY</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-800">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500">Date</span>
            <span className="text-sm font-mono text-cyan-400">{match.date}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-slate-500">Time</span>
            <span className="text-sm font-mono text-slate-300">{match.time}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-500">Edge</span>
            <span
              className={`text-sm font-bold font-mono ${
                match.edge > 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {match.edge > 0 ? "+" : ""}
              {match.edge.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Filter Bar Component
function FilterBar({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: string;
  onFilterChange: (id: string) => void;
}) {
  return (
    <div className="relative">
      {/* Gradient fade on edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />

      {/* Scrollable container */}
      <div className="overflow-x-auto scrollbar-hide py-1 -mx-4 px-4">
        <div className="flex gap-3 w-max">
          {filterTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => onFilterChange(tag.id)}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm
                transition-all duration-200 whitespace-nowrap
                ${
                  activeFilter === tag.id
                    ? "bg-white text-slate-900 font-bold shadow-lg shadow-white/10"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300"
                }
              `}
            >
              {tag.emoji && <span>{tag.emoji}</span>}
              <span>{tag.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Navbar Component
function DemoNavbar() {
  return (
    <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black tracking-tight text-white">
            MOS
            <span className="text-cyan-400">PORT</span>
          </span>
          <span className="hidden sm:inline-block text-xs font-medium text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
            QUANT
          </span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          <button className="flex items-center gap-2 p-1 pr-3 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-300 hidden sm:inline">Profile</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

// Main Page Component
export default function DemoPage() {
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredMatches =
    activeFilter === "all"
      ? mockMatches
      : mockMatches.filter((m) => m.tag === activeFilter);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navbar */}
      <DemoNavbar />

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4">
        {/* Header section */}
        <div className="py-8 border-b border-slate-800/50">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            今日賽事
          </h1>
          <p className="text-slate-400">
            發現高價值投注機會，由 AI 驅動的量化分析
          </p>
        </div>

        {/* Filter Bar */}
        <div className="py-6">
          <FilterBar
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
        </div>

        {/* Match Cards Grid */}
        <div className="pb-12">
          {filteredMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-slate-300 mb-2">
                沒有符合條件的賽事
              </h3>
              <p className="text-slate-500">
                試試選擇其他過濾標籤
              </p>
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-slate-400">
                  <span className="text-white font-bold">12</span> 場直播中
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-slate-400">
                  <span className="text-cyan-400 font-bold">34</span> 場今日賽事
                </span>
              </div>
            </div>
            <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-sm rounded-lg transition-colors">
              查看全部
            </button>
          </div>
        </div>
      </main>

      {/* Custom scrollbar hide utility */}
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
