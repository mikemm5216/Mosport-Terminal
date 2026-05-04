'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Match, League, KeyPlayer } from '../data/mockData'
import { generateSimulatedPlayers, getPlayerBadgeLabel } from '../lib/playerReadiness'
import { useWindowWidth } from '../lib/useWindowWidth'
import { useMatchesContext, DataFreshnessBadge } from '../context/MatchesContext'
import { getCoachMetricLabels, leagueToSport } from '../lib/coachMetricLabels'
import { PAGE_SHELL_STYLE, BREAKPOINTS } from '../lib/ui'
import { leagueTheme, TeamMark, LeagueBadge, wpaColor, LiveDot, BioBar, RingGauge, TacticalLabel } from './ui'
import AuthModal from './AuthModal'

// ── Engagement Panel ───────────────────────────────────────────
function EngagementPanel({ m, onClose }: { m: Match; onClose: () => void }) {
  const [showAuth, setShowAuth] = useState(false)
  const [view, setView] = useState<'PREDICT' | 'COMMENT'>('PREDICT')
  const [prediction, setPrediction] = useState<'HOME' | 'AWAY' | null>(null)
  const [confidence, setConfidence] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM')
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handlePredict = async () => {
    // For now, trigger AuthModal if we need a login context, 
    // but allow the attempt to proceed if the user wants to test.
    // Real auth check should happen via API response or session cookie.
    setSubmitting(true)
    try {
      const stance = prediction === 'HOME' ? 'AGREE' : 'DISAGREE'
      const confMap = { LOW: 33, MEDIUM: 66, HIGH: 99 }
      const res = await fetch(`/api/matches/${m.id}/coach-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stance, confidence: confMap[confidence] })
      })
      
      if (res.status === 401 || res.status === 403) {
        setShowAuth(true)
        return
      }

      setSuccess(true)
      setTimeout(onClose, 1500)
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleComment = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/matches/${m.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          stance: 'WATCH_ONLY', 
          commentText: commentText.trim(),
          confidence: 50
        })
      })

      if (res.status === 401 || res.status === 403) {
        setShowAuth(true)
        return
      }

      setSuccess(true)
      setTimeout(onClose, 1500)
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div style={{ padding: 24, textAlign: "center", background: "rgba(52,211,153,0.05)", borderTop: "1px solid rgba(52,211,153,0.2)" }}>
        <div style={{ fontFamily: "var(--font-mono)", color: "#34d399", fontWeight: 900, fontSize: 12 }}>✓ ENGAGEMENT_RECORDED</div>
      </div>
    )
  }

  return (
    <div onClick={(e) => e.stopPropagation()} style={{ 
      padding: "20px 24px", background: "rgba(2,6,23,0.4)", borderTop: "1px solid rgba(34,211,238,0.1)",
      display: "flex", flexDirection: "column", gap: 20
    }}>
      {showAuth && <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />}
      
      <div style={{ display: "flex", gap: 16 }}>
        <button 
          onClick={() => setView('PREDICT')}
          style={{ 
            fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 900, letterSpacing: "0.2em",
            color: view === 'PREDICT' ? "#22d3ee" : "#475569", background: "none", border: "none", cursor: "pointer",
            borderBottom: view === 'PREDICT' ? "2px solid #22d3ee" : "2px solid transparent", paddingBottom: 4
          }}
        >PREDICT</button>
        <button 
          onClick={() => setView('COMMENT')}
          style={{ 
            fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 900, letterSpacing: "0.2em",
            color: view === 'COMMENT' ? "#22d3ee" : "#475569", background: "none", border: "none", cursor: "pointer",
            borderBottom: view === 'COMMENT' ? "2px solid #22d3ee" : "2px solid transparent", paddingBottom: 4
          }}
        >COMMENT</button>
      </div>

      {view === 'PREDICT' ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <button 
              onClick={() => setPrediction('AWAY')}
              style={{ 
                flex: 1, padding: "12px", background: prediction === 'AWAY' ? "rgba(34,211,238,0.1)" : "rgba(15,23,42,0.6)",
                border: `1px solid ${prediction === 'AWAY' ? "#22d3ee" : "rgba(148,163,184,0.1)"}`,
                borderRadius: 4, color: prediction === 'AWAY' ? "#fff" : "#64748b",
                fontFamily: "var(--font-inter)", fontWeight: 900, fontSize: 13, cursor: "pointer"
              }}
            >{m.away.abbr}</button>
            <button 
              onClick={() => setPrediction('HOME')}
              style={{ 
                flex: 1, padding: "12px", background: prediction === 'HOME' ? "rgba(34,211,238,0.1)" : "rgba(15,23,42,0.6)",
                border: `1px solid ${prediction === 'HOME' ? "#22d3ee" : "rgba(148,163,184,0.1)"}`,
                borderRadius: 4, color: prediction === 'HOME' ? "#fff" : "#64748b",
                fontFamily: "var(--font-inter)", fontWeight: 900, fontSize: 13, cursor: "pointer"
              }}
            >{m.home.abbr}</button>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#475569", letterSpacing: "0.1em" }}>CONFIDENCE</span>
            <div style={{ display: "flex", gap: 8, flex: 1 }}>
              {(['LOW', 'MEDIUM', 'HIGH'] as const).map(c => (
                <button 
                  key={c}
                  onClick={() => setConfidence(c)}
                  style={{ 
                    flex: 1, padding: "6px", background: "none", borderRadius: 3,
                    border: `1px solid ${confidence === c ? "#22d3ee" : "rgba(148,163,184,0.1)"}`,
                    color: confidence === c ? "#22d3ee" : "#475569",
                    fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, cursor: "pointer"
                  }}
                >{c}</button>
              ))}
            </div>
          </div>

          <button 
            disabled={!prediction || submitting}
            onClick={handlePredict}
            style={{ 
              padding: "10px", background: "#22d3ee", borderRadius: 4, border: "none",
              color: "#020617", fontFamily: "var(--font-mono)", fontWeight: 900, fontSize: 10,
              letterSpacing: "0.1em", cursor: prediction ? "pointer" : "not-allowed", opacity: prediction ? 1 : 0.5
            }}
          >{submitting ? "RECORDING..." : "LOCK IN PREDICTION"}</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <textarea 
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add quick tactical insight..."
            style={{ 
              width: "100%", height: 80, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.1)",
              borderRadius: 4, padding: 12, color: "#fff", fontFamily: "var(--font-inter)", fontSize: 13,
              resize: "none", outline: "none"
            }}
          />
          <button 
            disabled={!commentText.trim() || submitting}
            onClick={handleComment}
            style={{ 
              alignSelf: "flex-end", padding: "8px 20px", background: "#22d3ee", borderRadius: 4, border: "none",
              color: "#020617", fontFamily: "var(--font-mono)", fontWeight: 900, fontSize: 10,
              letterSpacing: "0.1em", cursor: "pointer"
            }}
          >{submitting ? "POSTING..." : "POST INSIGHT"}</button>
        </div>
      )}
    </div>
  )
}

// ── Date helpers ─────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function getMatchDate(m: Match): string {
  const parts = m.id.split('_')
  const last = parts[parts.length - 1]
  return /^\d{4}-\d{2}-\d{2}$/.test(last) ? last : todayISO()
}
const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"]
const WEEKDAYS = ["SUN","MON","TUE","WED","THU","FRI","SAT"]

function formatDateLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date(y, m - 1, d)
  return `${MONTHS[dt.getMonth()]} ${String(d).padStart(2,"0")}, ${y} · ${WEEKDAYS[dt.getDay()]}`
}

// ── Date pill ────────────────────────────────────────────────
function DatePill({ date, dates, todayDate, onPrev, onNext }: {
  date: string
  dates: string[]
  todayDate: string
  onPrev: () => void
  onNext: () => void
}) {
  const idx = dates.indexOf(date)
  const isToday = date === todayDate
  const canPrev = idx > 0
  const canNext = idx < dates.length - 1

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button
        onClick={onPrev}
        disabled={!canPrev}
        style={{
          background: "#050b1b",
          border: `1px solid ${canPrev ? "rgba(148,163,184,0.2)" : "rgba(148,163,184,0.06)"}`,
          color: canPrev ? "#94a3b8" : "#1e293b",
          width: 32, height: 32, borderRadius: 6,
          cursor: canPrev ? "pointer" : "not-allowed",
          fontFamily: "var(--font-mono), monospace", fontSize: 16,
          display: "grid", placeItems: "center",
          transition: "all 150ms",
        }}
      >‹</button>

      <div style={{
        padding: "8px 18px",
        background: "#050b1b",
        border: `1px solid ${isToday ? "rgba(34,211,238,0.35)" : "rgba(148,163,184,0.15)"}`,
        borderRadius: 6,
        fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800,
        color: "#fff", letterSpacing: "0.18em",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{
          color: isToday ? "#22d3ee" : "#f97316",
          fontSize: 7, letterSpacing: "0.24em",
        }}>{isToday ? "● TODAY" : "◈ ARCHIVED"}</span>
        {formatDateLabel(date)}
      </div>

      <button
        onClick={onNext}
        disabled={!canNext}
        style={{
          background: "#050b1b",
          border: `1px solid ${canNext ? "rgba(148,163,184,0.2)" : "rgba(148,163,184,0.06)"}`,
          color: canNext ? "#94a3b8" : "#1e293b",
          width: 32, height: 32, borderRadius: 6,
          cursor: canNext ? "pointer" : "not-allowed",
          fontFamily: "var(--font-mono), monospace", fontSize: 16,
          display: "grid", placeItems: "center",
          transition: "all 150ms",
        }}
      >›</button>
    </div>
  )
}

// ── Stat bar ──────────────────────────────────────────────────
function StatBar({ label, value, color, invert }: { label: string; value: number; color: string; invert?: boolean }) {
  const pct = Math.max(0, Math.min(1, value))
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{
          fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 700,
          color: "#64748b", letterSpacing: "0.24em",
        }}>{label}</span>
        <span style={{
          fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800,
          color, letterSpacing: "-0.02em",
        }}>{(pct * 100).toFixed(0)}%</span>
      </div>
      <div style={{ height: 4, background: "#0b1220", borderRadius: 1, overflow: "hidden", border: "1px solid rgba(148,163,184,0.05)" }}>
        <div style={{
          width: `${pct * 100}%`, height: "100%",
          background: invert
            ? `repeating-linear-gradient(45deg, ${color}88 0 3px, ${color}44 3px 6px)`
            : `linear-gradient(90deg, ${color}66, ${color})`,
          boxShadow: `0 0 6px ${color}66`,
        }} />
      </div>
    </div>
  )
}

// ── Team summary card ─────────────────────────────────────────
function TeamSummaryCard({ m, side }: { m: Match; side: "away" | "home" }) {
  const team = m[side]
  const recovery = side === "away" ? m.recovery_away : m.recovery_home
  const labels = getCoachMetricLabels(m.league)
  const bullpen = side === "away" ? 0.85 : 0.42
  const momentum = side === "away" ? 0.72 : 0.48
  const fatigue = side === "away" ? (m.league === "MLB" ? 0.20 : 0.15) : 0.0
  const recColor = recovery >= 0.8 ? "#34d399" : recovery >= 0.6 ? "#fbbf24" : "#f43f5e"
  const align: React.CSSProperties["alignItems"] = side === "away" ? "flex-end" : "flex-start"

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 14,
      padding: "16px 20px", background: "#030815",
      border: "1px solid rgba(148,163,184,0.08)", borderRadius: 6,
      alignItems: align,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        flexDirection: side === "away" ? "row-reverse" : "row",
      }}>
        <TeamMark abbr={team.abbr} league={m.league} size={36} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: align }}>
          <span style={{ fontFamily: "var(--font-inter), Inter", fontWeight: 900, fontSize: 16, color: "#fff", letterSpacing: "-0.02em" }}>
            {team.name}
          </span>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, color: "#475569", letterSpacing: "0.28em" }}>
            {side === "away" ? "AWAY" : "HOME"} · {team.city}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
        <StatBar label={labels.recovery} value={recovery} color={recColor} />
        <StatBar label={labels.depth} value={bullpen} color={bullpen >= 0.7 ? "#34d399" : bullpen >= 0.5 ? "#fbbf24" : "#f43f5e"} />
        <StatBar label={labels.momentum} value={momentum} color="#94a3b8" />
        <StatBar label={labels.fatigue} value={fatigue} color={fatigue > 0.15 ? "#f43f5e" : fatigue > 0.05 ? "#fbbf24" : "#34d399"} invert />
      </div>
    </div>
  )
}

// ── Center VS spine ───────────────────────────────────────────
function VsSpine({ m, isMobile }: { m: Match; isMobile?: boolean }) {
  const t = leagueTheme(m.league)
  const color = wpaColor(m.tactical_label)
  const sign = m.wpa >= 0 ? "+" : "−"
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
      padding: isMobile ? "24px 0" : "0 8px",
      minWidth: isMobile ? undefined : 180,
      justifyContent: "center",
    }}>
      <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800, color: "#475569", letterSpacing: "0.3em" }}>
        WIN PROBABILITY
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <span style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: isMobile ? 44 : 56,
          fontWeight: 900,
          color: t.hex, letterSpacing: "-0.04em", lineHeight: 1,
          textShadow: `0 0 30px ${t.hex}66`,
        }}>{(m.physio_adjusted * 100).toFixed(1)}%</span>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, color: "#64748b", letterSpacing: "0.26em" }}>
          {m.perspective} FAVORED
        </span>
      </div>
      <div style={{
        marginTop: 4, padding: "6px 14px",
        background: `${color}15`, border: `1px solid ${color}55`, borderRadius: 4,
        fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 900,
        color, letterSpacing: "0.06em",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: 9, letterSpacing: "0.24em", opacity: 0.7 }}>IMPACT</span>
        {sign}{(Math.abs(m.wpa) * 100).toFixed(1)}%
      </div>
    </div>
  )
}

// ── Player chip ───────────────────────────────────────────────
function PlayerChip({ p, isMobile }: { p: KeyPlayer; isMobile?: boolean }) {
  const flagColor = p.flag === "CLEAR" ? "#34d399" : p.flag === "MONITOR" ? "#fbbf24" : "#f43f5e"
  const flagLabel = p.flag === "CLEAR" ? "● CLEAR" : p.flag === "MONITOR" ? "● MONITOR" : "● REST"
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "32px 1fr 90px" : "36px 1fr 80px 80px 110px",
      alignItems: "center", gap: isMobile ? 12 : 16,
      padding: "8px 0", borderBottom: "1px solid rgba(148,163,184,0.04)"
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: "linear-gradient(135deg, #1e293b, #0b1220)",
        border: "1px solid rgba(148,163,184,0.15)",
        display: "grid", placeItems: "center",
        fontFamily: "var(--font-inter), Inter", fontWeight: 900, fontSize: 11, color: "#94a3b8",
      }}>{getPlayerBadgeLabel(p)}</div>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontFamily: "var(--font-inter), Inter", fontWeight: 800, fontSize: 13, color: "#fff", letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 700, color: "#475569", letterSpacing: "0.22em" }}>{p.pos}</span>
      </div>
      {!isMobile && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 12, fontWeight: 800, color: p.hrv >= 0 ? "#34d399" : "#f43f5e" }}>
            {p.hrv >= 0 ? "+" : ""}{(p.hrv * 100).toFixed(0)}%
          </span>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#475569", letterSpacing: "0.18em" }}>HRV Δ</span>
        </div>
      )}
      {!isMobile && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 12, fontWeight: 800, color: p.sleep <= 0.5 ? "#34d399" : p.sleep <= 1.2 ? "#fbbf24" : "#f43f5e" }}>
            {p.sleep.toFixed(1)}h
          </span>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#475569", letterSpacing: "0.18em" }}>SLEEP DEBT</span>
        </div>
      )}
      <div style={{
        textAlign: "center", padding: "6px 0", borderRadius: 4,
        background: `${flagColor}18`, border: `1px solid ${flagColor}50`,
        fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 900,
        color: flagColor, letterSpacing: "0.18em",
      }}>{flagLabel}</div>
    </div>
  )
}

// ── Key player row ─────────────────────────────────────────────
function KeyPlayerRow({ m, side, isMobile }: { m: Match; side: "away" | "home"; isMobile?: boolean }) {
  const team = m[side]
  const players = generateSimulatedPlayers(m, side)
  const t = leagueTheme(m.league)
  return (
    <div style={{
      padding: "16px 20px", background: "#030815",
      border: "1px solid rgba(148,163,184,0.08)", borderRadius: 6,
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: "1px dashed rgba(148,163,184,0.12)", paddingBottom: 10,
        marginBottom: 4,
      }}>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 900, color: t.hex, letterSpacing: "0.3em" }}>
          KEY PLAYERS · {team.abbr}
        </span>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 700, color: "#475569", letterSpacing: "0.22em" }}>
          BIOMETRICS
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {players.map((p, i) => <PlayerChip key={i} p={p} isMobile={isMobile} />)}
      </div>
    </div>
  )
}

// ── Expanded preview ───────────────────────────────────────────
function GameBarPreview({ m, onOpen, isMobile }: { m: Match; onOpen: (m: Match) => void; isMobile?: boolean }) {
  const t = leagueTheme(m.league)
  return (
    <div className="fade-in" style={{
      borderTop: "1px solid rgba(148,163,184,0.12)",
      padding: isMobile ? "24px 20px" : "32px 36px",
      background: "linear-gradient(180deg, #040917, #050b1b)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{
          fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 900,
          color: t.hex, letterSpacing: "0.36em",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.hex, boxShadow: `0 0 12px ${t.hex}` }} />
          KEY INTELLIGENCE LAYER
        </div>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800, color: "#475569", letterSpacing: "0.24em" }}>
          COMPLEXITY {(m.matchup_complexity * 100).toFixed(0)}
        </div>
      </div>

      {/* Team comparison */}
      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
          <VsSpine m={m} isMobile />
          <TeamSummaryCard m={m} side="away" />
          <TeamSummaryCard m={m} side="home" />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 32, alignItems: "stretch", marginBottom: 24 }}>
          <TeamSummaryCard m={m} side="away" />
          <VsSpine m={m} />
          <TeamSummaryCard m={m} side="home" />
        </div>
      )}

      {/* Key players */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: 20, marginBottom: 24,
      }}>
        <KeyPlayerRow m={m} side="away" isMobile={isMobile} />
        <KeyPlayerRow m={m} side="home" isMobile={isMobile} />
      </div>

      {/* Footer */}
      <div style={{
        display: "flex", alignItems: "center", gap: 20,
        flexDirection: isMobile ? "column" : "row",
        paddingTop: 24, borderTop: "1px dashed rgba(148,163,184,0.15)",
      }}>
        {!isMobile && (
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800, color: "#475569", letterSpacing: "0.24em" }}>
            FULL GAME BREAKDOWN · ROSTER READINESS · TACTICAL ENGINE →
          </span>
        )}
        {!isMobile && <div style={{ flex: 1 }} />}
        <button
          onClick={e => { e.stopPropagation(); onOpen(m) }}
          style={{
            width: isMobile ? "100%" : "auto",
            padding: "14px 32px",
            background: t.hex, border: "none", borderRadius: 6,
            fontFamily: "var(--font-mono), monospace", fontWeight: 900, fontSize: 11,
            color: "#020617", letterSpacing: "0.28em", cursor: "pointer",
            boxShadow: `0 0 25px ${t.hex}66`,
            transition: 'all 0.2s ease',
          }}
          className="hover:scale-[1.02] active:scale-[0.98]"
        >
          ENTER WAR ROOM ›
        </button>
      </div>
    </div>
  )
}

// ── Collapsible game bar ───────────────────────────────────────
function GameBar({ m, expanded, onToggle, onOpen, engagementId, onEngage }: {
  m: Match; expanded: boolean; onToggle: () => void; onOpen: (m: Match) => void;
  engagementId: string | null; onEngage: (id: string | null) => void;
}) {
  const w = useWindowWidth()
  const isMobile = w < BREAKPOINTS.mobile
  const isCompact = w < BREAKPOINTS.tablet

  const t = leagueTheme(m.league)
  const isLive = m.status === "LIVE"
  const isFinal = m.status === "FINAL"
  const sport = leagueToSport(m.league)
  
  const isEngaging = engagementId === m.id
  
  // Sport-specific progress formatting
  let displayTime = m.time
  if (isLive) {
    if (sport === 'BASEBALL') {
      // Expecting something like "Top 9" or "Bot 7"
      displayTime = m.time.includes('Top') || m.time.includes('Bot') ? m.time : `LIVE ${m.time}`
    } else if (sport === 'BASKETBALL' || sport === 'HOCKEY') {
      // Expecting something like "Q3 07:42" or "P2 12:00"
      displayTime = m.time
    } else if (sport === 'SOCCER') {
      // Expecting something like "67'"
      displayTime = m.time.includes("'") ? m.time : `${m.time}'`
    }
  }

  const statusColor = isLive ? "#ef4444" : isFinal ? "#34d399" : "#22d3ee"
  const statusLabel = isLive ? "● IN_PLAY" : isFinal ? "✓ FINAL" : "SCHEDULED"

  const containerStyle: React.CSSProperties = {
    background: expanded ? "#071127" : "#050b1b",
    borderTop: `1px solid ${expanded ? t.hex + "55" : "rgba(148,163,184,0.08)"}`,
    borderRight: `1px solid ${expanded ? t.hex + "55" : "rgba(148,163,184,0.08)"}`,
    borderBottom: `1px solid ${expanded ? t.hex + "55" : "rgba(148,163,184,0.08)"}`,
    borderLeft: `3px solid ${t.hex}`,
    borderRadius: 8, transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)", overflow: "hidden",
    boxShadow: expanded ? '0 20px 40px rgba(0,0,0,0.4)' : 'none',
  }

  return (
    <div onClick={onToggle} style={containerStyle} className="group cursor-pointer">
      {isMobile ? (
        /* ── Mobile header ── */
        <div style={{
          display: "flex", flexDirection: "column", padding: "20px", gap: 16,
        }}>
          {/* Top Row: Matchup + Status */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <TeamMark abbr={m.away.abbr} league={m.league} size={32} />
                <span style={{ fontFamily: "var(--font-inter)", fontWeight: 900, fontStyle: "italic", fontSize: 24, color: "#fff", letterSpacing: "-0.03em" }}>{m.away.abbr}</span>
                <span style={{ color: "#334155", fontSize: 14, fontFamily: "var(--font-mono)", fontWeight: 800 }}>@</span>
                <span style={{ fontFamily: "var(--font-inter)", fontWeight: 900, fontStyle: "italic", fontSize: 24, color: "#fff", letterSpacing: "-0.03em" }}>{m.home.abbr}</span>
                <TeamMark abbr={m.home.abbr} league={m.league} size={32} />
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 900, color: isLive ? "#ef4444" : "#e2e8f0" }}>{displayTime}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#475569", letterSpacing: "0.15em", fontWeight: 800 }}>{m.league} · {statusLabel}</div>
            </div>
          </div>

          {/* Decision Row */}
          <div style={{ 
            display: "flex", alignItems: "center", gap: 14, 
            padding: "12px 16px", background: "rgba(15,23,42,0.8)", borderRadius: 6,
            borderLeft: `3px solid ${wpaColor(m.tactical_label)}`
          }}>
            <div style={{
              padding: "5px 10px", background: `${wpaColor(m.tactical_label)}15`, borderRadius: 4,
              fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 900, color: wpaColor(m.tactical_label), letterSpacing: "0.12em"
            }}>
              [{m.tactical_label}]
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#64748b", letterSpacing: "0.15em", fontWeight: 800 }}>DECISION SCORE</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 900, color: "#fff" }}>{Math.abs(m.wpa).toFixed(2)}</span>
            </div>
            <div style={{ flex: 1 }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8 }}>
            <button 
              onClick={(e) => { e.stopPropagation(); onEngage(isEngaging ? null : m.id) }} 
              style={{ 
                display: "flex", alignItems: "center", gap: 10,
                background: isEngaging ? "#22d3ee" : "rgba(34,211,238,0.08)",
                border: `1px solid ${isEngaging ? "#22d3ee" : "rgba(34,211,238,0.2)"}`,
                padding: "6px 14px", borderRadius: 4, cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: isEngaging ? "#020617" : "#22d3ee", letterSpacing: "0.15em", fontWeight: 900 }}>
                {isEngaging ? "CLOSE ENGAGE ↑" : "ENGAGE"}
              </span>
            </button>
            <span style={{
              color: expanded ? t.hex : "#334155",
              fontSize: 18, transition: "transform 200ms",
              transform: expanded ? "rotate(90deg)" : "none",
            }}>›</span>
          </div>
        </div>
      ) : (
        /* ── Desktop / tablet header ── */
        <div style={{
          display: "grid",
          gridTemplateColumns: isCompact
            ? "100px 1fr 140px 1fr 80px 30px"
            : "130px 240px 180px 240px 110px 40px",
          alignItems: "center", gap: isCompact ? 12 : 24,
          padding: isCompact ? "16px 20px" : "24px 32px",
        }}>
          {/* Status + time */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: isCompact ? 16 : 20, fontWeight: 900,
              color: isLive ? "#ef4444" : isFinal ? "#64748b" : "#e2e8f0",
              letterSpacing: "-0.04em", lineHeight: 1,
            }}>{displayTime}</div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 900, color: statusColor, letterSpacing: "0.3em" }}>
              {statusLabel}
            </div>
          </div>

          {/* Away */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 44px", alignItems: "center", gap: 12 }}>
            <span style={{
              fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 900, fontStyle: "italic",
              fontSize: isCompact ? 22 : 32, color: "#fff", letterSpacing: "-0.04em", textAlign: "right",
              lineHeight: 1
            }}>{m.away.abbr}</span>
            <div style={{ justifySelf: "end" }}><TeamMark abbr={m.away.abbr} league={m.league} size={isCompact ? 36 : 44} /></div>
          </div>

          {/* Score or TBD */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {m.score ? (
                <>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 900, fontSize: isCompact ? 28 : 38, color: isLive ? "#ef4444" : "#fff", letterSpacing: "-0.05em", minWidth: 44, textAlign: "right" }}>{m.score.away}</span>
                  <span style={{ color: "#334155", fontSize: 20, fontWeight: 900 }}>–</span>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 900, fontSize: isCompact ? 28 : 38, color: isLive ? "#ef4444" : "#fff", letterSpacing: "-0.05em", minWidth: 44, textAlign: "left" }}>{m.score.home}</span>
                </>
              ) : (
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 13, fontWeight: 900, color: "#1e293b", letterSpacing: "0.5em" }}>TBD</span>
              )}
            </div>
          </div>

          {/* Home */}
          <div style={{ display: "grid", gridTemplateColumns: "44px 1fr", alignItems: "center", gap: 12 }}>
            <div style={{ justifySelf: "start" }}><TeamMark abbr={m.home.abbr} league={m.league} size={isCompact ? 36 : 44} /></div>
            <span style={{
              fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 900, fontStyle: "italic",
              fontSize: isCompact ? 22 : 32, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1
            }}>{m.home.abbr}</span>
          </div>

          {/* League badge */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <LeagueBadge league={m.league} size={isCompact ? "sm" : "lg"} />
          </div>

          {/* Chevron */}
          <div style={{
            display: "grid", placeItems: "center",
            color: expanded ? t.hex : "#334155",
            fontSize: 24, 
            transition: "all 200ms ease",
            transform: expanded ? "rotate(90deg)" : "none",
          }}>›</div>
        </div>
      )}

      {/* Prediction Snapshot Bar (Visible when not expanded) */}
      {!expanded && (
        <div style={{ 
          padding: "8px 24px", 
          background: "rgba(15,23,42,0.4)", 
          borderTop: "1px solid rgba(148,163,184,0.05)",
          display: isMobile ? "none" : "flex",
          alignItems: "center",
          gap: 32
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#475569", letterSpacing: "0.1em" }}>WIN PROB</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 900, color: t.hex }}>{(m.physio_adjusted * 100).toFixed(1)}%</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#475569", letterSpacing: "0.1em" }}>DECISION SCORE</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 900, color: wpaColor(m.tactical_label) }}>{Math.abs(m.wpa).toFixed(2)}</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
             <button 
                onClick={(e) => { e.stopPropagation(); onEngage(isEngaging ? null : m.id) }}
                style={{ 
                  background: isEngaging ? "#22d3ee" : "rgba(34,211,238,0.08)", border: `1px solid ${isEngaging ? "#22d3ee" : "rgba(34,211,238,0.2)"}`,
                  padding: "4px 12px", borderRadius: 4, cursor: "pointer",
                  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 900, color: isEngaging ? "#020617" : "#22d3ee",
                  transition: "all 0.2s ease"
                }}
              >{isEngaging ? "CLOSE ENGAGE ↑" : "ENGAGE"}</button>
             <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#64748b" }}>🗨 12</span>
             </div>
          </div>
        </div>
      )}

      {isEngaging && <EngagementPanel m={m} onClose={() => onEngage(null)} />}
      {expanded && <GameBarPreview m={m} onOpen={onOpen} isMobile={isMobile} />}
    </div>
  )
}

