'use client'

import { useState, useMemo, useEffect } from 'react'
import { useWindowWidth } from '../lib/useWindowWidth'
import {
  NBA_BRACKET_2026, NHL_BRACKET_2026,
  type BracketSeries, type BracketTeam, type League, type PlayoffConference,
  type PlayoffSimulationSummary,
} from '../data/mockData'
import { leagueTheme } from './ui'
import TeamLogo from './TeamLogo'

// ── Visual bracket engine (small iterations, display only) ────────
// These power the bracket card rendering. They are NOT the 10M simulation —
// that runs offline and is read from /api/playoffs/summary.

function gameWinProb(home: BracketTeam, away: BracketTeam): number {
  const diff = home.edge - away.edge
  const recoveryBoost = (home.recovery - away.recovery) * 0.1
  return Math.max(0.25, Math.min(0.75, 0.52 + diff * 0.55 + recoveryBoost))
}

function simulateSeries(home: BracketTeam, away: BracketTeam, winsHome: number, winsAway: number): { winner: string } {
  let h = winsHome
  let a = winsAway
  const pGame = gameWinProb(home, away)
  while (h < 4 && a < 4) {
    if (Math.random() < pGame) h++
    else a++
  }
  return { winner: h === 4 ? home.abbr : away.abbr }
}

function predictSeries(s: BracketSeries, iterations = 5000): { winner: string; prob: number } {
  if (s.status === 'completed' && s.winner) return { winner: s.winner, prob: 1 }
  let homeWins = 0
  for (let i = 0; i < iterations; i++) {
    if (simulateSeries(s.home, s.away, s.winsHome, s.winsAway).winner === s.home.abbr) homeWins++
  }
  const p = homeWins / iterations
  return { winner: p >= 0.5 ? s.home.abbr : s.away.abbr, prob: p >= 0.5 ? p : 1 - p }
}

function simulateBracket(firstRound: BracketSeries[], league: League): BracketSeries[] {
  const all: BracketSeries[] = [...firstRound]
  const conferences: PlayoffConference[] = ['East', 'West']

  for (const conf of conferences) {
    const r1S = firstRound.filter(s => s.round === 1 && s.conference === conf)
    for (let i = 0; i < r1S.length; i += 2) {
      const { winner: w1 } = predictSeries(r1S[i], 2000)
      const { winner: w2 } = predictSeries(r1S[i + 1], 2000)
      const t1 = w1 === r1S[i].home.abbr ? r1S[i].home : r1S[i].away
      const t2 = w2 === r1S[i + 1].home.abbr ? r1S[i + 1].home : r1S[i + 1].away
      const [h, a] = t1.edge >= t2.edge ? [t1, t2] : [t2, t1]
      all.push({ id: `${league}-r2-${conf}-${i / 2}`, league, round: 2, conference: conf, home: h, away: a, winsHome: 0, winsAway: 0, status: 'pending' })
    }
  }

  for (const conf of conferences) {
    const r2S = all.filter(s => s.round === 2 && s.conference === conf)
    const { winner: w1 } = predictSeries(r2S[0], 2000)
    const { winner: w2 } = predictSeries(r2S[1], 2000)
    const t1 = w1 === r2S[0].home.abbr ? r2S[0].home : r2S[0].away
    const t2 = w2 === r2S[1].home.abbr ? r2S[1].home : r2S[1].away
    const [h, a] = t1.edge >= t2.edge ? [t1, t2] : [t2, t1]
    all.push({ id: `${league}-r3-${conf}`, league, round: 3, conference: conf, home: h, away: a, winsHome: 0, winsAway: 0, status: 'pending' })
  }

  const eF = all.find(s => s.round === 3 && s.conference === 'East')
  const wF = all.find(s => s.round === 3 && s.conference === 'West')
  if (eF && wF) {
    const { winner: we } = predictSeries(eF, 2000)
    const { winner: ww } = predictSeries(wF, 2000)
    const tE = we === eF.home.abbr ? eF.home : eF.away
    const tW = ww === wF.home.abbr ? wF.home : wF.away
    const [h, a] = tE.edge >= tW.edge ? [tE, tW] : [tW, tE]
    all.push({ id: `${league}-finals`, league, round: 4, conference: 'Finals', home: h, away: a, winsHome: 0, winsAway: 0, status: 'pending' })
  }

  return all
}

