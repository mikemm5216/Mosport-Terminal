'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Match } from '../data/mockData'
import { leagueTheme, TeamMark, LeagueBadge, LiveDot } from './ui'
import MatchupGauge from './MatchupGauge'
import WhoopBioPanel from './WhoopBioPanel'
import DecisionTerminal from './DecisionTerminal'
import KeyboardCoachesPanel from './KeyboardCoachesPanel'
import DataChallengePanel from './DataChallengePanel'
import { matchToV11Input } from '../lib/v11'
import type { V11Decision } from '../lib/v11'

interface Props {
  m: Match
  onBack: () => void
  user?: any
  onAuthRequired: () => void
}

function SystemFooter({ live }: { live: boolean }) {
  return (
    <div style={{
      maxWidth: 1400, margin: "0 auto", padding: "12px 24px",
      borderTop: "1px solid rgba(148,163,184,0.06)",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#334155",
      letterSpacing: "0.22em",
    }}>
      <span>CORE_VER 11.1.0 &nbsp; // &nbsp; MULTI-AGENT RUNTIME</span>
      <span style={{ color: live ? "#34d399" : "#334155" }}>
        {live ? "● ENGINE LIVE" : "○ ENGINE OFFLINE"} &nbsp; // &nbsp; ARBITER: AES-256
      </span>
    </div>
  )
}

export default function DetailPage({ m, onBack, user, onAuthRequired }: Props) {
  const [recovery, setRecovery] = useState(m.recovery_away)
  const [v11, setV11] = useState<V11Decision | null>(null)
  const [v11Live, setV11Live] = useState(false)

  // Reset on match change
  useEffect(() => {
    setRecovery(m.recovery_away)
    setV11(null)
  }, [m.id])

  // Re-call V11 whenever recovery changes (debounced 300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      const input = matchToV11Input(m, recovery)
      fetch('/api/organism', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && !data.error) {
            setV11(data as V11Decision)
            setV11Live(true)
          }
        })
        .catch(() => {})
    }, 300)
    return () => clearTimeout(timer)
  }, [m.id, recovery])

  // Fallback local-computed adjusted probability (used when V11 offline)
  const adjusted = useMemo(() => {
    const delta = (recovery - m.recovery_away) * 0.3
    return Math.max(0.02, Math.min(0.98, m.physio_adjusted + delta))
  }, [recovery, m])

  const t = leagueTheme(m.league)

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 24px 40px" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <button onClick={onBack} style={{
          padding: "6px 12px",
          background: "#050b1b", border: "1px solid rgba(148,163,184,0.12)",
          color: "#94a3b8", borderRadius: 3, cursor: "pointer",
          fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800,
          letterSpacing: "0.24em",
        }}>← BACK TO SLATE</button>
        <LeagueBadge league={m.league} size="lg" />
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "#475569", letterSpacing: "0.26em" }}>
          WAR ROOM / MATCH {m.id.toUpperCase()}
        </span>
        <div style={{ flex: 1 }} />
        {v11Live && (
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#34d399", letterSpacing: "0.26em", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399", display: "inline-block", animation: "pulse-dot 1.4s infinite" }} />
            V11.1 ARBITER LIVE
          </span>
        )}
      </div>

      {/* Match header */}
      <div style={{
        padding: "24px 28px",
        background: "linear-gradient(90deg, #050b1b, #040917 60%, #050b1b)",
        borderTop: "1px solid rgba(148,163,184,0.08)",
        borderRight: "1px solid rgba(148,163,184,0.08)",
        borderBottom: "1px solid rgba(148,163,184,0.08)",
        borderLeft: `3px solid ${t.hex}`,
        borderRadius: 6, marginBottom: 20,
        display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 40,
      }}>
        {/* Away */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, justifyContent: "flex-end" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "var(--font-inter), Inter", fontWeight: 900, fontStyle: "italic", fontSize: 44, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1 }}>
              {m.away.abbr}
            </div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "#64748b", letterSpacing: "0.24em", marginTop: 4 }}>
              {m.away.city} · AWAY
            </div>
          </div>
          <TeamMark abbr={m.away.abbr} league={m.league} size={74} />
        </div>

        {/* Center */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: t.hex, letterSpacing: "0.32em", fontWeight: 800 }}>
            {m.status === "LIVE"
              ? <><LiveDot color={t.hex} size={7} /> &nbsp;LIVE</>
              : `FIRST PITCH ${m.time}`
            }
          </div>
          <div style={{ fontFamily: "var(--font-inter), Inter", fontWeight: 900, fontSize: 18, color: "#94a3b8", letterSpacing: "0.2em", fontStyle: "italic" }}>
            {m.score ? (
              <span style={{ color: m.status === "LIVE" ? "#ef4444" : "#fff", fontSize: 32 }}>
                {m.score.away} <span style={{ color: "#334155" }}>–</span> {m.score.home}
              </span>
            ) : "TBD"}
          </div>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#475569", letterSpacing: "0.28em", fontWeight: 700 }}>
            {m.home.city} · HOME GROUND
          </div>
        </div>

        {/* Home */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <TeamMark abbr={m.home.abbr} league={m.league} size={74} />
          <div>
            <div style={{ fontFamily: "var(--font-inter), Inter", fontWeight: 900, fontStyle: "italic", fontSize: 44, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1 }}>
              {m.home.abbr}
            </div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "#64748b", letterSpacing: "0.24em", marginTop: 4 }}>
              {m.home.city} · HOME
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 18, marginBottom: 18 }}>
        <MatchupGauge m={m} adjustedOverride={adjusted} v11={v11} />
        <WhoopBioPanel m={m} recovery={recovery} setRecovery={setRecovery} />
      </div>

      {/* Decision terminal */}
      <DecisionTerminal m={m} recovery={recovery} v11={v11} />

      {/* Social & Data Layers */}
      <KeyboardCoachesPanel 
        matchId={m.id} 
        league={m.league} 
        user={user} 
        onAuthRequired={onAuthRequired} 
      />
      
      <DataChallengePanel 
        matchId={m.id} 
        user={user} 
        onAuthRequired={onAuthRequired} 
      />

      <SystemFooter live={v11Live} />
    </div>
  )
}
