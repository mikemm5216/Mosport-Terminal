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
    // Initializing with Mock Data to prove UI binding
    const mockMatches = [
      {
        match_id: 'NBA-LAL-GSW-MOCK',
        league: 'NBA',
        status: 'IN_PLAY',
        home_team: { short_name: 'LAL' },
        home_team_hash: 'Mpt_NBA23',
        away_team: { short_name: 'GSW' },
        away_team_hash: 'Mpt_NBA21',
        home_score: 102,
        away_score: 98,
        predictedHomeWinRate: 0.65,
        confidence: 0.88,
        home_key_player: { player_name: 'LeBron James', jersey_number: '23' },
        away_key_player: { player_name: 'Steph Curry', jersey_number: '30' }
      },
      {
        match_id: 'MLB-LAD-NYY-MOCK',
        league: 'MLB',
        status: 'SCHEDULED',
        start_time: new Date().toISOString(),
        home_team: { short_name: 'LAD' },
        home_team_hash: 'Mpt_MLB28',
        away_team: { short_name: 'NYY' },
        away_team_hash: 'Mpt_MLB01',
        home_score: 0,
        away_score: 0,
        predictedHomeWinRate: 0.52,
        confidence: 0.75,
        home_key_player: { player_name: 'Shohei Ohtani', jersey_number: '17' },
        away_key_player: { player_name: 'Aaron Judge', jersey_number: '99' }
      },
      {
        match_id: 'ECL-RMA-BAR-MOCK',
        league: 'ESP',
        status: 'IN_PLAY',
        time: '74:22',
        home_team: { short_name: 'RMA' },
        home_team_hash: 'Mpt_ESP01',
        away_team: { short_name: 'BAR' },
        away_team_hash: 'Mpt_ESP02',
        home_score: 2,
        away_score: 1,
        predictedHomeWinRate: 0.82,
        confidence: 0.94,
        home_key_player: { player_name: 'Vinícius Júnior', jersey_number: '7' },
        away_key_player: { player_name: 'Lamine Yamal', jersey_number: '19' }
      }
    ];

    setMatches(mockMatches);
    setLoading(false);

    // Optional: Keep the real fetch as a background refresh if needed, but for now, mock is priority
    /*
    fetch('/api/signals')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data.length > 0) {
          // setMatches(data.data);
        }
      });
    */
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
