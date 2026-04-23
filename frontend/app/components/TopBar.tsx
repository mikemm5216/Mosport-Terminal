'use client'

import { useState, useEffect } from 'react'
import { TODAY_MATCHES } from '../data/mockData'
import { leagueTheme, LiveDot } from './ui'
import { useWindowWidth } from '../lib/useWindowWidth'

function GameStatusTicker() {
  const matches = TODAY_MATCHES
  const renderItem = (m: typeof matches[0], key: string | number) => {
    const t = leagueTheme(m.league)
    const isLive = m.status === "LIVE"
    const isFinal = m.status === "FINAL"
    const scoreStr = m.score ? `${m.score.away} – ${m.score.home}` : m.time
    const statusColor = isLive ? "#ef4444" : isFinal ? "#34d399" : t.hex
    return (
      <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: 8, marginRight: 28 }}>
        <span style={{ color: t.hex, fontWeight: 800 }}>{m.league}</span>
        <span style={{ color: "#64748b" }}>·</span>
        <span style={{ color: "#e2e8f0", fontWeight: 800 }}>{m.away.abbr}</span>
        <span style={{ color: "#334155" }}>@</span>
        <span style={{ color: "#e2e8f0", fontWeight: 800 }}>{m.home.abbr}</span>
        <span style={{ marginLeft: 4, color: statusColor, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}>
          {isLive && <LiveDot size={4} />}
          {isFinal ? `FINAL ${scoreStr}` : isLive ? `LIVE ${scoreStr}` : scoreStr}
        </span>
        <span style={{ color: "#1e293b", marginLeft: 16 }}>◆</span>
      </span>
    )
  }

  return (
    <div style={{
      borderTop: "1px solid rgba(148,163,184,0.05)",
      padding: "6px 16px", overflow: "hidden", whiteSpace: "nowrap",
      fontFamily: "var(--font-mono), monospace", fontSize: 10,
      color: "#475569", letterSpacing: "0.18em",
    }}>
      <div style={{ animation: "tick-marquee 80s linear infinite", display: "inline-block" }}>
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
}

export default function TopBar({ onHome, activeTab = "SCHEDULE", onTabChange }: Props) {
  const [time, setTime] = useState<Date | null>(null)
  const width = useWindowWidth()
  const isMobile = width < 640

  useEffect(() => {
    setTime(new Date())
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const hh = time ? String(time.getUTCHours()).padStart(2, "0") : "--"
  const mm = time ? String(time.getUTCMinutes()).padStart(2, "0") : "--"
  const ss = time ? String(time.getUTCSeconds()).padStart(2, "0") : "--"

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "rgba(2,6,23,0.95)", backdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(34,211,238,0.1)",
      paddingTop: isMobile ? "env(safe-area-inset-top)" : 0,
    }}>
      <div style={{
        maxWidth: 1400, margin: "0 auto",
        padding: isMobile ? "12px 16px" : "14px 24px",
        display: "flex", alignItems: "center", gap: isMobile ? 12 : 20,
      }}>
        {/* Logo */}
        <div onClick={onHome} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flexShrink: 0 }}>
          <div style={{
            width: isMobile ? 24 : 28, height: isMobile ? 24 : 28, borderRadius: 4,
            background: "linear-gradient(135deg, #22d3ee, #0891b2)",
            display: "grid", placeItems: "center",
            boxShadow: "0 0 15px rgba(34,211,238,0.4)",
          }}>
            <span style={{ fontFamily: "var(--font-inter), Inter", fontWeight: 900, fontSize: isMobile ? 13 : 16, color: "#020617" }}>M</span>
          </div>
          <span style={{
            fontFamily: "var(--font-inter), Inter, sans-serif",
            fontWeight: 900, fontSize: isMobile ? 14 : 16, color: "#fff", letterSpacing: "0.22em",
          }}>MOSPORT</span>
        </div>

        {/* Navigation context for mobile / Nav for desktop */}
        {isMobile ? (
          <div style={{
            marginLeft: 4, padding: "4px 8px", background: "rgba(34,211,238,0.05)", 
            borderRadius: 2, border: "1px solid rgba(34,211,238,0.2)"
          }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 900, color: "#22d3ee", letterSpacing: "0.2em" }}>
              {activeTab}
            </span>
          </div>
        ) : (
          <nav style={{ display: "flex", gap: 4, marginLeft: 12 }}>
            {(["SCHEDULE", "LEAGUES", "PLAYERS", "LAB"] as const).map((n) => {
              const isActive = activeTab === n
              return (
                <div
                  key={n}
                  onClick={() => onTabChange && onTabChange(n)}
                  style={{
                    padding: "6px 12px",
                    fontFamily: "var(--font-mono), monospace",
                    fontWeight: 700, fontSize: 10, letterSpacing: "0.24em",
                    color: isActive ? "#22d3ee" : "rgba(100,116,139,0.5)",
                    borderBottom: isActive ? "1px solid #22d3ee" : "1px solid transparent",
                    cursor: "pointer",
                  }}
                >
                  {n}
                </div>
              )
            })}
          </nav>
        )}

        <div style={{ flex: 1 }} />

        {/* System status */}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 16, flexShrink: 0 }}>
          {!isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <LiveDot color="#34d399" size={5} />
              <span style={{
                fontFamily: "var(--font-mono), monospace", fontSize: 9,
                color: "#34d399", fontWeight: 800, letterSpacing: "0.28em",
              }}>SYSTEM ACTIVE</span>
            </div>
          )}
          <div style={{
            fontFamily: "var(--font-mono), monospace", fontSize: isMobile ? 9 : 10,
            color: "#475569", letterSpacing: "0.18em",
          }}>
            {isMobile ? `${hh}:${mm}` : `UTC ${hh}:${mm}`}
            {!isMobile && <span style={{ color: "#1e293b" }}>:{ss}</span>}
          </div>
        </div>
      </div>

      {!isMobile && <GameStatusTicker />}
    </div>
  )
}
