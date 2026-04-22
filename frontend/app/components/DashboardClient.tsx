'use client'

import { useState, useEffect } from 'react'
import { FEATURED_GAME, WHOOP_DATA } from '../data/mockData'
import MatchupGauge from './MatchupGauge'
import WhoopBioPanel from './WhoopBioPanel'
import DecisionTerminal from './DecisionTerminal'

interface Props {
  children: React.ReactNode
}

// Physiological adjustment formula:
// At recovery=91 → adjusted = 43.2% (matches spec exactly)
// Scale: ±0.134pp per 1% recovery change from baseline
function computeAdjusted(recovery: number) {
  return FEATURED_GAME.baseline_win_pct + (recovery - 50) * 0.134
}

export default function DashboardClient({ children }: Props) {
  const [recovery, setRecovery] = useState(WHOOP_DATA.recovery)
  const adjustedWin = computeAdjusted(recovery)

  // Simulate live bio socket — subtle micro-fluctuations to show live feed
  useEffect(() => {
    const id = setInterval(() => {
      setRecovery(r => {
        const delta = (Math.random() - 0.5) * 0.8  // ±0.4% drift
        return Math.max(60, Math.min(100, r + delta))
      })
    }, 3000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      {/* Left: Matchup Gauge */}
      <MatchupGauge game={FEATURED_GAME} adjustedWin={adjustedWin} />

      {/* Center: Decision stream (passed as children) */}
      <main className="py-6 px-6 overflow-y-auto flex flex-col">
        {children}

        {/* Bottom: Decision Terminal */}
        <div className="mt-auto pt-6">
          <DecisionTerminal
            whoopData={{ ...WHOOP_DATA, recovery }}
            featuredGame={FEATURED_GAME}
            adjustedWin={adjustedWin}
          />
        </div>
      </main>

      {/* Right: Bio Panel */}
      <WhoopBioPanel
        data={{ ...WHOOP_DATA, recovery }}
        onRecoveryChange={setRecovery}
      />
    </>
  )
}
