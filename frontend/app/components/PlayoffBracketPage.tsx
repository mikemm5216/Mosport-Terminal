'use client'

import { useState, useMemo, useEffect } from 'react'
import { useWindowWidth } from '../lib/useWindowWidth'
import {
  NBA_BRACKET_2026,
  type BracketSeries, type BracketTeam, type League, type PlayoffConference,
} from '../data/mockData'
import { leagueTheme } from './ui'
import TeamLogo from './TeamLogo'
import type { SimulationSummaryResponse } from '../contracts/product'
import { useMatchesContext, DataFreshnessBadge } from '../context/MatchesContext'
import { getSeriesStateFromCompletedGames, resolveSeriesWins } from '../lib/seriesState'
import { PAGE_SHELL_STYLE, BREAKPOINTS } from '../lib/ui'

// ── Visual bracket engine ────────────────────────────────────────
function gameWinProb(home: BracketTeam, away: BracketTeam): number {
  const diff = home.edge - away.edge
  const recoveryBoost = (home.recovery - away.recovery) * 0.1
  return Math.max(0.25, Math.min(0.75, 0.52 + diff * 0.55 + recoveryBoost))
}

/**
 * simulateSeries
 * PROOF: This function accepts current wins (winsHome, winsAway).
 * If a series is 3:1, it starts from (3, 1) and only simulates the remaining games.
 */
function simulateSeries(home: BracketTeam, away: BracketTeam, winsHome: number, winsAway: number): { winner: string } {
  let h = winsHome
  let a = winsAway
  const pGame = gameWinProb(home, away)
  // Loop continues only until one team reaches 4 wins
  while (h < 4 && a < 4) {
    if (Math.random() < pGame) h++
    else a++
  }
  return { winner: h === 4 ? home.abbr : away.abbr }
}

/**
 * predictSeries
 * PROOF: For completed series, it returns 100% probability for the winner.
 * This ensures the loser is effectively "removed" from subsequent title probability calculations
 * because the winner advances with 100% certainty in the simulation.
 */
function predictSeries(s: BracketSeries, iterations = 5000): { winner: string; prob: number } {
  if (s.status === 'completed' && s.winner) return { winner: s.winner, prob: 1 }
  let homeWins = 0
  for (let i = 0; i < iterations; i++) {
    // Current series score (s.winsHome, s.winsAway) is passed into each simulation iteration
    if (simulateSeries(s.home, s.away, s.winsHome, s.winsAway).winner === s.home.abbr) homeWins++
  }
  const p = homeWins / iterations
  return { winner: p >= 0.5 ? s.home.abbr : s.away.abbr, prob: p >= 0.5 ? p : 1 - p }
}

