"use client";

import { useState } from "react";
import { Settings, User, Trophy, Flame, Activity, TrendingUp, Zap } from "lucide-react";

// Basketball Icon Component
function BasketballIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M12 2C12 12 12 12 12 22" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 12C12 12 12 12 22 12" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M4.93 4.93C9 9 15 9 19.07 4.93" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M4.93 19.07C9 15 15 15 19.07 19.07" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

// Football Icon Component
function FootballIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="12" rx="9" ry="5" transform="rotate(45 12 12)"/>
      <path d="M12 2l0 20"/>
      <path d="M7.5 7.5c3 1.5 6 1.5 9 0"/>
      <path d="M7.5 16.5c3-1.5 6-1.5 9 0"/>
    </svg>
  );
}

// Baseball Icon Component  
function BaseballIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M5 5.5c2 2 2 4.5 0 6.5"/>
      <path d="M19 5.5c-2 2-2 4.5 0 6.5"/>
      <path d="M5 12c2 2 2 4.5 0 6.5"/>
      <path d="M19 12c-2 2-2 4.5 0 6.5"/>
    </svg>
  );
}

// Soccer Icon Component
function SoccerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10"/>
      <polygon points="12,7 14.5,10 13.5,13 10.5,13 9.5,10" fill="currentColor"/>
      <path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>
      <path d="M4.93 4.93l3.54 3.54M15.53 15.53l3.54 3.54"/>
      <path d="M19.07 4.93l-3.54 3.54M8.47 15.53l-3.54 3.54"/>
    </svg>
  );
}

// Filter tags data with sport icons
const filterTags = [
  { id: "all", label: "全部賽事", icon: Trophy },
  { id: "upset", label: "爆冷預警", icon: Flame },
  { id: "streak", label: "終結連勝", icon: Zap },
  { id: "hell", label: "地獄賽程", icon: Activity },
  { id: "record", label: "紀錄之夜", icon: TrendingUp },
];

// Sport types with their icons
type SportType = "basketball" | "football" | "baseball" | "soccer";

const sportIcons: Record<SportType, React.FC<{ className?: string }>> = {
  basketball: BasketballIcon,
  football: FootballIcon,
  baseball: BaseballIcon,
  soccer: SoccerIcon,
};

// Mock match data for skeleton cards
const mockMatches = [
  {
    id: "1",
    homeTeam: "Los Angeles Lakers",
    awayTeam: "Golden State Warriors",
    homeScore: 108,
    awayScore: 102,
    date: "2026-03-22",
    time: "19:30",
    quarter: "Q4 2:34",
    status: "LIVE",
    edge: 8.5,
    tag: "upset",
    sport: "basketball" as SportType,
    league: "NBA",
  },
  {
    id: "2",
    homeTeam: "Boston Celtics",
    awayTeam: "Miami Heat",
    homeScore: 0,
    awayScore: 0,
    date: "2026-03-22",
    time: "21:00",
    quarter: "",
    status: "PRE-MATCH",
    edge: -3.2,
    tag: "streak",
    sport: "basketball" as SportType,
    league: "NBA",
  },
  {
    id: "3",
    homeTeam: "Kansas City Chiefs",
    awayTeam: "Buffalo Bills",
    homeScore: 24,
    awayScore: 21,
    date: "2026-03-23",
    time: "20:00",
    quarter: "4th 8:22",
    status: "LIVE",
    edge: 12.1,
    tag: "record",
    sport: "football" as SportType,
    league: "NFL",
  },
];

// Match Card Component with sports elements
function MatchCard({
  match,
}: {
  match: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    date: string;
    time: string;
    quarter: string;
    status: string;
    edge: number;
    tag: string;
    sport: SportType;
    league: string;
  };
}) {
  const tagInfo = filterTags.find((t) => t.id === match.tag);
  const SportIcon = sportIcons[match.sport];
  const TagIcon = tagInfo?.icon;

  return (
    <div className="group bg-slate-900 rounded-xl border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer relative overflow-hidden">
      {/* Court/Field pattern background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        {match.sport === "basketball" && (
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <circle cx="50" cy="50" r="15" stroke="white" strokeWidth="0.5" fill="none"/>
            <line x1="50" y1="0" x2="50" y2="100" stroke="white" strokeWidth="0.5"/>
            <rect x="0" y="30" width="15" height="40" stroke="white" strokeWidth="0.5" fill="none"/>
            <rect x="85" y="30" width="15" height="40" stroke="white" strokeWidth="0.5" fill="none"/>
          </svg>
        )}
        {match.sport === "football" && (
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((x) => (
              <line key={x} x1={x} y1="0" x2={x} y2="100" stroke="white" strokeWidth="0.3"/>
            ))}
          </svg>
        )}
      </div>

      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative z-10 p-5">
        {/* Header with sport icon, league, and status */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
              <SportIcon className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-300">{match.league}</span>
              {match.quarter && (
                <span className="text-xs text-orange-400 ml-2 font-mono">{match.quarter}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {TagIcon && (
              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center">
                <TagIcon className="w-3.5 h-3.5 text-amber-400" />
              </div>
            )}
            <div
              className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                match.status === "LIVE"
                  ? "bg-red-500/20 text-red-400"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {match.status === "LIVE" && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
              {match.status}
            </div>
          </div>
        </div>

        {/* Teams with scores */}
        <div className="space-y-3 mb-5">
          {/* Home Team */}
          <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                {match.homeTeam.split(' ').map(w => w[0]).slice(-2).join('')}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white truncate max-w-[140px]">
                  {match.homeTeam}
                </span>
                <span className="text-xs text-slate-500">HOME</span>
              </div>
            </div>
            {match.status === "LIVE" && (
              <span className="text-2xl font-black text-white tabular-nums">
                {match.homeScore}
              </span>
            )}
          </div>

          {/* VS Divider */}
          <div className="flex items-center gap-3 px-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
            <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
              <span className="text-xs font-black text-slate-400">VS</span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
          </div>

          {/* Away Team */}
          <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-sm">
                {match.awayTeam.split(' ').map(w => w[0]).slice(-2).join('')}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white truncate max-w-[140px]">
                  {match.awayTeam}
                </span>
                <span className="text-xs text-slate-500">AWAY</span>
              </div>
            </div>
            {match.status === "LIVE" && (
              <span className="text-2xl font-black text-white tabular-nums">
                {match.awayScore}
              </span>
            )}
          </div>
        </div>

        {/* Footer Stats */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-800">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-slate-500">Date</span>
              <span className="text-sm font-mono text-cyan-400">{match.date}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-500">Time</span>
              <span className="text-sm font-mono text-slate-300">{match.time}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-xs text-slate-500 block">Edge Value</span>
              <span
                className={`text-lg font-black font-mono ${
                  match.edge > 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {match.edge > 0 ? "+" : ""}
                {match.edge.toFixed(1)}%
              </span>
            </div>
            <div className={`w-2 h-8 rounded-full ${match.edge > 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
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
          {filterTags.map((tag) => {
            const Icon = tag.icon;
            return (
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
                <Icon className={`w-4 h-4 ${activeFilter === tag.id ? "text-cyan-600" : "text-current"}`} />
                <span>{tag.label}</span>
              </button>
            );
          })}
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
