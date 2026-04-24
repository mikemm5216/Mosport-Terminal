'use client'

import { useState, useEffect } from 'react'
import type { League } from '../data/mockData'
import { getTeamLogo, TEAM_LOGO_FALLBACK } from '../lib/teamLogoResolver'

interface Props {
  teamAbbr: string
  league: League
  size: number
  accentColor: string
}

export default function TeamLogo({ teamAbbr, league, size, accentColor }: Props) {
  const [error, setError] = useState(false)
  const src = getTeamLogo(league, teamAbbr)

  useEffect(() => {
    setError(false)
  }, [teamAbbr, league])

  if (error || src === TEAM_LOGO_FALLBACK) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 6,
        background: `${accentColor}10`,
        border: `1px solid ${accentColor}30`,
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        <span style={{
          fontFamily: 'var(--font-mono), monospace',
          fontSize: Math.round(size * 0.22),
          fontWeight: 900, color: accentColor,
          letterSpacing: '0.06em',
        }}>
          {teamAbbr}
        </span>
      </div>
    )
  }

  return (
    <div style={{ width: size, height: size, flexShrink: 0, position: 'relative' }}>
      <img
        src={src}
        alt={teamAbbr}
        onError={() => {
          console.warn('[logo-missing]', {
            league,
            rawCode: teamAbbr,
            normalizedCode: teamAbbr,
            canonicalKey: `${league}_${teamAbbr}`,
            expectedPath: src,
          })
          setError(true)
        }}
        style={{
          width: '100%', height: '100%',
          objectFit: 'contain',
          filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.15))',
        }}
      />
    </div>
  )
}