function simulateBracket(inputSeries: BracketSeries[], league: League): BracketSeries[] {
  const all: BracketSeries[] = [...inputSeries]
  const conferences: PlayoffConference[] = ['East', 'West']

  // Helper to find or simulate a series
  const getOrSim = (round: number, conf: PlayoffConference, id: string, t1: BracketTeam, t2: BracketTeam) => {
    const existing = all.find(s => s.round === round && s.conference === conf && 
      ((s.home.abbr === t1.abbr && s.away.abbr === t2.abbr) || (s.home.abbr === t2.abbr && s.away.abbr === t1.abbr)))
    if (existing) return existing
    
    const [h, a] = t1.edge >= t2.edge ? [t1, t2] : [t2, t1]
    const newSeries: BracketSeries = { 
      id, league, round, conference: conf, home: h, away: a, 
      winsHome: 0, winsAway: 0, status: 'pending' 
    }
    all.push(newSeries)
    return newSeries
  }

  for (const conf of conferences) {
    const r1S = all.filter(s => s.round === 1 && s.conference === conf)
    if (r1S.length < 4) continue // Wait for full R1 if we're simulating

    for (let i = 0; i < r1S.length; i += 2) {
      const { winner: w1 } = predictSeries(r1S[i], 2000)
      const { winner: w2 } = predictSeries(r1S[i + 1], 2000)
      const t1 = w1 === r1S[i].home.abbr ? r1S[i].home : r1S[i].away
      const t2 = w2 === r1S[i + 1].home.abbr ? r1S[i + 1].home : r1S[i + 1].away
      getOrSim(2, conf, `${league}-r2-${conf}-${i / 2}`, t1, t2)
    }
  }

  for (const conf of conferences) {
    const r2S = all.filter(s => s.round === 2 && s.conference === conf)
    if (r2S.length < 2) continue

    const { winner: w1 } = predictSeries(r2S[0], 2000)
    const { winner: w2 } = predictSeries(r2S[1], 2000)
    const t1 = w1 === r2S[0].home.abbr ? r2S[0].home : r2S[0].away
    const t2 = w2 === r2S[1].home.abbr ? r2S[1].home : r2S[1].away
    getOrSim(3, conf, `${league}-r3-${conf}`, t1, t2)
  }

  const eF = all.find(s => s.round === 3 && s.conference === 'East')
  const wF = all.find(s => s.round === 3 && s.conference === 'West')
  if (eF && wF) {
    const { winner: we } = predictSeries(eF, 2000)
    const { winner: ww } = predictSeries(wF, 2000)
    const tE = we === eF.home.abbr ? eF.home : eF.away
    const tW = ww === wF.home.abbr ? wF.home : wF.away
    getOrSim(4, 'Finals', `${league}-finals`, tE, tW)
  }

  return all
}

export function useSummary(league: string) {
  const [summary, setSummary] = useState<SimulationSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setSummary(null)
    fetch(`/api/playoffs/summary?league=${league}`)
      .then(r => r.json())
      .then((data: SimulationSummaryResponse) => { setSummary(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [league])

  return { summary, loading }
}

function MiniSeriesCard({ series, league, align = "left" }: { series: BracketSeries; league: League; align?: "left" | "right" }) {
  const t = leagueTheme(league)
  const isPending = series.status === 'pending'
  const { winner } = predictSeries(series)
  const homeWins = winner === series.home.abbr
  const isLiveData = (series as BracketSeries & { _source?: string })._source === 'live_completed_games' || (series as any)._source === 'live_espn_reconstruction'

  function TeamRow({ team, isWinner }: { team: BracketTeam; isWinner: boolean }) {
    const wins = team.abbr === series.home.abbr ? series.winsHome : series.winsAway
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "4px 8px",
        background: isWinner ? `${t.hex}15` : "transparent",
        flexDirection: align === "right" ? "row-reverse" : "row",
      }}>
        <TeamLogo teamAbbr={team.abbr} league={league} size={16} accentColor={isWinner ? t.hex : "#475569"} displayName={team.name} />
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800, color: isWinner ? "#f8fafc" : "#475569", flex: 1, textAlign: align }}>
          {team.abbr} <span style={{ fontSize: 7, opacity: 0.5 }}>#{team.seed}</span>
        </span>
        {!isPending && <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 900, color: isWinner ? t.hex : "#1e293b" }}>{wins}</span>}
      </div>
    )
  }

  return (
    <div style={{
      width: 140, background: "rgba(2,6,23,0.8)", border: `1px solid ${isPending ? "rgba(148,163,184,0.1)" : t.hex + "33"}`,
      borderRadius: 4, overflow: "hidden", position: "relative",
      boxShadow: isPending ? "none" : `0 0 15px ${t.hex}10`,
    }}>
      <TeamRow team={series.home} isWinner={!isPending && homeWins} />
      <div style={{ height: 1, background: "rgba(148,163,184,0.05)" }} />
      <TeamRow team={series.away} isWinner={!isPending && !homeWins} />
      {!isPending && (
        <div style={{
          position: "absolute", top: "50%", [align === "left" ? "right" : "left"]: -2, transform: "translateY(-50%)",
          width: 4, height: 12, background: t.hex, borderRadius: 2,
        }} />
      )}
      {isLiveData && !isPending && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: 2, background: `linear-gradient(90deg, ${t.hex}00, ${t.hex}, ${t.hex}00)`,
        }} />
      )}
    </div>
  )
}

