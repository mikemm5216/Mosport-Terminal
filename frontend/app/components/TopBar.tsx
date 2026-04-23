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
}

export default function TopBar({ onHome }: Props) {
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
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(2,6,23,0.9)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(148,163,184,0.08)",
    }}>
      <div style={{
        maxWidth: 1400, margin: "0 auto",
        padding: isMobile ? "10px 14px" : "14px 24px",
        display: "flex", alignItems: "center", gap: isMobile ? 10 : 20,
      }}>
        {/* Logo */}
        <div onClick={onHome} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flexShrink: 0 }}>
          <div style={{
            width: isMobile ? 24 : 28, height: isMobile ? 24 : 28, borderRadius: 4,
            background: "linear-gradient(135deg, #22d3ee, #0891b2)",
            display: "grid", placeItems: "center",
            boxShadow: "0 0 18px rgba(34,211,238,0.5)",
          }}>
            <span style={{ fontFamily: "var(--font-inter), Inter", fontWeight: 900, fontSize: isMobile ? 13 : 16, color: "#020617" }}>M</span>
          </div>
          <span style={{
            fontFamily: "var(--font-inter), Inter, sans-serif",
            fontWeight: 900, fontSize: isMobile ? 13 : 16, color: "#fff", letterSpacing: "0.18em",
          }}>MOSPORT</span>
        </div>

        {/* Primary nav — hidden on mobile */}
        {!isMobile && (
          <nav style={{ display: "flex", gap: 4, marginLeft: 12 }}>
            {(["SCHEDULE", "LEAGUES", "TEAMS", "SIGNALS", "LAB"] as const).map((n, i) => {
              const isSchedule = i === 0
              return (
                <div
                  key={n}
                  title={!isSchedule ? "Coming Soon" : undefined}
                  style={{
                    padding: "6px 12px",
                    fontFamily: "var(--font-mono), monospace",
                    fontWeight: 700, fontSize: 10, letterSpacing: "0.24em",
                    color: isSchedule ? "#22d3ee" : "rgba(100,116,139,0.5)",
                    borderBottom: isSchedule ? "1px solid #22d3ee" : "1px solid transparent",
                    cursor: isSchedule ? "pointer" : "not-allowed",
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
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 16, flexShrink: 0 }}>
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
            <span style={{ color: "#1e293b" }}>{isMobile ? "" : `:${ss}`}</span>
          </div>
        </div>
      </div>

      <GameStatusTicker />
    </div>
  )
}
