'use client'

import { useWindowWidth } from '../lib/useWindowWidth'
import { TODAY_MATCHES, type League, type Match } from '../data/mockData'
import { leagueTheme, BioBar, LiveDot } from './ui'

const ALL_LEAGUES: League[] = ["MLB", "NBA", "EPL", "UCL", "NHL"]

const LEAGUE_META: Record<League, { full: string; season: string; roi: string }> = {
  MLB: { full: "Major League Baseball",          season: "2026 Regular Season",    roi: "+14.3%" },
  NBA: { full: "National Basketball Association", season: "2025-26 Playoffs",      roi: "+11.8%" },
  EPL: { full: "English Premier League",          season: "2025-26 Matchday 34",   roi: "+10.9%" },
  UCL: { full: "UEFA Champions League",           season: "2025-26 Quarterfinals", roi: "+13.4%" },
  NHL: { full: "National Hockey League",          season: "2026 Playoffs — Rd 1",  roi: "+12.1%" },
}

function MatchRow({ m, isMobile, isLast }: { m: Match; isMobile: boolean; isLast: boolean }) {
  const t = leagueTheme(m.league)
  const isLive = m.status === "LIVE"
  const isFinal = m.status === "FINAL"
  const wpaColor = m.wpa >= 0 ? "#34d399" : "#f43f5e"
  const edgeStrength = Math.min(1, Math.abs(m.physio_adjusted - 0.5) * 5)

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "13px 0",
      borderBottom: isLast ? "none" : "1px solid rgba(148,163,184,0.04)",
    }}>
      {/* Time */}
      <div style={{ width: isMobile ? 34 : 56, flexShrink: 0 }}>
        {isLive ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <LiveDot size={4} />
            <span style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 8, color: "#ef4444", fontWeight: 800, letterSpacing: "0.16em",
            }}>LIVE</span>
          </div>
        ) : (
          <span style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
            color: isFinal ? "#34d399" : "#475569",
          }}>{isFinal ? "FT" : m.time}</span>
        )}
      </div>

      {/* Teams + score */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.12em",
        }}>{m.away.abbr}</span>
        <span style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: 8, color: "#1e293b",
        }}>@</span>
        <span style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: 11, fontWeight: 800, color: "#e2e8f0", letterSpacing: "0.12em",
        }}>{m.home.abbr}</span>
        {m.score && (
          <span style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 10, color: "#334155",
          }}>{m.score.away}–{m.score.home}</span>
        )}
      </div>

      {/* Edge bar */}
      {!isMobile && (
        <div style={{ width: 72 }}>
          <div style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 7, color: "#1e293b", letterSpacing: "0.2em", marginBottom: 4,
          }}>EDGE</div>
          <BioBar value={edgeStrength} color={wpaColor} height={4} />
        </div>
      )}

      {/* WPA */}
      <div style={{
        fontFamily: "var(--font-mono), monospace",
        fontSize: 10, fontWeight: 800, color: wpaColor,
        letterSpacing: "0.08em", flexShrink: 0,
        minWidth: 52, textAlign: "right",
      }}>
        {m.wpa >= 0 ? "+" : ""}{(m.wpa * 100).toFixed(1)}%
      </div>

      {/* Perspective badge */}
      {!isMobile && (
        <div style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: 7, fontWeight: 800, letterSpacing: "0.22em",
          color: t.hex, padding: "2px 7px",
          border: `1px solid ${t.hex}33`,
          background: t.soft, borderRadius: 2, flexShrink: 0,
        }}>{m.perspective}</div>
      )}
    </div>
  )
}

