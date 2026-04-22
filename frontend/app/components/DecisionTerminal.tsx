'use client'

import type { WhoopSync, GameDecision } from '../data/mockData'

interface Props {
  whoopData: WhoopSync
  featuredGame: GameDecision
  adjustedWin: number
}

const RECOMMENDATIONS: Record<string, {
  title: string
  body: string
  tactical: string
}> = {
  MIRACLE_OUTPERFORMANCE: {
    title: 'Miracle Mode Active',
    body: '高恢復指標覆蓋客場疲勞懲罰。Biometric state optimal — physiological drag neutralized.',
    tactical: '建議：進攻性換投策略。Deploy aggressive load rotation. Lean into adjusted win% projection.',
  },
  MIRACLE_VULNERABILITY: {
    title: 'Miracle Mode / Instability Alert',
    body: '高恢復指標強化進攻性，但市場分歧信號需謹慎。High recovery amplifies edge but model divergence warrants caution.',
    tactical: '建議：縮小倉位。Reduce tactical load — high variance environment.',
  },
  RISK_OUTPERFORMANCE: {
    title: 'Recovery Deficiency Detected',
    body: '生理數據低於閾值 — 影響決策信心。Recovery below threshold — decision confidence suppressed.',
    tactical: '建議：守備性策略。Reduce exposure — load management protocol active.',
  },
  NORMAL_MONITOR: {
    title: 'Neutral Biometric State',
    body: '生理指標正常範圍。No edge detected in current matchup — standby recommended.',
    tactical: '建議：觀望。No tactical action required.',
  },
}

function getRecommendationKey(mode: string, label: string) {
  if (mode === 'MIRACLE' && label === 'OUTPERFORMANCE') return 'MIRACLE_OUTPERFORMANCE'
  if (mode === 'MIRACLE' && label === 'VULNERABILITY')  return 'MIRACLE_VULNERABILITY'
  if (mode === 'RISK')                                   return 'RISK_OUTPERFORMANCE'
  return 'NORMAL_MONITOR'
}

export default function DecisionTerminal({ whoopData, featuredGame, adjustedWin }: Props) {
  const key  = getRecommendationKey(whoopData.mode, featuredGame.decision.label)
  const rec  = RECOMMENDATIONS[key]
  const wpa  = adjustedWin - featuredGame.baseline_win_pct
  const team = featuredGame.best_side === 'AWAY' ? featuredGame.away_code : featuredGame.home_code

  const isMiracle = whoopData.mode === 'MIRACLE'
  const borderColor = isMiracle ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'
  const accentColor = isMiracle ? '#22C55E' : '#EF4444'
  const bgColor     = isMiracle ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.04)'

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: bgColor, border: `1px solid ${borderColor}` }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase">
            Decision Terminal
          </span>
          <span
            className="text-[9px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider"
            style={{ background: `${accentColor}18`, color: accentColor }}
          >
            {whoopData.mode} MODE
          </span>
          <span
            className="text-[9px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider"
            style={{ background: 'rgba(168,85,247,0.12)', color: '#A855F7' }}
          >
            {featuredGame.decision.label}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500">
          <span>CONF {Math.round(featuredGame.confidence * 100)}%</span>
          <span style={{ color: accentColor }}>
            WPA {wpa >= 0 ? '+' : ''}{wpa.toFixed(1)}pp
          </span>
          <span>RECOVERY {whoopData.recovery}%</span>
        </div>
      </div>

      {/* Recommendation body */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm font-bold text-white mb-1">{rec.title}</div>
          <div className="text-[11px] text-zinc-400 leading-relaxed">{rec.body}</div>
        </div>
        <div
          className="rounded-lg px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #27272A' }}
        >
          <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">
            Primary Recommendation
          </div>
          <div className="text-[11px] leading-snug" style={{ color: accentColor }}>
            {rec.tactical}
          </div>
          <div className="mt-2 pt-2 flex items-center gap-3 text-[9px] font-mono text-zinc-600"
            style={{ borderTop: '1px solid #1e1e26' }}>
            <span>TEAM: {team}</span>
            <span>·</span>
            <span>IMPACT: {featuredGame.wpa >= 0 ? '+' : ''}{featuredGame.wpa.toFixed(1)}% WPA</span>
            <span>·</span>
            <span>HRV {whoopData.hrv_delta}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
