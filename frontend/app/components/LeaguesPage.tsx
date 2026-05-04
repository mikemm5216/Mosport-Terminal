'use client'

import { useWindowWidth } from '../lib/useWindowWidth'
import { LEAGUE_STANDINGS, type League, type Match, type FormResult } from '../data/mockData'
import { leagueTheme, BioBar, LiveDot, TeamMark } from './ui'
import { useMatchesContext } from '../context/MatchesContext'
import TeamLogo from './TeamLogo'
import { PAGE_SHELL_STYLE, BREAKPOINTS } from '../lib/ui'

const ALL_LEAGUES: League[] = ["MLB", "NBA", "EPL", "UCL", "NHL"]

const LEAGUE_META: Record<League, { full: string; season: string; format: string }> = {
  MLB: { full: "Major League Baseball",          season: "2026 Regular Season",    format: "W-L"    },
  NBA: { full: "National Basketball Association", season: "2025-26 Playoffs",      format: "Series" },
  EPL: { full: "English Premier League",          season: "2025-26 Matchday 34",   format: "Pts"    },
  UCL: { full: "UEFA Champions League",           season: "2025-26 Quarterfinals", format: "W-L"    },
  NHL: { full: "National Hockey League",          season: "2026 Playoffs — Rd 1",  format: "Series" },
}

const FORM_COLOR: Record<FormResult, string> = {
  W: "#34d399",
  L: "#f43f5e",
  D: "#475569",
}

function FormDots({ form }: { form: FormResult[] }) {
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {form.map((r, i) => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: FORM_COLOR[r],
          display: "inline-block",
          opacity: 0.35 + (i / form.length) * 0.65,
          boxShadow: `0 0 4px ${FORM_COLOR[r]}55`,
        }} />
      ))}
    </div>
  )
}

function FixtureRow({ m, isLast }: { m: Match; isLast: boolean }) {
  const isLive = m.status === "LIVE"
  const isFinal = m.status === "FINAL"
  const hasWpa = Math.abs(m.wpa) > 0.0001
  const wpaColor = m.wpa >= 0 ? "#34d399" : "#f43f5e"
  const t = leagueTheme(m.league)
  
  // Only show perspective if there's a real edge or if the game is over and we know the winner
  const showPerspective = hasWpa || (isFinal && m.score && (m.score.home > m.score.away && m.perspective === "HOME" || m.score.away > m.score.home && m.perspective === "AWAY"))

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 0",
      borderBottom: isLast ? "none" : "1px solid rgba(148,163,184,0.06)",
    }}>
      <div style={{ width: 50, flexShrink: 0 }}>
        {isLive ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <LiveDot size={4} />
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: "#ef4444", fontWeight: 900 }}>LIVE</span>
          </span>
        ) : (
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: isFinal ? "#34d399" : "#475569", fontWeight: 800 }}>
            {isFinal ? "FT" : m.time}
          </span>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <TeamMark abbr={m.away.abbr} league={m.league} size={24} />
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 12, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.05em" }}>{m.away.abbr}</span>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#1e293b", fontWeight: 900 }}>@</span>
        <TeamMark abbr={m.home.abbr} league={m.league} size={24} />
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 12, fontWeight: 900, color: "#fff", letterSpacing: "0.05em" }}>{m.home.abbr}</span>
        {m.score && (
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, color: isFinal ? "#fff" : "#475569", marginLeft: 6, fontWeight: 800 }}>
            {m.score.away}–{m.score.home}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, minWidth: 60 }}>
        {isFinal ? (
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 900, color: "#34d399", letterSpacing: "0.1em" }}>FINAL</span>
        ) : hasWpa ? (
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 900, color: wpaColor }}>
            {m.wpa >= 0 ? "+" : ""}{(m.wpa * 100).toFixed(1)}%
          </span>
        ) : null}
        {m.playoff && (
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#475569", letterSpacing: "0.1em", whiteSpace: "nowrap", fontWeight: 700 }}>
            {m.playoff.summary}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0, minWidth: 60 }}>
        {showPerspective ? (
          <div style={{
            fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 900,
            color: t.hex, padding: "3px 8px", borderRadius: 4,
            border: `1px solid ${t.hex}44`, background: t.soft,
            letterSpacing: "0.2em",
          }}>{m.perspective}</div>
        ) : isFinal ? (
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 900, color: "#475569", letterSpacing: "0.1em" }}>COMPLETED</div>
        ) : null}
      </div>
    </div>
  )
}

