'use client'

import type { GameDecision } from '../data/mockData'
import ProbabilityRing from './ProbabilityRing'

interface Props {
  games: GameDecision[]
}

export default function OutperformanceAlert({ games }: Props) {
  const targets = games.filter(g => g.decision.label === 'OUTPERFORMANCE' && (g.entropy_score ?? 0) > 0.85)

  if (targets.length === 0) return null

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-mono tracking-widest text-purple-400 uppercase">
          Outperformance Potential
        </span>
        <span className="animate-blink inline-block w-1.5 h-1.5 rounded-full bg-purple-400" />
        <span className="text-[10px] text-zinc-600">
          {targets.length} active signal{targets.length > 1 ? 's' : ''}
        </span>
      </div>

      {targets.map(game => {
        const ml      = game.market_expectation
        const mlStr   = ml >= 0 ? `+${ml}` : `${ml}`
        const side    = game.best_side === 'AWAY' ? game.away_code : game.home_code
        const leverage = ml >= 0 ? (ml / 100).toFixed(2) : (100 / Math.abs(ml)).toFixed(2)

        return (
          <div key={game.game_id} className="upset-border rounded-xl">
            <div className="rounded-xl p-4" style={{ background: 'rgba(18,18,23,0.97)' }}>
              {/* Title row */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[10px] font-mono text-zinc-500 mb-0.5">
                    {game.away_code} @ {game.home_code} · {game.game_time_utc} UTC
                  </div>
                  <div className="text-sm font-semibold text-white">
                    OUTPERFORMANCE POTENTIAL —{' '}
                    <span style={{ color: '#A855F7' }}>[{side}]</span>
                  </div>
                </div>
                <ProbabilityRing
                  prob={game.adjusted_win_pct / 100}
                  label="OUTPERFORMANCE"
                  size={72}
                />
              </div>

              {/* Metrics strip */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <UMetric label="BASELINE PROJECTION" value={mlStr} />
                <UMetric label="PERFORMANCE LEVERAGE" value={`${leverage}x`} />
                <UMetric label="TACTICAL EDGE (WPA)"
                  value={`+${game.wpa.toFixed(1)}%`} highlight />
                <UMetric label="TACTICAL ENTROPY"
                  value={`${((game.entropy_score ?? 0) * 100).toFixed(0)}%`} />
              </div>

              {/* Entropy bar */}
              <div className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider">
                    Tactical Entropy
                  </span>
                  <span className="text-[9px] font-mono" style={{ color: '#A855F7' }}>
                    {((game.entropy_score ?? 0) * 100).toFixed(0)}% instability
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width:      `${(game.entropy_score ?? 0) * 100}%`,
                      background: 'linear-gradient(90deg, #7C3AED, #A855F7, #C084FC)',
                    }}
                  />
                </div>
                <div className="mt-1 text-[9px] text-zinc-600">
                  High entropy = market instability → outperformance window identified
                </div>
              </div>

              {/* Thesis */}
              <div className="rounded-lg px-3 py-2"
                style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
                <span className="text-[11px] text-purple-300">
                  {game.causal_factors[0]?.factor}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function UMetric({ label, value, highlight }: {
  label: string; value: string; highlight?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[8px] text-zinc-600 tracking-widest uppercase leading-tight">{label}</span>
      <span className="text-sm font-bold font-mono"
        style={{ color: highlight ? '#A855F7' : '#D4D4D8' }}>
        {value}
      </span>
    </div>
  )
}
