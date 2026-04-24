"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowRight, User, Activity, Clock, Zap, Target, Shield, AlertTriangle } from 'lucide-react';
import LiveTicker from '@/components/LiveTicker';
import ESPNStyleScoreboard from '@/components/ESPNStyleScoreboard';
import { formatLocalTime } from '@/lib/timezone';

export default function Home() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch all matches from the newly seeded database directly
    fetch('/api/matches')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMatches(data.data || data.matches || []);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch matches:", err);
        setLoading(false);
      });
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <main className="min-h-screen bg-[#020617] flex flex-col items-center overflow-x-hidden selection:bg-cyan-500/30">
      <LiveTicker />

      {/* TERMINAL HEADER (ESPN Professional Style) */}
      <div className="w-full max-w-7xl pt-6 pb-2 px-4 md:px-12">
        <div className="flex flex-col border-l-4 border-cyan-500 pl-6 py-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] italic">Live Alpha Feed // Quantitative OS</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[12px] font-black text-pink-500 uppercase tracking-widest px-2 py-1 border border-pink-500 rounded bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.5)] animate-pulse">
              [ HOT DATA: LAST 24H ]
            </span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-white italic uppercase tracking-[0.05em] leading-none flex items-baseline gap-2">
            MOSPORT <span className="text-cyan-400">TERMINAL</span>
            <span className="text-[10px] text-slate-700 font-bold tracking-widest ml-auto hidden md:block">ALPHA QUANT FEED</span>
          </h1>
        </div>
      </div>

      {
        loading ? (
          <div className="flex-1 flex items-center justify-center p-40">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
          </div>
        ) : (
          <div className="w-full max-w-7xl px-12 pt-4 pb-40">
            <ESPNStyleScoreboard matches={matches} />
          </div>
        )
      }
    </main >
  );
}
