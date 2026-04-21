'use client'

import type { GameDecision } from '../data/mockData'
import ProbabilityRing from './ProbabilityRing'

interface Props {
  games: GameDecision[]
}

export default function UpsetHunter({ games }: Props) {
  const upsets = games.filter(g => g.decision.label === 'UPSET')

  if (upsets.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-5 py-4 mb-4">
        <span className="text-xs text-zinc-500">No UPSET candidates today.</span>
      </div>
    )
  }

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-mono tracking-widest text-purple-400 uppercase">
          Upset Hunter
        </span>
        <span className="animate-blink inline-block w-1.5 h-1.5 rounded-full bg-purple-400" />
        <span className="text-[10px] text-zinc-600">{upsets.length} active signal{upsets.length > 1 ? 's' : ''}</span>
      </div>

      {upsets.map(game => {
        const ml     = game.decision.best_ml
        const mlStr  = ml >= 0 ? `+${ml}` : `${ml}`
        const side   = game.decision.best_side === 'AWAY' ? game.away_code : game.home_code
        const payout = ml >= 0 ? (ml / 100).toFixed(2) : (100 / Math.abs(ml)).toFixed(2)

        return (
          <div key={game.game_id} className="upset-border rounded-xl">
            <div
              className="rounded-xl p-4"
              style={{ background: 'rgba(18,18,23,0.97)' }}
            >
              {/* Title row */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[10px] font-mono text-zinc-500 mb-0.5">
                    {game.away_code} @ {game.home_code} · {game.game_time_utc} UTC
                  </div>
                  <div className="text-sm font-semibold text-white">
                    UPSET CANDIDATE — BET{' '}
                    <span style={{ color: '#A855F7' }}>[{side}]</span>
                  </div>
                </div>

                <ProbabilityRing prob={game.decision.win_prob} label="UPSET" size={72} />
              </div>

              {/* Metrics strip */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <UMetric label="LINE"         value={mlStr}                       />
                <UMetric label="PAYOUT"       value={`${payout}x`}               />
                <UMetric label="EXP ROI"      value={`+${game.decision.ev_pct.toFixed(1)}%`} highlight />
                <UMetric label="ENTROPY"      value={`${((game.entropy_score ?? 0) * 100).toFixed(0)}%`} />
              </div>

              {/* Entropy bar */}
              <div className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Market Entropy</span>
                  <span className="text-[9px] font-mono" style={{ color: '#A855F7' }}>
                    {((game.entropy_score ?? 0) * 100).toFixed(0)}% chaotic
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
                  High entropy = market disagrees → opportunity for mispriced line
                </div>
              </div>

              {/* Thesis */}
              <div
                className="rounded-lg px-3 py-2"
                style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}
              >
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
      <span className="text-[9px] text-zinc-600 tracking-widest uppercase">{label}</span>
      <span
        className="text-sm font-bold font-mono"
        style={{ color: highlight ? '#A855F7' : '#D4D4D8' }}
      >
        {value}
      </span>
    </div>
  )
}