function LeagueBlock({ league, isMobile, matches, onTeam, onPlayoffs }: { league: League; isMobile: boolean; matches: Match[]; onTeam?: (abbr: string, league: League) => void; onPlayoffs?: () => void }) {
  const t = leagueTheme(league)
  const meta = LEAGUE_META[league]
  const standings = LEAGUE_STANDINGS[league]
  const fixtures = matches.filter(m => m.league === league)
  const liveCount = fixtures.filter(m => m.status === "LIVE").length
  const isPts = meta.format === "Pts"

  return (
    <div style={{
      border: "1px solid rgba(148,163,184,0.08)",
      borderLeft: `4px solid ${t.hex}`,
      borderRadius: "0 8px 8px 0",
      marginBottom: 32, overflow: "hidden",
      background: "rgba(15,23,42,0.2)"
    }}>
      {/* League header */}
      <div style={{
        padding: isMobile ? "16px 20px" : "20px 28px",
        background: `linear-gradient(90deg, ${t.soft} 0%, rgba(2,6,23,0) 80%)`,
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            {liveCount > 0 && <LiveDot color={t.hex} size={5} />}
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: isMobile ? 18 : 22, fontWeight: 900, color: t.hex, letterSpacing: "0.24em" }}>{league}</span>
            {!isMobile && <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "#475569", letterSpacing: "0.18em", fontWeight: 800 }}>{meta.full}</span>}
          </div>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#334155", letterSpacing: "0.25em", fontWeight: 800 }}>{meta.season}</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {liveCount > 0 && (
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 900, color: "#ef4444", padding: "4px 10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 4, letterSpacing: "0.2em" }}>● {liveCount} LIVE</span>
          )}
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800, color: "#475569", padding: "4px 10px", background: "rgba(71,85,105,0.1)", border: "1px solid rgba(71,85,105,0.2)", borderRadius: 4, letterSpacing: "0.2em" }}>{fixtures.length} FIXTURES</span>
        </div>
      </div>

      {/* Today's fixtures */}
      {fixtures.length > 0 && (
        <div style={{ padding: isMobile ? "0 20px 8px" : "0 28px 8px", borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: "#1e293b", letterSpacing: "0.35em", padding: "12px 0 4px", fontWeight: 900 }}>ENGINE FEED</div>
          {fixtures.map((m, i) => (
            <FixtureRow key={m.id} m={m} isLast={i === fixtures.length - 1} />
          ))}
        </div>
      )}

      {/* Team standings */}
      <div style={{ padding: isMobile ? "16px 20px 20px" : "20px 28px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: "#1e293b", letterSpacing: "0.35em", fontWeight: 900 }}>COMPETITION ROSTER</div>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, fontWeight: 900, letterSpacing: "0.2em", color: "#fbbf24", padding: "2px 8px", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 4 }}>AGENCY_TRACKER</span>
        </div>

        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "80px 60px 1fr 70px"
            : "120px 1fr 80px 100px 1fr 70px",
          gap: 12, padding: "8px 0",
          borderBottom: "1px solid rgba(148,163,184,0.08)",
          marginBottom: 8,
        }}>
          {(isMobile
            ? ["UNIT", "REC", "FORM", "EDGE"]
            : ["UNIT", "IDENTIFIER", "REC", "STREAK", "FORM", "EDGE"]
          ).map(h => (
            <span key={h} style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 900, color: "#334155", letterSpacing: "0.3em" }}>{h}</span>
          ))}
        </div>

        {standings.map((team, i) => {
          const edgeColor = team.edge > 0.68 ? "#34d399" : team.edge > 0.58 ? "#fbbf24" : "#f43f5e"
          const record = isPts
            ? `${team.pts}pts`
            : `${team.w}-${team.l}`
          const isPlaying = fixtures.some(f => f.away.abbr === team.abbr || f.home.abbr === team.abbr)

          return (
            <div
              key={team.abbr}
              onClick={onTeam ? () => onTeam(team.abbr, league) : undefined}
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "80px 60px 1fr 70px"
                  : "120px 1fr 80px 100px 1fr 70px",
                alignItems: "center",
                padding: "12px 0",
                borderBottom: i < standings.length - 1 ? "1px solid rgba(148,163,184,0.06)" : "none",
                background: isPlaying ? `${t.hex}08` : "transparent",
                cursor: onTeam ? "pointer" : "default",
                transition: "all 0.15s ease",
              }}
              className="hover:bg-slate-800/30"
            >
              {/* Logo + abbr */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {isPlaying && <span style={{ width: 4, height: 16, background: t.hex, borderRadius: 2, display: "inline-block", flexShrink: 0, boxShadow: `0 0 8px ${t.hex}` }} />}
                <TeamLogo teamAbbr={team.abbr} league={league} size={28} accentColor={isPlaying ? t.hex : "#64748b"} />
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 12, fontWeight: 900, color: isPlaying ? t.hex : "#94a3b8", letterSpacing: "0.15em" }}>{team.abbr}</span>
              </div>

              {/* Full name (desktop) */}
              {!isMobile && (
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "#475569", letterSpacing: "0.15em", fontWeight: 700 }}>{team.name}</span>
              )}

              {/* Record */}
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800, color: "#94a3b8" }}>{record}</span>

              {/* Streak (desktop) */}
              {!isMobile && (
                <span style={{
                  fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 900,
                  color: team.streak.startsWith("W") ? "#34d399" : team.streak.startsWith("L") ? "#f43f5e" : "#475569",
                }}>{team.streak}</span>
              )}

              {/* Form dots */}
              <FormDots form={team.form} />

              {/* Edge */}
              <div>
                <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 900, color: edgeColor, marginBottom: 4 }}>
                  {Math.round(team.edge * 100)}%
                </div>
                <BioBar value={team.edge} color={edgeColor} height={4} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface LeaguesPageProps {
  onTeam?: (teamAbbr: string, league: League) => void
}

