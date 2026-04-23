'use client'

import { useWindowWidth } from '../lib/useWindowWidth'
import { TODAY_MATCHES, LEAGUE_STANDINGS, type League, type Match, type FormResult } from '../data/mockData'
import { leagueTheme, BioBar, LiveDot } from './ui'

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
  const wpaColor = m.wpa >= 0 ? "#34d399" : "#f43f5e"
  const t = leagueTheme(m.league)

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 0",
      borderBottom: isLast ? "none" : "1px solid rgba(148,163,184,0.04)",
    }}>
      <div style={{ width: 44, flexShrink: 0 }}>
        {isLive ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <LiveDot size={4} />
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: "#ef4444", fontWeight: 800 }}>LIVE</span>
          </span>
        ) : (
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: isFinal ? "#34d399" : "#475569", fontWeight: 700 }}>
            {isFinal ? "FT" : m.time}
          </span>
        )}
      </div>

      <div style={{ flex: 1 }}>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.1em" }}>{m.away.abbr}</span>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: "#1e293b", margin: "0 6px" }}>@</span>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800, color: "#e2e8f0", letterSpacing: "0.1em" }}>{m.home.abbr}</span>
        {m.score && (
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "#334155", marginLeft: 8 }}>
            {m.score.away}–{m.score.home}
          </span>
        )}
      </div>

      <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800, color: wpaColor, minWidth: 52, textAlign: "right" }}>
        {m.wpa >= 0 ? "+" : ""}{(m.wpa * 100).toFixed(1)}%
      </div>

      <div style={{
        fontFamily: "var(--font-mono), monospace", fontSize: 7, fontWeight: 800,
        color: t.hex, padding: "2px 7px", borderRadius: 2,
        border: `1px solid ${t.hex}33`, background: t.soft,
        flexShrink: 0, letterSpacing: "0.2em",
      }}>{m.perspective}</div>
    </div>
  )
}

