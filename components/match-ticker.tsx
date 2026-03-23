"use client";

import { useState, useEffect } from 'react';
import { formatLocalTime } from '@/lib/timezone';

export default function MatchTicker() {
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/matches/ticker')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Duplicate items to ensure a seamless loop
          setMatches([...data.matches, ...data.matches, ...data.matches]);
        }
      })
      .catch(e => {});
  }, []);

  // CEO DIRECTIVE: Always render the ticker frame even if empty
  // to ensure "Truth" is represented.

  return (
    <div className="w-full bg-slate-900 border-b border-cyan-500/30 overflow-hidden h-10 flex items-center group relative z-50">
      <div className="flex animate-marquee whitespace-nowrap group-hover:pause">
        {matches.length > 0 ? matches.map((match, i) => (
          <div key={`${match.match_id}-${i}`} className="inline-flex items-center px-8 border-r border-slate-800/50">
            {match.status === "COMPLETED" || match.status === "FINISHED" ? (
              <span className="text-[10px] font-mono tracking-widest text-slate-300 uppercase">
                <span className="text-cyan-400 font-black mr-2">FINAL</span> | {match.home_team_name} {match.home_score} <span className="text-cyan-500 px-2 font-black">◀▶</span> {match.away_score} {match.away_team_name}
              </span>
            ) : (
              <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                <span className="text-emerald-400 font-black mr-2">{formatLocalTime(match.match_date)}</span> | {match.home_team_name} <span className="text-slate-700 italic px-2 font-medium">vs</span> {match.away_team_name}
              </span>
            )}
          </div>
        )) : (
          <div className="inline-flex items-center px-8 w-full justify-center">
            <span className="text-[10px] font-mono tracking-[0.3em] text-slate-500 uppercase animate-pulse">
              [ NO ACTIVE MATCH INTELLIGENCE SCHEDULED FOR THIS CYCLE ]
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