// ── Fetch pre-computed simulation summary ────────────────────────

function useSummary(league: string) {
  const [summary, setSummary] = useState<PlayoffSimulationSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setSummary(null)
    fetch(`/api/playoffs/summary?league=${league}`)
      .then(r => r.json())
      .then((data: PlayoffSimulationSummary) => { setSummary(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [league])

  return { summary, loading }
}

// ── Sub-components ────────────────────────────────────────────────

function MiniSeriesCard({ series, league, align = "left" }: { series: BracketSeries; league: League; align?: "left" | "right" }) {
  const t = leagueTheme(league)
  const isPending = series.status === 'pending'
  const { winner, prob } = predictSeries(series)
  const homeWins = winner === series.home.abbr

  function TeamRow({ team, isWinner }: { team: BracketTeam; isWinner: boolean }) {
    const wins = team.abbr === series.home.abbr ? series.winsHome : series.winsAway
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "4px 8px",
        background: isWinner ? `${t.hex}15` : "transparent",
        flexDirection: align === "right" ? "row-reverse" : "row",
      }}>
        <TeamLogo teamAbbr={team.abbr} league={league} size={16} accentColor={isWinner ? t.hex : "#475569"} />
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800, color: isWinner ? "#f8fafc" : "#475569", flex: 1, textAlign: align }}>
          {team.abbr} <span style={{ fontSize: 7, opacity: 0.5 }}>#{team.seed}</span>
        </span>
        {!isPending && <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 900, color: isWinner ? t.hex : "#1e293b" }}>{wins}</span>}
      </div>
    )
  }

  void prob
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

function FinalsMatchupCard({
  summary, league, loading,
}: {
  summary: PlayoffSimulationSummary | null
  league: League
  loading: boolean
}) {
  const t = leagueTheme(league)
  const matchup = summary?.most_likely_finals_matchup

  return (
    <div style={{
      flex: 1, padding: "16px 20px", background: "rgba(15,23,42,0.6)",
      border: `1px solid ${t.hex}33`, borderRadius: 4,
    }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "#475569", letterSpacing: "0.2em", marginBottom: 10 }}>
        MOST LIKELY FINALS MATCHUP
      </div>
      {loading || !matchup ? (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#334155" }}>—</div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <TeamLogo teamAbbr={matchup.home_team} league={league} size={28} accentColor={t.hex} />
            <span style={{ fontFamily: "var(--font-inter)", fontWeight: 900, fontSize: 18, color: "#f8fafc" }}>
              {matchup.home_team}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#475569" }}>vs</span>
            <span style={{ fontFamily: "var(--font-inter)", fontWeight: 900, fontSize: 18, color: "#f8fafc" }}>
              {matchup.away_team}
            </span>
            <TeamLogo teamAbbr={matchup.away_team} league={league} size={28} accentColor={t.hex} />
          </div>
          <div style={{ fontFamily: "var(--font-inter)", fontWeight: 900, fontSize: 20, color: t.hex }}>
            {(matchup.probability * 100).toFixed(1)}%
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "#475569", marginTop: 2, letterSpacing: "0.15em" }}>
            PROBABILITY OF THIS MATCHUP
          </div>
        </>
      )}
    </div>
  )
}

