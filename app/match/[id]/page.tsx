"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navigation from "@/components/Navigation";

export default function MatchDetailPage() {
  const { id } = useParams();
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMatch() {
      try {
        const res = await fetch(`/api/match/${id}`);
        if (res.ok) {
          const data = await res.json();
          setMatch(data);
        }
      } catch (e) {
        console.error("Failed to fetch match details", e);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchMatch();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="p-8 text-center text-secondary-text animate-pulse">Loading intelligence...</div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="p-8 text-center text-red-500">Match not found.</div>
      </div>
    );
  }

  const signals = match.signals || [];
  const latestSignal = signals.length > 0 ? signals[0] : null;
  const quant = match.quant;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header section */}
        <div className="bg-panel border border-grid rounded-xl p-6 lg:p-10 mb-8">
          <div className="text-center mb-8">
            <span className="uppercase text-xs font-bold tracking-widest text-secondary-text mb-4 inline-block">
              {match.status} match status
            </span>
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-16">
              <div className="text-center w-full md:w-1/3">
                <h2 className="text-2xl lg:text-4xl font-bold text-white break-words">{match.home_team.name}</h2>
                <div className="mt-2 text-secondary-text">Home</div>
              </div>
              
              <div className="text-4xl font-mono font-black text-white shrink-0">
                {match.stats?.home_score ?? '-'} : {match.stats?.away_score ?? '-'}
              </div>
              
              <div className="text-center w-full md:w-1/3">
                <h2 className="text-2xl lg:text-4xl font-bold text-white break-words">{match.away_team.name}</h2>
                <div className="mt-2 text-secondary-text">Away</div>
              </div>
            </div>
          </div>
        </div>

        {/* Intelligence Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Quant Metrics Panel */}
          <div className="bg-panel border border-grid rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-signal-blue rounded-full"></span>
              Quant Engine Projections
            </h3>
            
            {quant ? (
              <div className="space-y-6">
                <div>
                  <div className="text-sm text-secondary-text mb-1">Expected Home Score</div>
                  <div className="text-2xl font-mono text-white">{quant.expected_home_score.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-secondary-text mb-1">Expected Away Score</div>
                  <div className="text-2xl font-mono text-white">{quant.expected_away_score.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-secondary-text mb-1">Model Variance</div>
                  <div className="text-lg font-mono text-white">{quant.variance.toFixed(4)}</div>
                </div>
              </div>
            ) : (
              <div className="text-secondary-text text-sm">Quant simulation pending.</div>
            )}
          </div>

          {/* Signal Assessment Panel */}
          <div className="bg-panel border border-grid rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-signal-pink rounded-full"></span>
              Signal Assessment
            </h3>

            {latestSignal ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-grid">
                  <span className="text-secondary-text">Model Probability</span>
                  <span className="font-mono text-white text-lg">{(latestSignal.model_probability * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-grid">
                  <span className="text-secondary-text">Market Probability</span>
                  <span className="font-mono text-white text-lg">{(latestSignal.market_probability * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-grid">
                  <span className="text-secondary-text">Signal to Noise (SNR)</span>
                  <span className="font-mono text-white text-lg">{latestSignal.snr.toFixed(2)}</span>
                </div>
                <div className="pt-2">
                  {latestSignal.anc_flag ? (
                    <div className="bg-signal-pink/10 border border-signal-pink/30 text-signal-pink rounded-lg p-4 font-semibold text-center uppercase tracking-widest text-sm">
                      Actionable Signal Detected
                    </div>
                  ) : (
                    <div className="bg-grid border border-gray-700 text-secondary-text rounded-lg p-4 font-semibold text-center uppercase tracking-widest text-sm">
                      Noise / No Signal
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-secondary-text text-sm">Signal processing pending.</div>
            )}
          </div>

          {/* World State Panel */}
          <div className="bg-panel border border-grid rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-white flex rounded-full"></span>
              World State
            </h3>

            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm uppercase tracking-wider text-secondary-text">Home Team State</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="bg-grid/50 rounded py-2">
                    <div className="text-secondary-text text-xs mb-1">STR</div>
                    <div className="font-mono text-white">{match.home_team.states[0]?.team_strength.toFixed(1) || '-'}</div>
                  </div>
                  <div className="bg-grid/50 rounded py-2">
                    <div className="text-secondary-text text-xs mb-1">MOM</div>
                    <div className="font-mono text-white">{match.home_team.states[0]?.momentum.toFixed(2) || '-'}</div>
                  </div>
                  <div className="bg-grid/50 rounded py-2">
                    <div className="text-secondary-text text-xs mb-1">FAT</div>
                    <div className="font-mono text-white">{match.home_team.states[0]?.fatigue.toFixed(2) || '-'}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-grid">
                <h4 className="text-sm uppercase tracking-wider text-secondary-text">Away Team State</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="bg-grid/50 rounded py-2">
                    <div className="text-secondary-text text-xs mb-1">STR</div>
                    <div className="font-mono text-white">{match.away_team.states[0]?.team_strength.toFixed(1) || '-'}</div>
                  </div>
                  <div className="bg-grid/50 rounded py-2">
                    <div className="text-secondary-text text-xs mb-1">MOM</div>
                    <div className="font-mono text-white">{match.away_team.states[0]?.momentum.toFixed(2) || '-'}</div>
                  </div>
                  <div className="bg-grid/50 rounded py-2">
                    <div className="text-secondary-text text-xs mb-1">FAT</div>
                    <div className="font-mono text-white">{match.away_team.states[0]?.fatigue.toFixed(2) || '-'}</div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
}