// ── Schedule page ──────────────────────────────────────────────
const LEAGUES: Array<"ALL" | League> = ["ALL", "MLB", "NBA", "EPL", "UCL", "NHL"]

export default function SchedulePage({ onOpen, onOpenLab }: { onOpen: (m: Match) => void; onOpenLab?: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [engagementId, setEngagementId] = useState<string | null>(null)
  const [filter, setFilter] = useState<"ALL" | League>("ALL")
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const { matches: allMatches, loading, error, dataFreshness, fallbackUsed, sourceProvider, refresh } = useMatchesContext()
  const w = useWindowWidth()
  const isMobile = w < BREAKPOINTS.mobile

  const availableDates = useMemo(() => [...new Set(allMatches.map(getMatchDate))].sort(), [allMatches])
  const TODAY_DATE = todayISO()

  function handlePrev() {
    const idx = availableDates.indexOf(selectedDate)
    if (idx > 0) { setSelectedDate(availableDates[idx - 1]); setExpandedId(null) }
  }
  function handleNext() {
    const idx = availableDates.indexOf(selectedDate)
    if (idx < availableDates.length - 1) { setSelectedDate(availableDates[idx + 1]); setExpandedId(null) }
  }

  const base = useMemo(() => allMatches.filter(m => getMatchDate(m) === selectedDate), [allMatches, selectedDate])
  const filtered = useMemo(() => filter === "ALL" ? base : base.filter(m => m.league === filter), [base, filter])
  const isArchived = selectedDate !== TODAY_DATE
  const finalCount = useMemo(() => base.filter(m => m.status === "FINAL").length, [base])
  const liveCount  = useMemo(() => base.filter(m => m.status === "LIVE").length, [base])

  return (
    <div style={PAGE_SHELL_STYLE}>
      <div className="py-8 sm:py-12 lg:py-16">
        {/* Page header */}
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "flex-end", gap: isMobile ? 32 : 24, marginBottom: 32, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 auto" }}>
            <h1 style={{
              margin: 0,
              fontFamily: "var(--font-inter), Inter, sans-serif",
              fontSize: "clamp(36px, 10vw, 64px)",
              fontWeight: 900, fontStyle: "italic",
              color: "#fff", letterSpacing: "-0.04em", lineHeight: 0.85,
            }}>
              MOSPORT <span style={{ color: "#22d3ee", fontStyle: "normal" }}>TERMINAL</span>
            </h1>
          </div>
          <DatePill date={selectedDate} dates={availableDates} todayDate={TODAY_DATE} onPrev={handlePrev} onNext={handleNext} />
        </div>

        {/* Summary strip */}
        <div style={{
          display: "flex", alignItems: "center", gap: 20,
          marginBottom: 24, flexWrap: "wrap",
          fontFamily: "var(--font-mono), monospace", fontSize: 10,
          letterSpacing: "0.25em",
        }}>
          <DataFreshnessBadge freshness={dataFreshness} />
          {!loading && base.length > 0 && <span style={{ color: "#475569", fontWeight: 800 }}>{base.length} MATCHES</span>}
          {liveCount > 0 && <span style={{ color: "#ef4444", fontWeight: 900 }}>● {liveCount} IN_PLAY</span>}
          {finalCount > 0 && <span style={{ color: "#34d399", fontWeight: 900 }}>✓ {finalCount} COMPLETED</span>}
          {isArchived && (
            <span style={{
              padding: "4px 12px", borderRadius: 4,
              background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)",
              color: "#f97316", fontWeight: 900, fontSize: 9
            }}>ARCHIVE_MODE</span>
          )}
          {fallbackUsed && (
            <span style={{
              padding: "4px 12px", borderRadius: 4,
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#ef4444", fontWeight: 900, fontSize: 9
            }}>DEGRADED_MODE: {sourceProvider?.toUpperCase()} ONLY</span>
          )}
        </div>

        {/* League filter — Improved horizontal scroll */}
        <div style={{ 
          display: "flex", alignItems: "center", gap: 10, marginBottom: 32, 
          overflowX: "auto",
          paddingBottom: 12,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }} className="no-scrollbar">
          {LEAGUES.map(l => (
            <button key={l} onClick={() => setFilter(l)} style={{
              padding: "10px 20px",
              background: filter === l ? "rgba(34,211,238,0.12)" : "rgba(15,23,42,0.4)",
              border: filter === l ? "1px solid rgba(34,211,238,0.4)" : "1px solid rgba(148,163,184,0.12)",
              borderRadius: 6,
              fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 900,
              color: filter === l ? "#22d3ee" : "#475569",
              letterSpacing: "0.28em", cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }} className="hover:border-slate-500">{l}</button>
          ))}
        </div>

        {/* Game bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map(m => (
            <GameBar
              key={m.id}
              m={m}
              expanded={expandedId === m.id}
              onToggle={() => { setExpandedId(expandedId === m.id ? null : m.id); setEngagementId(null) }}
              onOpen={onOpen}
              engagementId={engagementId}
              onEngage={setEngagementId}
            />
          ))}
        </div>

        {/* Mobile Lab Entry Point */}
        {isMobile && (
          <div 
            onClick={() => onOpenLab?.()}
            style={{
              marginTop: 32, padding: "24px", background: "rgba(34,211,238,0.06)", 
              border: "1px solid rgba(34,211,238,0.25)", borderRadius: 12,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              cursor: "pointer", boxShadow: "0 10px 30px rgba(34,211,238,0.05)"
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 900, color: "#22d3ee", letterSpacing: "0.25em" }}>SYSTEM DIAGNOSTICS</span>
              <span style={{ fontFamily: "var(--font-inter)", fontSize: 15, fontWeight: 900, color: "#fff" }}>View Engine Report →</span>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#22d3ee", fontWeight: 900 }}>9,500 GMS</div>
          </div>
        )}

        {filtered.length === 0 && (
          <div style={{
            padding: "80px 24px", border: "1px dashed rgba(148,163,184,0.15)",
            borderRadius: 12, textAlign: "center",
            background: "rgba(15,23,42,0.2)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 24
          }}>
            <div style={{
              fontFamily: "var(--font-mono), monospace", fontSize: 12,
              color: "#475569", letterSpacing: "0.4em", fontWeight: 900,
            }}>
              [ {loading ? "INITIALIZING DATA STREAM..." : "NO SIGNAL DATA FOR THIS DATE"} ]
            </div>
            
            {!loading && (
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16 }}>
                {availableDates.length > 0 && selectedDate !== availableDates[availableDates.length - 1] && (
                  <button 
                    onClick={() => setSelectedDate(availableDates[availableDates.length - 1])}
                    style={{
                      padding: "10px 20px", background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.3)",
                      borderRadius: 6, color: "#22d3ee", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 900, cursor: "pointer"
                    }}
                  >JUMP TO LATEST DATA</button>
                )}
                <button 
                  onClick={() => refresh()}
                  style={{
                    padding: "10px 20px", background: "rgba(148,163,184,0.1)", border: "1px solid rgba(148,163,184,0.3)",
                    borderRadius: 6, color: "#94a3b8", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 900, cursor: "pointer"
                  }}
                >RETRY CONNECTION</button>
                <button 
                  onClick={() => onOpenLab?.()}
                  style={{
                    padding: "10px 20px", background: "none", border: "1px solid rgba(71,85,105,0.3)",
                    borderRadius: 6, color: "#475569", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 900, cursor: "pointer"
                  }}
                >OPEN LAB DIAGNOSTICS</button>
              </div>
            )}

            {fallbackUsed && !loading && (
              <div style={{ maxWidth: 500, fontFamily: "var(--font-inter)", fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
                <span style={{ color: "#ef4444", fontWeight: 800 }}>NOTICE:</span> Primary intelligence feeds (OddsAPI) are currently unavailable. 
                The terminal is running in <span style={{ color: "#e2e8f0" }}>DEGRADED MODE</span> using ESPN baseline data only. 
                Some tactical projections may be limited.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
