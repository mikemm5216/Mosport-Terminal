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

import { PAGE_SHELL_STYLE, BREAKPOINTS } from '../lib/ui'
import { useWindowWidth } from '../lib/useWindowWidth'

export default function DetailPage({ m, onBack, user, onAuthRequired }: Props) {
  const [recovery, setRecovery] = useState(m.recovery_away)
  const [v11, setV11] = useState<V11Decision | null>(null)
  const [v11Live, setV11Live] = useState(false)
  const width = useWindowWidth()
  const isMobile = width < BREAKPOINTS.mobile
  const isTablet = width < BREAKPOINTS.tablet

  // ... (keep effects and logic same)

  return (
    <div style={PAGE_SHELL_STYLE}>
      <div className="py-6 sm:py-8 lg:py-10">
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 14, marginBottom: 24 }}>
          <button onClick={onBack} style={{
            padding: "8px 16px",
            background: "#050b1b", border: "1px solid rgba(148,163,184,0.12)",
            color: "#94a3b8", borderRadius: 4, cursor: "pointer",
            fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800,
            letterSpacing: "0.24em",
          }}>← {isMobile ? 'BACK' : 'BACK TO SLATE'}</button>
          <LeagueBadge league={m.league} size={isMobile ? "md" : "lg"} />
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "#475569", letterSpacing: "0.26em", textTransform: "uppercase" }}>
            WAR ROOM / {m.id}
          </span>
          {!isMobile && v11Live && (
            <div style={{ marginLeft: "auto", fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#34d399", letterSpacing: "0.26em", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399", display: "inline-block", animation: "pulse-dot 1.4s infinite" }} />
              V11.1 ARBITER LIVE
            </div>
          )}
        </div>

        {/* Match header */}
        <div style={{
          padding: isMobile ? "20px" : "28px 32px",
          background: "linear-gradient(90deg, #050b1b, #040917 60%, #050b1b)",
          borderTop: "1px solid rgba(148,163,184,0.08)",
          borderRight: "1px solid rgba(148,163,184,0.08)",
          borderBottom: "1px solid rgba(148,163,184,0.08)",
          borderLeft: `3px solid ${t.hex}`,
          borderRadius: 8, marginBottom: 24,
          display: "flex", flexDirection: isMobile ? "column" : "row",
          alignItems: "center", justifyContent: "space-between", gap: isMobile ? 32 : 40,
        }}>
          {/* Away */}
          <div style={{ display: "flex", alignItems: "center", gap: 18, order: isMobile ? 2 : 1 }}>
            {isMobile && <TeamMark abbr={m.away.abbr} league={m.league} size={64} />}
            <div style={{ textAlign: isMobile ? "left" : "right" }}>
              <div style={{ fontFamily: "var(--font-inter), Inter", fontWeight: 900, fontStyle: "italic", fontSize: isMobile ? 36 : 48, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1 }}>
                {m.away.abbr}
              </div>
              <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "#64748b", letterSpacing: "0.24em", marginTop: 4, textTransform: "uppercase" }}>
                {m.away.city} · AWAY
              </div>
            </div>
            {!isMobile && <TeamMark abbr={m.away.abbr} league={m.league} size={84} />}
          </div>

          {/* Center */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, order: isMobile ? 1 : 2 }}>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: t.hex, letterSpacing: "0.32em", fontWeight: 800 }}>
              {m.status === "LIVE"
                ? <><LiveDot color={t.hex} size={7} /> &nbsp;LIVE</>
                : `FIRST PITCH ${m.time}`
              }
            </div>
            <div style={{ fontFamily: "var(--font-inter), Inter", fontWeight: 900, fontSize: isMobile ? 40 : 44, color: "#94a3b8", letterSpacing: "0.2em", fontStyle: "italic" }}>
              {m.score ? (
                <span style={{ color: m.status === "LIVE" ? "#ef4444" : "#fff" }}>
                  {m.score.away} <span style={{ color: "#1e293b" }}>–</span> {m.score.home}
                </span>
              ) : "TBD"}
            </div>
            {!isMobile && (
              <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#475569", letterSpacing: "0.28em", fontWeight: 700, textTransform: "uppercase" }}>
                {m.home.city} · HOME GROUND
              </div>
            )}
          </div>

          {/* Home */}
          <div style={{ display: "flex", alignItems: "center", gap: 18, order: isMobile ? 3 : 3 }}>
            <TeamMark abbr={m.home.abbr} league={m.league} size={isMobile ? 64 : 84} />
            <div>
              <div style={{ fontFamily: "var(--font-inter), Inter", fontWeight: 900, fontStyle: "italic", fontSize: isMobile ? 36 : 48, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1 }}>
                {m.home.abbr}
              </div>
              <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "#64748b", letterSpacing: "0.24em", marginTop: 4, textTransform: "uppercase" }}>
                {m.home.city} · HOME
              </div>
            </div>
          </div>
        </div>

        {/* Two-column layout -> Stacks on tablet/mobile */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: isTablet ? "1fr" : "1.1fr 1fr", 
          gap: 24, 
          marginBottom: 24 
        }}>
          <MatchupGauge m={m} adjustedOverride={adjusted} v11={v11} />
          <WhoopBioPanel m={m} recovery={recovery} setRecovery={setRecovery} />
        </div>

        {/* Decision terminal */}
        <div style={{ marginBottom: 32 }}>
          <DecisionTerminal m={m} recovery={recovery} v11={v11} />
        </div>

        {/* Social & Data Layers */}
        <div style={{ display: "grid", gap: 24 }}>
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
        </div>

        <SystemFooter live={v11Live} />
      </div>
    </div>
  )
}
