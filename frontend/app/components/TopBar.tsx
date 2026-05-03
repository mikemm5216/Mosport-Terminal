'use client'

import { useState, useEffect } from 'react'
import { leagueTheme, LiveDot } from './ui'
import { useWindowWidth } from '../lib/useWindowWidth'
import { useMatchesContext } from '../context/MatchesContext'
import type { ProductMode } from '../contracts/product'

function GameStatusTicker() {
  const { matches } = useMatchesContext()
  const renderItem = (m: typeof matches[0], key: string | number) => {
    const t = leagueTheme(m.league)
    const isLive = m.status === 'LIVE'
    const isFinal = m.status === 'FINAL'
    const scoreStr = m.score ? `${m.score.away} – ${m.score.home}` : m.time
    const statusColor = isLive ? '#ef4444' : isFinal ? '#34d399' : t.hex
    return (
      <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginRight: 28 }}>
        <span style={{ color: t.hex, fontWeight: 800 }}>{m.league}</span>
        <span style={{ color: '#64748b' }}>·</span>
        <span style={{ color: '#e2e8f0', fontWeight: 800 }}>{m.away.abbr}</span>
        <span style={{ color: '#334155' }}>@</span>
        <span style={{ color: '#e2e8f0', fontWeight: 800 }}>{m.home.abbr}</span>
        <span style={{ marginLeft: 4, color: statusColor, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {isLive && <LiveDot size={4} />}
          {isFinal ? `FINAL ${scoreStr}` : isLive ? `LIVE ${scoreStr}` : scoreStr}
        </span>
        <span style={{ color: '#1e293b', marginLeft: 16 }}>◆</span>
      </span>
    )
  }

  return (
    <div style={{
      borderTop: '1px solid rgba(148,163,184,0.05)',
      padding: '6px 16px', overflow: 'hidden', whiteSpace: 'nowrap',
      fontFamily: 'var(--font-mono), monospace', fontSize: 10,
      color: '#475569', letterSpacing: '0.18em',
    }}>
      <div style={{ animation: 'tick-marquee 80s linear infinite', display: 'inline-block' }}>
        {matches.map((m, i) => renderItem(m, i))}
        {matches.map((m, i) => renderItem(m, i + 1000))}
      </div>
    </div>
  )
}

interface Props {
  onHome: () => void
  activeTab?: string
  onTabChange?: (tab: string) => void
  mode: ProductMode
  onModeChange: (mode: ProductMode) => void
  hideModeToggle?: boolean
  children?: React.ReactNode
}

import { BREAKPOINTS, PAGE_SHELL_STYLE } from '../lib/ui'

export default function TopBar({ onHome, activeTab = 'SCHEDULE', onTabChange, mode, onModeChange, hideModeToggle = false, children }: Props) {
  const [time, setTime] = useState<Date | null>(null)
  const width = useWindowWidth()
  const isMobile = width < BREAKPOINTS.mobile
  const isTablet = width < BREAKPOINTS.tablet

  useEffect(() => {
    setTime(new Date())
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const hh = time ? String(time.getUTCHours()).padStart(2, '0') : '--'
  const mm = time ? String(time.getUTCMinutes()).padStart(2, '0') : '--'
  const ss = time ? String(time.getUTCSeconds()).padStart(2, '0') : '--'
  const modeLabel = mode === 'live' ? '[ LIVE ]' : '[ SIM ]'

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(2,6,23,0.95)', backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(34,211,238,0.1)',
      paddingTop: isMobile ? 'env(safe-area-inset-top)' : 0,
      width: '100%',
    }}>
      <div style={{
        ...PAGE_SHELL_STYLE,
        paddingTop: isMobile ? 12 : 14,
        paddingBottom: isMobile ? 12 : 14,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 32 }}>
          <div onClick={onHome} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0 }}>
            <div style={{
              width: isMobile ? 24 : 28, height: isMobile ? 24 : 28, borderRadius: 4,
              background: 'linear-gradient(135deg, #22d3ee, #0891b2)',
              display: 'grid', placeItems: 'center',
              boxShadow: '0 0 15px rgba(34,211,238,0.4)',
            }}>
              <span style={{ fontFamily: 'var(--font-inter), Inter', fontWeight: 900, fontSize: isMobile ? 13 : 16, color: '#020617' }}>M</span>
            </div>
            <span style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 900, fontSize: isMobile ? 14 : 16, color: '#fff', letterSpacing: '0.22em' }}>
              {isMobile ? 'MOSPORT' : 'MOSPORT TERMINAL'}
            </span>
          </div>

          {!isMobile && mode === 'live' && (
            <nav style={{ display: 'flex', gap: 4 }}>
              {(['SCHEDULE', 'LEAGUES', 'PLAYERS', 'LAB'] as const).map((n) => {
                const isActive = activeTab === n
                return (
                  <div
                    key={n}
                    onClick={() => onTabChange && onTabChange(n)}
                    style={{
                      padding: '8px 12px', fontFamily: 'var(--font-mono), monospace', fontWeight: 700, fontSize: 10, letterSpacing: '0.24em',
                      color: isActive ? '#22d3ee' : 'rgba(148,163,184,0.4)',
                      borderBottom: isActive ? '2px solid #22d3ee' : '2px solid transparent', cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {n}
                  </div>
                )
              })}
            </nav>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 24, flexShrink: 1, minWidth: 0 }}>
          {!hideModeToggle && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {(['live', 'simulation'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => onModeChange(option)}
                  style={{
                    padding: isMobile ? '4px 6px' : '4px 10px', borderRadius: 3,
                    border: `1px solid ${mode === option ? '#22d3ee' : 'rgba(148,163,184,0.1)'}`,
                    color: mode === option ? '#22d3ee' : '#475569',
                    background: mode === option ? 'rgba(34,211,238,0.08)' : 'rgba(148,163,184,0.03)',
                    fontFamily: 'var(--font-mono), monospace', fontSize: isMobile ? 8 : 9, fontWeight: 800, letterSpacing: '0.12em', cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {option === 'simulation' ? (isMobile ? 'SIM' : 'SIMULATION') : 'LIVE'}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {!isMobile && !hideModeToggle && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <LiveDot color={mode === 'live' ? '#34d399' : '#fbbf24'} size={5} />
                <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 9, color: mode === 'live' ? '#34d399' : '#fbbf24', fontWeight: 800, letterSpacing: '0.18em' }}>{modeLabel}</span>
              </div>
            )}
            <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: isMobile ? 9 : 10, color: '#475569', letterSpacing: '0.18em', fontWeight: 700 }}>
              {isMobile ? `${hh}:${mm}` : `UTC ${hh}:${mm}`}
              {!isMobile && <span style={{ opacity: 0.4 }}>:{ss}</span>}
            </div>
            {children}
          </div>
        </div>
      </div>

      {!isMobile && mode === 'live' && <GameStatusTicker />}
    </div>
  )
}
