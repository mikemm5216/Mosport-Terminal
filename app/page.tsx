'use client'

import React, { useState, useEffect } from 'react'
import CoachReadCard from '../components/coach/CoachReadCard'
import { CoachReadDTO } from '../types/coach'

import PublicAppShell from '../components/layout/PublicAppShell'

export default function CoachRoomPage() {
  const [games, setGames] = useState<CoachReadDTO[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In production, this would fetch from /api/games/today
    fetch('/api/games/today')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setGames(data)
        } else {
          // Fallback to mocks if no data
          setGames(MOCK_GAMES)
        }
        setLoading(false)
      })
      .catch(() => {
        setGames(MOCK_GAMES)
        setLoading(false)
      })
  }, [])

  return (
    <PublicAppShell>
      <main className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30 pb-20">
        {/* Background Effects */}
        <div className="fixed inset-0 radar-grid opacity-20 pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-12">
          {/* Header */}
          <header className="mb-16 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-px w-8 bg-blue-500" />
              <span className="text-xs font-black uppercase tracking-[0.3em] text-blue-500">Keyboard Coach Arena</span>
            </div>
            <h1 className="text-6xl font-black italic tracking-tighter uppercase leading-none">
              Today’s <br />
              <span className="text-blue-500 glow-text">Coach Room</span>
            </h1>
            <p className="max-w-xl text-slate-500 font-medium leading-relaxed">
              Stop watching, start coaching. Analyze pregame reads, cast your vote, and prove your tactical superiority.
            </p>
          </header>

          {/* Filters/Tabs */}
          <div className="flex flex-wrap gap-4 mb-12">
            {['ALL ROOMS', 'NBA', 'MLB', 'EPL', 'NHL'].map((tab, i) => (
              <button key={tab} className={`
                px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all
                ${i === 0 ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}
              `}>
                {tab}
              </button>
            ))}
          </div>

          {/* Content Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 opacity-50">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-[600px] bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {games.map(game => (
                <CoachReadCard 
                  key={game.matchId} 
                  data={game} 
                  onVote={(s) => console.log('Vote:', s)}
                  onComment={() => console.log('Comment')}
                />
              ))}
            </div>
          )}

          {/* Empty State / Footer Callout */}
          <footer className="mt-24 py-12 border-t border-white/5 text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-700">
              Pregame Only • Locked at Tip-off • Mosport Engine v2.0
            </span>
          </footer>
        </div>
      </main>
    </PublicAppShell>
  )
}

const MOCK_GAMES: CoachReadDTO[] = [
  {
    matchId: 'nba-1',
    league: 'NBA',
    sport: 'BASKETBALL',
    analysisPhase: 'PREGAME_OPEN',
    generatedAt: new Date().toISOString(),
    generatedBeforeStart: true,
    isPregameOnly: true,
    homeTeam: { id: 'lal', name: 'Los Angeles Lakers', shortName: 'LAL', league: 'NBA' },
    awayTeam: { id: 'gsw', name: 'Golden State Warriors', shortName: 'GSW', league: 'NBA' },
    gameStatus: { status: 'scheduled', display: '10:00 PM' },
    coachQuestion: "Should the Lakers compress their rotation to stop the GSW momentum?",
    coachDecision: "ROTATION_COMPRESSION",
    coachRead: "The Lakers' bench is being outclassed in transition. AD needs more minutes with the starters to anchor the paint before the lead balloons.",
    emotionalHook: "Don't let the bench sink the ship.",
    whyItMatters: ["Bench +/- is -15", "Paint points allowed: 48"],
    worldEngineEvidence: [
      { label: "Momentum", valueLabel: "82%", severity: "HIGH", explanation: "GSW is on a 12-2 run.", source: "WORLD_ENGINE" },
      { label: "Fatigue", valueLabel: "15%", severity: "LOW", explanation: "Starters are fresh.", source: "WORLD_ENGINE" }
    ],
    opposingView: "Resting the stars now ensures they are ready for the clutch moments.",
    fanPrompt: "Do you pull the bench early?",
    confidenceLabel: "HIGH",
    debateIntensity: "HOT",
    fanVoteSummary: { agreePct: 65, disagreePct: 25, alternativePct: 10, totalVotes: 1240 }
  },
  {
    matchId: 'mlb-1',
    league: 'MLB',
    sport: 'BASEBALL',
    analysisPhase: 'PREGAME_OPEN',
    generatedAt: new Date().toISOString(),
    generatedBeforeStart: true,
    isPregameOnly: true,
    homeTeam: { id: 'nyy', name: 'New York Yankees', shortName: 'NYY', league: 'MLB' },
    awayTeam: { id: 'bos', name: 'Boston Red Sox', shortName: 'BOS', league: 'MLB' },
    gameStatus: { status: 'scheduled', display: '7:05 PM' },
    coachQuestion: "Is it time to pull the starter before the third time through the order?",
    coachDecision: "BULLPEN_TIMING",
    coachRead: "The starter's velocity is dipping, and the Red Sox top of the order has timed him perfectly twice already.",
    emotionalHook: "Avoid the third-time-through penalty.",
    whyItMatters: ["Exit velocity up 5mph in 5th inning", "Whiff rate down 12%"],
    worldEngineEvidence: [
      { label: "Velocity Dip", valueLabel: "-1.5mph", severity: "MEDIUM", explanation: "Fastball losing life.", source: "WORLD_ENGINE" }
    ],
    opposingView: "He's a horse, let him finish the 6th to save the bullpen.",
    fanPrompt: "Go to the pen now or wait?",
    confidenceLabel: "MEDIUM",
    debateIntensity: "ACTIVE",
    fanVoteSummary: { agreePct: 42, disagreePct: 48, alternativePct: 10, totalVotes: 850 }
  }
]