function TitleDistributionTable({
  summary, league, loading,
}: {
  summary: PlayoffSimulationSummary | null
  league: League
  loading: boolean
}) {
  const t = leagueTheme(league)
  const top5 = summary?.champion_distribution.slice(0, 5) ?? []

  return (
    <div style={{
      flex: 1, padding: "16px 20px", background: "rgba(15,23,42,0.6)",
      border: `1px solid ${t.hex}33`, borderRadius: 4,
    }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "#475569", letterSpacing: "0.2em", marginBottom: 10 }}>
        TITLE DISTRIBUTION
      </div>
      {loading ? (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#334155" }}>—</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {top5.map((entry, i) => (
            <div key={entry.team} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#475569", width: 12 }}>{i + 1}.</span>
              <TeamLogo teamAbbr={entry.team} league={league} size={16} accentColor={i === 0 ? t.hex : "#475569"} />
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 10, color: i === 0 ? "#f8fafc" : "#94a3b8", flex: 1 }}>
                {entry.team}
              </span>
              <span style={{ fontFamily: "var(--font-inter)", fontWeight: 900, fontSize: 13, color: i === 0 ? t.hex : "#64748b" }}>
                {(entry.probability * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ValidationSummaryCard({
  summary, loading,
}: {
  summary: PlayoffSimulationSummary | null
  loading: boolean
}) {
  const validation = summary?.validation

  return (
    <div style={{
      flex: 1, padding: "16px 20px", background: "rgba(15,23,42,0.6)",
      border: "1px solid rgba(148,163,184,0.1)", borderRadius: 4,
    }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "#475569", letterSpacing: "0.2em", marginBottom: 10 }}>
        VALIDATION
      </div>
      {loading || !validation ? (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#334155" }}>—</div>
      ) : validation.mode === 'live_projection' ? (
        <>
          <div style={{ fontFamily: "var(--font-inter)", fontWeight: 800, fontSize: 13, color: "#22d3ee", marginBottom: 6 }}>
            LIVE PROJECTION
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#475569", lineHeight: 1.6 }}>
            {validation.notes ?? "Historical validation not yet attached."}
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {[
            ["Round 1", validation.round_1_accuracy],
            ["Conf Semis", validation.semifinal_accuracy],
            ["Conf Finals", validation.conference_finals_accuracy],
            ["Finals", validation.finals_accuracy],
            ["Overall", validation.overall_bracket_accuracy],
          ].map(([label, val]) => (
            <div key={String(label)} style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#64748b" }}>{label}</span>
              <span style={{ fontFamily: "var(--font-inter)", fontWeight: 800, fontSize: 11, color: "#34d399" }}>
                {val != null ? `${(Number(val) * 100).toFixed(1)}%` : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────

export default function PlayoffBracketPage({ embedded = false }: { embedded?: boolean } = {}) {
  const width = useWindowWidth()
  const isMobile = width < 1024
  const [selectedLeague, setSelectedLeague] = useState<"NBA" | "NHL">("NBA")
  const league = selectedLeague
  const t = leagueTheme(league)

  const { summary, loading } = useSummary(selectedLeague)

  const initialSeries = selectedLeague === "NBA" ? NBA_BRACKET_2026 : NHL_BRACKET_2026
  const allSeries = useMemo(() => simulateBracket(initialSeries, league), [initialSeries, league])
  const finals = allSeries.find(s => s.round === 4)

  // Use the simulation summary's projected champion for display; fall back to bracket prediction
  const displayChampion = summary?.projected_champion.team
    ?? (finals ? predictSeries(finals).winner : null)
    ?? ""
  const titleProb = summary?.projected_champion.probability ?? 0

  const getS = (round: number, conf: PlayoffConference) =>
    allSeries.filter(s => s.round === round && s.conference === conf)

  if (isMobile) {
    return (
      <div style={{ padding: embedded ? 0 : 20 }}>
        {!embedded && (
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontFamily: "var(--font-inter)", fontWeight: 900, fontSize: 24, color: "#fff" }}>
              {selectedLeague} 2026 <span style={{ color: t.hex }}>PREDICTION</span>
            </h1>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{
            padding: 16, background: "rgba(15,23,42,0.6)", borderRadius: 4,
            border: `1px solid ${t.hex}33`, borderLeft: `4px solid ${t.hex}`,
          }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#475569", letterSpacing: "0.2em", marginBottom: 8 }}>
              PROJECTED CHAMPION
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <TeamLogo teamAbbr={displayChampion} league={league} size={48} accentColor={t.hex} />
              <div>
                <div style={{ fontFamily: "var(--font-inter)", fontWeight: 900, fontSize: 24, color: "#fff" }}>
                  {displayChampion}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#fbbf24", fontWeight: 800 }}>
                  {loading ? "—" : `${(titleProb * 100).toFixed(1)}% TITLE PROBABILITY`}
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#334155", textAlign: "center", padding: "10px 0" }}>
            [ FULL BRACKET INTEL IN WAR ROOM ]
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={embedded ? { width: "100%" } : { maxWidth: 1400, margin: "0 auto", padding: "40px 20px" }}>
      {!embedded && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-end",
          marginBottom: 40, borderBottom: `1px solid ${t.hex}33`, paddingBottom: 20,
        }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-inter)", fontWeight: 900, fontSize: 32, color: "#fff", letterSpacing: "-0.02em", margin: 0 }}>
              {selectedLeague} 2026 <span style={{ color: t.hex }}>PLAYOFFS</span>
            </h1>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#334155", marginTop: 6, letterSpacing: "0.15em" }}>
              {(summary?.simulation_runs ?? 10000000).toLocaleString()} SIMULATION RUNS · MODEL {summary?.metadata.model_version ?? "v4.1"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {(["NBA", "NHL"] as const).map(lg => (
              <button
                key={lg}
                onClick={() => setSelectedLeague(lg)}
                style={{
                  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800,
                  padding: "6px 14px", borderRadius: 2, cursor: "pointer",
                  background: selectedLeague === lg ? leagueTheme(lg).hex + "20" : "transparent",
                  border: `1px solid ${selectedLeague === lg ? leagueTheme(lg).hex : "#1e293b"}`,
                  color: selectedLeague === lg ? leagueTheme(lg).hex : "#475569",
                  letterSpacing: "0.15em",
                }}
              >
                {lg}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Butterfly bracket */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10, alignItems: "center",
        padding: "40px 0", background: "radial-gradient(circle at center, rgba(15,23,42,0.4) 0%, transparent 70%)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 40, alignItems: "flex-end" }}>
          {getS(1, "West").map(s => <MiniSeriesCard key={s.id} series={s} league={league} />)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 120, alignItems: "flex-end" }}>
          {getS(2, "West").map(s => <MiniSeriesCard key={s.id} series={s} league={league} />)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          {getS(3, "West").map(s => <MiniSeriesCard key={s.id} series={s} league={league} />)}
        </div>

        {/* Center: championship hero */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#fbbf24", letterSpacing: "0.4em", fontWeight: 900 }}>
            FINALS
          </div>
          <PlayoffChampionHero
            champion={displayChampion}
            titleProb={titleProb}
            league={league}
            loading={loading}
          />
          <div style={{ width: 1, height: 100, background: "linear-gradient(to bottom, #fbbf24, transparent)" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          {getS(3, "East").map(s => <MiniSeriesCard key={s.id} series={s} league={league} align="right" />)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 120, alignItems: "flex-start" }}>
          {getS(2, "East").map(s => <MiniSeriesCard key={s.id} series={s} league={league} align="right" />)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 40, alignItems: "flex-start" }}>
          {getS(1, "East").map(s => <MiniSeriesCard key={s.id} series={s} league={league} align="right" />)}
        </div>
      </div>

      {/* Summary blocks */}
      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <FinalsMatchupCard summary={summary} league={league} loading={loading} />
        <TitleDistributionTable summary={summary} league={league} loading={loading} />
        <ValidationSummaryCard summary={summary} loading={loading} />
      </div>

      {/* Stats footer */}
      <div style={{
        marginTop: 16, padding: "15px 20px", background: "rgba(15,23,42,0.6)", borderRadius: 4,
        border: "1px solid rgba(148,163,184,0.1)", display: "flex", justifyContent: "center", gap: 60,
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "#475569", letterSpacing: "0.2em" }}>
            PROJECTED CHAMPION
          </div>
          <div style={{ fontFamily: "var(--font-inter)", fontWeight: 900, color: "#fbbf24", fontSize: 18 }}>
            {displayChampion || "—"}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "#475569", letterSpacing: "0.2em" }}>
            TITLE PROBABILITY
          </div>
          <div style={{ fontFamily: "var(--font-inter)", fontWeight: 900, color: loading ? "#475569" : "#34d399", fontSize: 18 }}>
            {loading ? "—" : `${(titleProb * 100).toFixed(2)}%`}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "#475569", letterSpacing: "0.2em" }}>
            SIMULATION RUNS
          </div>
          <div style={{ fontFamily: "var(--font-inter)", fontWeight: 900, color: t.hex, fontSize: 18 }}>
            {(summary?.simulation_runs ?? 10000000).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}
