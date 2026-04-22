'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Match } from '../data/mockData'
import { leagueTheme, TeamMark, LeagueBadge, LiveDot } from './ui'
import MatchupGauge from './MatchupGauge'
import WhoopBioPanel from './WhoopBioPanel'
import DecisionTerminal from './DecisionTerminal'

interface Props {
  m: Match
  onBack: () => void
}

function SystemFooter() {
  return (
    <div style={{
      maxWidth: 1400, margin: "0 auto", padding: "12px 24px",
      borderTop: "1px solid rgba(148,163,184,0.06)",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#334155",
      letterSpacing: "0.22em",
    }}>
      <span>CORE_VER 4.3.0 &nbsp; // &nbsp; DATA_SD_BOX_SECURE</span>
      <span>TACTICAL ENGINE: MOSPORT &nbsp; // &nbsp; ENCRYPTION: AES-256</span>
    </div>
  )
}

export default function DetailPage({ m, onBack }: Props) {
  const [recovery, setRecovery] = useState(m.recovery_away)
  useEffect(() => { setRecovery(m.recovery_away) }, [m.id])

  // Socket: recovery changes → adjusted win%
  const adjusted = useMemo(() => {
    const baselineRec = m.recovery_away
    const delta = (recovery - baselineRec) * 0.3
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
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "#22d3ee", letterSpacing: "0.26em" }}>
          ENCRYPTED STREAM // DATALINK ACTIVE
        </span>
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
            VS
          </div>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#475569", letterSpacing: "0.28em", fontWeight: 700 }}>
            CITI FIELD · DOME CLOSED
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
        <MatchupGauge m={m} adjustedOverride={adjusted} />
        <WhoopBioPanel m={m} recovery={recovery} setRecovery={setRecovery} />
      </div>

      {/* Decision terminal */}
      <DecisionTerminal m={m} recovery={recovery} />

      <SystemFooter />
    </div>
  )
}