function LeagueBlock({ league, matches, isMobile }: {
  league: League; matches: Match[]; isMobile: boolean
}) {
  const t = leagueTheme(league)
  const meta = LEAGUE_META[league]
  const liveCount = matches.filter(m => m.status === "LIVE").length
  const scheduledCount = matches.filter(m => m.status === "SCHEDULED").length
  const finalCount = matches.filter(m => m.status === "FINAL").length

  return (
    <div style={{
      border: "1px solid rgba(148,163,184,0.07)",
      borderLeft: `3px solid ${t.hex}`,
      borderRadius: "0 4px 4px 0",
      marginBottom: 14, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? "14px 16px" : "16px 24px",
        background: `linear-gradient(90deg, ${t.soft} 0%, rgba(2,6,23,0) 70%)`,
        display: "flex", alignItems: "center",
        justifyContent: "space-between", flexWrap: "wrap", gap: 10,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
            {liveCount > 0 && <LiveDot color={t.hex} size={5} />}
            <span style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: isMobile ? 14 : 17, fontWeight: 800,
              color: t.hex, letterSpacing: "0.2em",
            }}>{league}</span>
            {!isMobile && (
              <span style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: 9, color: "#334155", letterSpacing: "0.18em",
              }}>{meta.full}</span>
            )}
          </div>
          <div style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 8, color: "#1e293b", letterSpacing: "0.22em",
          }}>{meta.season}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {liveCount > 0 && (
            <span style={{
              fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 800,
              letterSpacing: "0.2em", color: "#ef4444",
              padding: "3px 8px", borderRadius: 2,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            }}>● {liveCount} LIVE</span>
          )}
          {scheduledCount > 0 && (
            <span style={{
              fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 700,
              letterSpacing: "0.18em", color: "#475569",
              padding: "3px 8px", borderRadius: 2,
              background: "rgba(71,85,105,0.08)", border: "1px solid rgba(71,85,105,0.18)",
            }}>{scheduledCount} UPCOMING</span>
          )}
          {finalCount > 0 && (
            <span style={{
              fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 700,
              letterSpacing: "0.18em", color: "#34d399",
              padding: "3px 8px", borderRadius: 2,
              background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.18)",
            }}>{finalCount} FINAL</span>
          )}
          {!isMobile && (
            <span style={{
              fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 800,
              letterSpacing: "0.18em", color: "#34d399",
              padding: "3px 10px", borderRadius: 2,
              background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)",
            }}>{meta.roi} ROI</span>
          )}
        </div>
      </div>

      {/* Match rows */}
      <div style={{ padding: isMobile ? "0 16px" : "0 24px" }}>
        {matches.map((m, i) => (
          <MatchRow key={m.id} m={m} isMobile={isMobile} isLast={i === matches.length - 1} />
        ))}
      </div>
    </div>
  )
}

export default function LeaguesPage() {
  const width = useWindowWidth()
  const isMobile = width < 640

  const liveTotal = TODAY_MATCHES.filter(m => m.status === "LIVE").length

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "28px 16px 60px" : "44px 28px 80px" }}>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 9, fontWeight: 800, letterSpacing: "0.32em", color: "#475569",
          }}>LEAGUE INTELLIGENCE</span>
          <span style={{ color: "#1e293b", fontFamily: "var(--font-mono), monospace", fontSize: 9 }}>//</span>
          <span style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 9, fontWeight: 700, letterSpacing: "0.28em", color: "#334155",
          }}>MULTI-SPORT COVERAGE</span>
        </div>

        <div style={{
          display: "flex", alignItems: "flex-end",
          justifyContent: "space-between", flexWrap: "wrap", gap: 16,
        }}>
          <h1 style={{
            fontFamily: "var(--font-inter), Inter, sans-serif",
            fontWeight: 900, fontSize: isMobile ? 30 : 44,
            color: "#f8fafc", letterSpacing: "-0.03em", lineHeight: 1.08, margin: 0,
          }}>
            ACTIVE<br />
            <span style={{ color: "#a78bfa", textShadow: "0 0 40px rgba(167,139,250,0.35)" }}>
              COMPETITIONS
            </span>
          </h1>

          <div style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 9, color: "#334155", letterSpacing: "0.2em",
          }}>
            {liveTotal > 0 && <span style={{ color: "#ef4444" }}>● {liveTotal} LIVE NOW · </span>}
            {TODAY_MATCHES.length} TOTAL TODAY
          </div>
        </div>
      </div>

      {/* League blocks */}
      {ALL_LEAGUES.map(league => {
        const matches = TODAY_MATCHES.filter(m => m.league === league)
        if (matches.length === 0) return null
        return (
          <LeagueBlock key={league} league={league} matches={matches} isMobile={isMobile} />
        )
      })}
    </div>
  )
}