function LeagueBlock({ league, isMobile }: { league: League; isMobile: boolean }) {
  const t = leagueTheme(league)
  const meta = LEAGUE_META[league]
  const standings = LEAGUE_STANDINGS[league]
  const fixtures = TODAY_MATCHES.filter(m => m.league === league)
  const liveCount = fixtures.filter(m => m.status === "LIVE").length
  const isPts = meta.format === "Pts"

  return (
    <div style={{
      border: "1px solid rgba(148,163,184,0.07)",
      borderLeft: `3px solid ${t.hex}`,
      borderRadius: "0 4px 4px 0",
      marginBottom: 16, overflow: "hidden",
    }}>
      {/* League header */}
      <div style={{
        padding: isMobile ? "14px 16px" : "15px 24px",
        background: `linear-gradient(90deg, ${t.soft} 0%, rgba(2,6,23,0) 70%)`,
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
            {liveCount > 0 && <LiveDot color={t.hex} size={5} />}
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: isMobile ? 14 : 17, fontWeight: 800, color: t.hex, letterSpacing: "0.2em" }}>{league}</span>
            {!isMobile && <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#334155", letterSpacing: "0.16em" }}>{meta.full}</span>}
          </div>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: "#1e293b", letterSpacing: "0.22em" }}>{meta.season}</div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {liveCount > 0 && (
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 800, color: "#ef4444", padding: "3px 8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 2, letterSpacing: "0.18em" }}>● {liveCount} LIVE</span>
          )}
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 700, color: "#475569", padding: "3px 8px", background: "rgba(71,85,105,0.08)", border: "1px solid rgba(71,85,105,0.18)", borderRadius: 2, letterSpacing: "0.18em" }}>{fixtures.length} TODAY</span>
        </div>
      </div>

      {/* Today's fixtures */}
      {fixtures.length > 0 && (
        <div style={{ padding: isMobile ? "0 16px 4px" : "0 24px 4px", borderBottom: "1px solid rgba(148,163,184,0.05)" }}>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#1e293b", letterSpacing: "0.3em", padding: "8px 0 2px", fontWeight: 800 }}>TODAY'S FIXTURES</div>
          {fixtures.map((m, i) => (
            <FixtureRow key={m.id} m={m} isLast={i === fixtures.length - 1} />
          ))}
        </div>
      )}

      {/* Team standings */}
      <div style={{ padding: isMobile ? "12px 16px 16px" : "12px 24px 16px" }}>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#1e293b", letterSpacing: "0.3em", marginBottom: 10, fontWeight: 800 }}>TEAM TRACKER</div>

        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "50px 56px 1fr 64px"
            : "56px 1fr 72px 88px 1fr 56px",
          gap: 0, padding: "6px 0",
          borderBottom: "1px solid rgba(148,163,184,0.06)",
          marginBottom: 4,
        }}>
          {(isMobile
            ? ["TEAM", "REC", "FORM", "EDGE"]
            : ["TEAM", "FULL NAME", "REC", "STREAK", "FORM", "EDGE"]
          ).map(h => (
            <span key={h} style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, fontWeight: 800, color: "#1e293b", letterSpacing: "0.28em" }}>{h}</span>
          ))}
        </div>

        {standings.map((team, i) => {
          const edgeColor = team.edge > 0.68 ? "#34d399" : team.edge > 0.58 ? "#fbbf24" : "#f43f5e"
          const record = isPts
            ? `${team.pts}pts`
            : `${team.w}-${team.l}`
          const isPlaying = fixtures.some(f => f.away.abbr === team.abbr || f.home.abbr === team.abbr)

          return (
            <div key={team.abbr} style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "50px 56px 1fr 64px"
                : "56px 1fr 72px 88px 1fr 56px",
              alignItems: "center",
              padding: "9px 0",
              borderBottom: i < standings.length - 1 ? "1px solid rgba(148,163,184,0.04)" : "none",
              background: isPlaying ? `${t.hex}06` : "transparent",
            }}>
              {/* Team abbr */}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {isPlaying && <span style={{ width: 3, height: 14, background: t.hex, borderRadius: 1, display: "inline-block", boxShadow: `0 0 4px ${t.hex}` }} />}
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800, color: isPlaying ? t.hex : "#94a3b8", letterSpacing: "0.14em" }}>{team.abbr}</span>
              </div>

              {/* Full name (desktop) */}
              {!isMobile && (
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#334155", letterSpacing: "0.12em" }}>{team.name}</span>
              )}

              {/* Record */}
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, color: "#64748b" }}>{record}</span>

              {/* Streak (desktop) */}
              {!isMobile && (
                <span style={{
                  fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800,
                  color: team.streak.startsWith("W") ? "#34d399" : team.streak.startsWith("L") ? "#f43f5e" : "#475569",
                }}>{team.streak}</span>
              )}

              {/* Form dots */}
              <FormDots form={team.form} />

              {/* Edge */}
              <div>
                <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 800, color: edgeColor, marginBottom: 3 }}>
                  {Math.round(team.edge * 100)}%
                </div>
                <BioBar value={team.edge} color={edgeColor} height={3} />
              </div>
            </div>
          )
        })}
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

      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.32em", color: "#475569" }}>LEAGUE INTELLIGENCE</span>
          <span style={{ color: "#1e293b", fontFamily: "var(--font-mono), monospace", fontSize: 9 }}>//</span>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.28em", color: "#334155" }}>TEAM STATUS · FIXTURES</span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <h1 style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 900, fontSize: isMobile ? 30 : 44, color: "#f8fafc", letterSpacing: "-0.03em", lineHeight: 1.08, margin: 0 }}>
            ACTIVE<br />
            <span style={{ color: "#a78bfa", textShadow: "0 0 40px rgba(167,139,250,0.35)" }}>COMPETITIONS</span>
          </h1>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#334155", letterSpacing: "0.2em" }}>
            {liveTotal > 0 && <span style={{ color: "#ef4444" }}>● {liveTotal} LIVE · </span>}
            {TODAY_MATCHES.length} FIXTURES TODAY
          </div>
        </div>
      </div>

      {ALL_LEAGUES.map(league => (
        <LeagueBlock key={league} league={league} isMobile={isMobile} />
      ))}
    </div>
  )
}