function PlayoffChampionHero({
  champion, titleProb, league, loading,
}: {
  champion: string
  titleProb: number
  league: League
  loading: boolean
}) {
  return (
    <div style={{
      padding: "20px", background: "rgba(251,191,36,0.05)", border: "2px solid #fbbf24",
      borderRadius: 8, boxShadow: "0 0 30px rgba(251,191,36,0.2)", textAlign: "center", width: 180,
    }}>
      <TeamLogo teamAbbr={champion} league={league} size={64} accentColor="#fbbf24" />
      <div style={{ marginTop: 12, fontFamily: "var(--font-inter)", fontWeight: 900, color: "#fff", fontSize: 20 }}>
        {champion}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#fbbf24", marginTop: 4, letterSpacing: "0.2em" }}>
        PROJECTED CHAMPION
      </div>
      <div style={{ marginTop: 8, padding: "4px 0", borderTop: "1px solid rgba(251,191,36,0.2)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "#64748b", letterSpacing: "0.15em", marginBottom: 2 }}>
          TITLE PROBABILITY
        </div>
        <div style={{ fontFamily: "var(--font-inter)", fontWeight: 900, fontSize: 18, color: loading ? "#475569" : "#fbbf24" }}>
          {loading ? "—" : `${(titleProb * 100).toFixed(2)}%`}
        </div>
      </div>
    </div>
  )
}

function FinalsMatchupCard({ summary, league, loading }: { summary: SimulationSummaryResponse | null, league: League, loading: boolean }) {
  const t = leagueTheme(league)
  const matchup = summary?.data.mostLikelyFinalsMatchup
  return (
    <div style={{ flex: 1, padding: "16px 20px", background: "rgba(15,23,42,0.6)", border: `1px solid ${t.hex}33`, borderRadius: 4 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "#475569", letterSpacing: "0.2em", marginBottom: 10 }}>MOST LIKELY FINALS MATCHUP</div>
      {loading || !matchup ? <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#334155" }}>—</div> : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <TeamLogo teamAbbr={matchup.teamA.shortName} league={league} size={28} accentColor={t.hex} displayName={matchup.teamA.displayName} />
            <span style={{ fontFamily: "var(--font-inter)", fontWeight: 900, fontSize: 18, color: "#f8fafc" }}>{matchup.teamA.shortName}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#475569" }}>vs</span>
            <span style={{ fontFamily: "var(--font-inter)", fontWeight: 900, fontSize: 18, color: "#f8fafc" }}>{matchup.teamB.shortName}</span>
            <TeamLogo teamAbbr={matchup.teamB.shortName} league={league} size={28} accentColor={t.hex} displayName={matchup.teamB.displayName} />
          </div>
          <div style={{ fontFamily: "var(--font-inter)", fontWeight: 900, fontSize: 20, color: t.hex }}>{(matchup.probability * 100).toFixed(1)}%</div>
        </>
      )}
    </div>
  )
}

function TitleDistributionTable({ summary, league, loading }: { summary: SimulationSummaryResponse | null, league: League, loading: boolean }) {
  const t = leagueTheme(league)
  const top5 = summary?.data.titleDistribution.slice(0, 5) ?? []
  return (
    <div style={{ flex: 1, padding: "16px 20px", background: "rgba(15,23,42,0.6)", border: `1px solid ${t.hex}33`, borderRadius: 4 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "#475569", letterSpacing: "0.2em", marginBottom: 10 }}>TITLE DISTRIBUTION</div>
      {loading ? <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#334155" }}>—</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {top5.map((entry, i) => (
            <div key={entry.team.shortName} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#475569", width: 12 }}>{i + 1}.</span>
              <TeamLogo teamAbbr={entry.team.shortName} league={league} size={16} accentColor={i === 0 ? t.hex : "#475569"} displayName={entry.team.displayName} />
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 10, color: i === 0 ? "#f8fafc" : "#94a3b8", flex: 1 }}>{entry.team.shortName}</span>
              <span style={{ fontFamily: "var(--font-inter)", fontWeight: 900, fontSize: 13, color: i === 0 ? t.hex : "#64748b" }}>{(entry.probability * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ValidationSummaryCard({ summary, loading }: { summary: SimulationSummaryResponse | null, loading: boolean }) {
  const validation = summary?.data.validation
  return (
    <div style={{ flex: 1, padding: "16px 20px", background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.1)", borderRadius: 4 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "#475569", letterSpacing: "0.2em", marginBottom: 10 }}>VALIDATION</div>
      {loading || !validation ? <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#334155" }}>—</div> : (
        <div style={{ fontFamily: "var(--font-inter)", fontWeight: 800, fontSize: 11, color: "#34d399" }}>
          {validation.mode === 'live_projection' ? "MODEL ACCURACY" : `${(Number(validation.overallAccuracy) * 100).toFixed(1)}% ACCURACY`}
        </div>
      )}
    </div>
  )
}

export default function PlayoffBracketPage({ embedded = false, league = 'NBA' }: { embedded?: boolean, league?: League } = {}) {
  const width = useWindowWidth()
  const isMobile = width < BREAKPOINTS.mobile
  const isTablet = width < BREAKPOINTS.tablet
  const selectedLeague = league
  const t = leagueTheme(selectedLeague)
  const { summary, loading } = useSummary(selectedLeague)
  const { matches: allMatches, dataFreshness } = useMatchesContext()

  const liveLeaguePlayoffGames = useMemo(() => allMatches.filter(m => m.league === selectedLeague && m.status === 'FINAL' && m.playoff != null), [allMatches, selectedLeague])
  const liveSeriesMap = useMemo(() => getSeriesStateFromCompletedGames(liveLeaguePlayoffGames), [liveLeaguePlayoffGames])
  
  const allSeries = useMemo(() => {
    // Priority 1: Live reconstruction from API summary
    if (summary?.status === 'ok' && summary.data.bracket.rounds.length > 0 && summary.data.validation.notes?.includes('ESPN')) {
      const apiSeries: BracketSeries[] = []
      summary.data.bracket.rounds.forEach(r => {
        r.matchups.forEach(m => {
          apiSeries.push({
            id: `live-${m.teamA.code}-${m.teamB.code}`,
            league: 'NBA',
            round: m.round || 1,
            conference: (m.conference as PlayoffConference) || 'East',
            home: { abbr: m.teamA.code, seed: m.teamA.seed || 0, edge: 0.5, recovery: 0.7, name: m.teamA.displayName },
            away: { abbr: m.teamB.code, seed: m.teamB.seed || 0, edge: 0.5, recovery: 0.7, name: m.teamB.displayName },
            winsHome: m.winsA || 0,
            winsAway: m.winsB || 0,
            status: (m.winsA || 0) >= 4 || (m.winsB || 0) >= 4 ? 'completed' : 'active',
            winner: (m.winsA || 0) >= 4 ? m.teamA.code : ((m.winsB || 0) >= 4 ? m.teamB.code : undefined),
            _source: 'live_espn_reconstruction'
          } as any)
        })
      })
      return simulateBracket(apiSeries, league)
    }

    // Priority 2: Fallback to static bracket + context games (Hydration)
    const baseBracket = selectedLeague === 'NBA' ? NBA_BRACKET_2026 : []
    const hydrated = baseBracket.map(s => {
      const season = '2026' 
      const { winsHome, winsAway, source, isComplete, winner } = resolveSeriesWins(
        s.home.abbr, s.away.abbr, s.winsHome, s.winsAway, liveSeriesMap, selectedLeague, season, s.round
      )
      return { 
        ...s, winsHome, winsAway, status: isComplete ? 'completed' : s.status,
        winner: winner ?? s.winner, _source: source 
      } as BracketSeries & { _source: string }
    })

    if (hydrated.length > 0) return simulateBracket(hydrated, league)
    return []
  }, [summary, liveSeriesMap, selectedLeague, league])

  const hasLiveSeriesData = allSeries.some(s => (s as any)._source === 'live_espn_reconstruction' || (s as any)._source === 'live_completed_games')
  const finals = allSeries.find(s => s.round === 4)
  const displayChampion = summary?.data.projectedChampion.team.shortName ?? (finals ? predictSeries(finals).winner : "")
  const titleProb = summary?.data.projectedChampion.titleProbability ?? 0
  const getS = (round: number, conf: PlayoffConference) => allSeries.filter(s => s.round === round && s.conference === conf)

  if (isTablet) {
    return (
      <div style={embedded ? { width: "100%" } : PAGE_SHELL_STYLE}>
        <div className={embedded ? "" : "py-8 sm:py-12"}>
          {!embedded && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.32em", color: "#475569" }}>PLAYOFF INTELLIGENCE</span>
                <span style={{ color: "#1e293b", fontFamily: "var(--font-mono), monospace", fontSize: 9 }}>//</span>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.28em", color: "#334155" }}>PROJECTION AGENT ENGINE</span>
              </div>
              <h1 style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 900, fontSize: "clamp(32px, 8vw, 48px)", color: "#fff", margin: 0, letterSpacing: "-0.03em", lineHeight: 0.9, fontStyle: "italic" }}>
                {selectedLeague} 2026 <span style={{ color: t.hex, fontStyle: "normal" }}>PROJECTION</span>
              </h1>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ padding: "24px", background: "rgba(15,23,42,0.6)", borderRadius: 8, border: `1px solid ${t.hex}44`, borderLeft: `5px solid ${t.hex}`, boxShadow: `0 10px 30px rgba(0,0,0,0.3)` }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#475569", letterSpacing: "0.3em", marginBottom: 12, fontWeight: 900 }}>PROJECTED CHAMPION</div>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <TeamLogo teamAbbr={displayChampion} league={league} size={64} accentColor={t.hex} />
                <div>
                  <div style={{ fontFamily: "var(--font-inter)", fontWeight: 900, fontSize: 32, color: "#fff", letterSpacing: "-0.02em" }}>{displayChampion}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#fbbf24", fontWeight: 900, marginTop: 4, letterSpacing: "0.05em" }}>{loading ? "CALCULATING..." : `${(titleProb * 100).toFixed(1)}% TITLE PROBABILITY`}</div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <FinalsMatchupCard summary={summary} league={league} loading={loading} />
              <TitleDistributionTable summary={summary} league={league} loading={loading} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!loading && !summary && selectedLeague !== 'NBA') {
    return (
      <div style={embedded ? { width: "100%" } : PAGE_SHELL_STYLE}>
        <div style={{ padding: "80px 24px", border: "1px dashed rgba(148,163,184,0.1)", borderRadius: 12, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#475569", letterSpacing: "0.4em", fontWeight: 900, marginBottom: 12 }}>
            [ {selectedLeague} BRACKET PENDING ]
          </div>
          <div style={{ fontFamily: "var(--font-inter)", fontSize: 13, color: "#64748b" }}>
            The {selectedLeague} projection snapshots are currently being calibrated by the Projection Agent.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={embedded ? { width: "100%" } : PAGE_SHELL_STYLE}>
      <div className={embedded ? "" : "py-12 sm:py-16"}>
        {!embedded && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48, borderBottom: `1px solid ${t.hex}33`, paddingBottom: 32 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.32em", color: "#475569" }}>PLAYOFF INTELLIGENCE</span>
                <span style={{ color: "#1e293b", fontFamily: "var(--font-mono), monospace", fontSize: 9 }}>//</span>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.28em", color: "#334155" }}>PROJECTION AGENT ENGINE</span>
              </div>
              <h1 style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 900, fontSize: "clamp(36px, 6vw, 56px)", color: "#fff", letterSpacing: "-0.04em", margin: 0, lineHeight: 0.85, fontStyle: "italic" }}>
                {selectedLeague} 2026 <span style={{ color: t.hex, fontStyle: "normal" }}>PLAYOFF PROJECTION</span>
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 20 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#475569", letterSpacing: "0.2em", fontWeight: 800 }}>{(summary?.meta.simulationRuns ?? 10000).toLocaleString()} model iterations · projection only</div>
                <DataFreshnessBadge freshness={dataFreshness} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#64748b", letterSpacing: "0.15em", fontWeight: 900 }}>
                  SYNC: {hasLiveSeriesData ? "LIVE_RECONSTRUCTION" : "PENDING"} · SOURCE: {summary?.mode === 'simulation' ? "AGENT_SNAPSHOT" : "LIVE_STREAM"}
                </span>
              </div>
            </div>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 20, alignItems: "center", padding: "60px 0", background: "radial-gradient(circle at center, rgba(15,23,42,0.4) 0%, transparent 80%)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 48, alignItems: "flex-end" }}>{getS(1, "West").map(s => <MiniSeriesCard key={s.id} series={s} league={league} />)}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 140, alignItems: "flex-end" }}>{getS(2, "West").map(s => <MiniSeriesCard key={s.id} series={s} league={league} />)}</div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>{getS(3, "West").map(s => <MiniSeriesCard key={s.id} series={s} league={league} />)}</div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#fbbf24", letterSpacing: "0.5em", fontWeight: 900, textShadow: "0 0 20px rgba(251,191,36,0.4)" }}>FINALS</div>
            <PlayoffChampionHero champion={displayChampion} titleProb={titleProb} league={league} loading={loading} />
            <div style={{ width: 2, height: 120, background: "linear-gradient(to bottom, #fbbf24, transparent)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>{getS(3, "East").map(s => <MiniSeriesCard key={s.id} series={s} league={league} align="right" />)}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 140, alignItems: "flex-start" }}>{getS(2, "East").map(s => <MiniSeriesCard key={s.id} series={s} league={league} align="right" />)}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 48, alignItems: "flex-start" }}>{getS(1, "East").map(s => <MiniSeriesCard key={s.id} series={s} league={league} align="right" />)}</div>
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 40, flexWrap: "wrap" }}>
          <FinalsMatchupCard summary={summary} league={league} loading={loading} />
          <TitleDistributionTable summary={summary} league={league} loading={loading} />
          <ValidationSummaryCard summary={summary} loading={loading} />
        </div>
        <div style={{ marginTop: 24, padding: "24px 32px", background: "rgba(15,23,42,0.6)", borderRadius: 8, border: "1px solid rgba(148,163,184,0.1)", display: "flex", justifyContent: "center", gap: 80 }}>
          <div style={{ textAlign: "center" }}><div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#475569", letterSpacing: "0.3em", fontWeight: 800 }}>PROJECTED CHAMPION</div><div style={{ fontFamily: "var(--font-inter)", fontWeight: 900, color: "#fbbf24", fontSize: 24, marginTop: 4 }}>{displayChampion || "—"}</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#475569", letterSpacing: "0.3em", fontWeight: 800 }}>TITLE PROBABILITY</div><div style={{ fontFamily: "var(--font-inter)", fontWeight: 900, color: loading ? "#475569" : "#34d399", fontSize: 24, marginTop: 4 }}>{loading ? "—" : `${(titleProb * 100).toFixed(2)}%`}</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#475569", letterSpacing: "0.3em", fontWeight: 800 }}>MODEL ITERATIONS</div><div style={{ fontFamily: "var(--font-inter)", fontWeight: 900, color: t.hex, fontSize: 24, marginTop: 4 }}>{(summary?.meta.simulationRuns ?? 10000).toLocaleString()}</div></div>
        </div>
      </div>
    </div>
  )
}
