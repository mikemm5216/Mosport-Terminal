"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowRight, User, Activity, Clock, Zap, Target, Shield, AlertTriangle } from 'lucide-react';
import LiveTicker from '@/components/LiveTicker';
import LogoFallback from '@/components/LogoFallback';
import ESPNStyleScoreboard from '@/components/ESPNStyleScoreboard';
import { formatLocalTime } from '@/lib/timezone';

export default function Home() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/signals')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMatches(data.data);
        }
        setLoading(false);
      })
      .catch(e => {
        setLoading(false);
      });
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <main className="min-h-screen bg-[#05090f] flex flex-col items-center overflow-x-hidden selection:bg-cyan-500/30">
      <LiveTicker />

      {/* TERMINAL HEADER (Extreme Density V16.2 Purged) */}
      <div className="w-full max-w-7xl pt-4 pb-2 px-12">
        <div className="flex flex-col border-l-2 border-cyan-400 pl-4">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_emerald]" />
            <span className="text-[8px] font-black text-slate-700 uppercase tracking-[0.4em]">Live Alpha Feed Active</span>
          </div>
          <h1 className="text-xl font-black text-white italic uppercase tracking-[0.1em] leading-none">
            MOSPORT <span className="text-cyan-400">TERMINAL</span>
          </h1>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
        </div>
      ) : (
        <div className="w-full max-w-7xl px-12 pt-4 pb-40">
          <ESPNStyleScoreboard matches={matches} />
        </div>
      )}
    </main>
  );
}
