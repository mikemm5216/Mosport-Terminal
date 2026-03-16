"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { format } from "date-fns";

export default function DashboardPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMatches() {
      try {
        const res = await fetch("/api/matches");
        if (res.ok) {
          const data = await res.json();
          setMatches(data);
        }
      } catch (e) {
        console.error("Failed to fetch matches", e);
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Match Schedule</h1>
        </div>

        {loading ? (
          <div className="text-secondary-text animate-pulse">Loading intelligence data...</div>
        ) : matches.length === 0 ? (
          <div className="bg-panel rounded-lg p-8 text-center text-secondary-text border border-grid">
            No active matches found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((match) => {
              const hasSignal = match.signals && match.signals.some((s: any) => s.anc_flag);

              return (
                <Link key={match.id} href={`/match/${match.id}`}>
                  <div className={`bg-panel rounded-xl p-6 border transition-all hover:-translate-y-1 ${hasSignal ? 'border-signal-pink shadow-[0_0_15px_rgba(244,114,182,0.15)]' : 'border-grid hover:border-secondary-text'}`}>
                    
                    <div className="flex justify-between items-center mb-4 text-sm">
                      <span className="text-secondary-text">
                        {format(new Date(match.match_date), "MMM d • HH:mm")}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                        match.status === 'live' ? 'bg-red-500/20 text-red-500' :
                        match.status === 'scheduled' ? 'bg-blue-500/20 text-signal-blue' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {match.status}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-white truncate max-w-[70%]">{match.home_team.name}</span>
                        <span className="text-xl font-mono text-white">{match.stats?.home_score ?? '-'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-white truncate max-w-[70%]">{match.away_team.name}</span>
                        <span className="text-xl font-mono text-white">{match.stats?.away_score ?? '-'}</span>
                      </div>
                    </div>

                    {hasSignal && (
                      <div className="mt-4 pt-4 border-t border-grid flex items-center gap-2 text-signal-pink text-xs font-semibold">
                        <div className="h-2 w-2 rounded-full bg-signal-pink animate-pulse" />
                        ACTIVE SIGNAL DETECTED
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
