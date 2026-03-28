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
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center overflow-x-hidden selection:bg-amber-500/30">
      <LiveTicker />

      {/* ESPN-Style Header */}
      <div className="w-full max-w-7xl pt-6 pb-4 px-4 sm:px-8">
        <div className="flex flex-col border-l-4 border-amber-500 pl-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgb(16,185,129)]" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Live Premium Feed</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white italic uppercase tracking-[0.05em] leading-tight">
            MOSPORT <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">RADAR</span>
          </h1>
          <p className="text-slate-600 text-[9px] font-mono uppercase tracking-[0.3em] mt-2">Global Sports Intelligence Network</p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-40">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-500 shadow-[0_0_30px_rgba(251,146,60,0.3)]"></div>
        </div>
      ) : (
        <div className="w-full max-w-7xl px-4 sm:px-8 pt-4 pb-40">
          <ESPNStyleScoreboard matches={matches} />
        </div>
      )}
    </main>
  );
}