export default function LeaguesPage({ onTeam }: LeaguesPageProps = {}) {
  const width = useWindowWidth()
  const isMobile = width < BREAKPOINTS.mobile
  const { matches } = useMatchesContext()
  const liveTotal = matches.filter(m => m.status === "LIVE").length

  return (
    <div style={PAGE_SHELL_STYLE}>
      <div className="py-8 sm:py-12 lg:py-16">
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.32em", color: "#475569" }}>LEAGUE INTELLIGENCE</span>
            <span style={{ color: "#1e293b", fontFamily: "var(--font-mono), monospace", fontSize: 9 }}>//</span>
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.28em", color: "#334155" }}>PROJECTION AGENT TRACKER</span>
          </div>

          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "flex-end", justifyContent: "space-between", gap: 24 }}>
            <h1 style={{ 
              fontFamily: "var(--font-inter), Inter, sans-serif", 
              fontWeight: 900, 
              fontSize: "clamp(36px, 10vw, 64px)", 
              color: "#f8fafc", 
              letterSpacing: "-0.04em", 
              lineHeight: 0.85, 
              margin: 0 
            }}>
              ACTIVE<br />
              <span style={{ color: "#a78bfa", textShadow: "0 0 40px rgba(167,139,250,0.3)" }}>COMPETITIONS</span>
            </h1>
            <div style={{ 
              fontFamily: "var(--font-mono), monospace", 
              fontSize: 10, 
              color: "#475569", 
              letterSpacing: "0.25em",
              background: "rgba(15,23,42,0.6)",
              padding: "8px 16px",
              borderRadius: 4,
              border: "1px solid rgba(148,163,184,0.08)"
            }}>
              {liveTotal > 0 && <span style={{ color: "#ef4444", fontWeight: 900 }}>● {liveTotal} IN_PLAY · </span>}
              {matches.length} EVENTS RECORDED
            </div>
          </div>
        </div>

        {ALL_LEAGUES.map(league => (
          <LeagueBlock key={league} league={league} isMobile={isMobile} matches={matches} onTeam={onTeam} />
        ))}
      </div>
    </div>
  )
}
