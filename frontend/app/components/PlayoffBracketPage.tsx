'use client'

import { useEffect, useMemo, useState } from 'react'
import { useWindowWidth } from '../lib/useWindowWidth'
import type { League } from '../data/mockData'
import { leagueTheme } from './ui'
import TeamLogo from './TeamLogo'
import type { PlayoffSimulationSummary, SimulationOkSummary, SimulationSummaryResponse } from '../contracts/product'
import { useMatchesContext, DataFreshnessBadge } from '../context/MatchesContext'
import { getSeriesStateFromCompletedGames } from '../lib/seriesState'
import { PAGE_SHELL_STYLE, BREAKPOINTS } from '../lib/ui'

export function useSummary(league: string) {
  const [summary, setSummary] = useState<SimulationSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setSummary(null)

    fetch(`/api/playoffs/summary?league=${league}`)
      .then(r => r.json())
      .then((data: SimulationSummaryResponse) => {
        if (!cancelled) setSummary(data)
      })
      .catch(() => {
        if (!cancelled) {
          setSummary({
            status: 'error',
            mode: 'simulation',
            message: 'Unable to load playoff projection summary',
            data: null,
            meta: {
              league: league as any,
              simulationRuns: 0,
              generatedAt: null,
              validationMode: 'unvalidated',
            },
          })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [league])

  return { summary, loading }
}

function StatusShell({
  league,
  title,
  message,
  embedded,
}: {
  league: League
  title: string
  message: string
  embedded?: boolean
}) {
  const t = leagueTheme(league)
  return (
    <div style={embedded ? { width: '100%' } : PAGE_SHELL_STYLE}>
      <div style={{ padding: '80px 24px', border: `1px dashed ${t.hex}33`, borderRadius: 12, textAlign: 'center', background: 'rgba(15,23,42,0.35)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: t.hex, letterSpacing: '0.36em', fontWeight: 900, marginBottom: 14 }}>
          [ {title} ]
        </div>
        <div style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: '#94a3b8' }}>
          {message}
        </div>
      </div>
    </div>
  )
}

function LiveSeriesStrip({ league, seriesMap }: { league: League; seriesMap: ReturnType<typeof getSeriesStateFromCompletedGames> }) {
  const t = leagueTheme(league)
  const series = Array.from(seriesMap.entries())

  if (series.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#64748b', letterSpacing: '0.28em', fontWeight: 900 }}>
        LIVE SERIES RECONSTRUCTION
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        {series.map(([key, state]) => {
          const complete = state.teamAWins >= 4 || state.teamBWins >= 4
          const winner = complete ? (state.teamAWins >= 4 ? state.teamA : state.teamB) : null
          return (
            <div key={key} style={{ padding: 14, background: 'rgba(2,6,23,0.72)', border: `1px solid ${complete ? t.hex + '66' : 'rgba(148,163,184,0.14)'}`, borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TeamLogo teamAbbr={state.teamA} league={league} size={22} accentColor={winner === state.teamA ? t.hex : '#64748b'} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 900, color: winner === state.teamA ? '#fff' : '#94a3b8' }}>{state.teamA}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-inter)', fontSize: 18, fontWeight: 900, color: complete ? t.hex : '#f8fafc' }}>{state.teamAWins}:{state.teamBWins}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 900, color: winner === state.teamB ? '#fff' : '#94a3b8' }}>{state.teamB}</span>
                  <TeamLogo teamAbbr={state.teamB} league={league} size={22} accentColor={winner === state.teamB ? t.hex : '#64748b'} />
                </div>
              </div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 8, color: complete ? t.hex : '#64748b', letterSpacing: '0.18em', fontWeight: 800 }}>
                {complete ? `WINNER: ${winner}` : 'ACTIVE SERIES'} · LIVE_COMPLETED_GAMES
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ChampionCard({ summary, league, loading }: { summary: SimulationOkSummary | null; league: League; loading: boolean }) {
  const t = leagueTheme(league)
  const champion = summary?.data.projectedChampion
  return (
    <div style={{ padding: '22px', background: 'rgba(251,191,36,0.05)', border: '2px solid #fbbf24', borderRadius: 8, boxShadow: '0 0 30px rgba(251,191,36,0.18)', textAlign: 'center', minWidth: 190 }}>
      {champion ? <TeamLogo teamAbbr={champion.team.shortName} league={league} size={64} accentColor="#fbbf24" displayName={champion.team.displayName} /> : null}
      <div style={{ marginTop: 12, fontFamily: 'var(--font-inter)', fontWeight: 900, color: '#fff', fontSize: 22 }}>
        {loading ? '—' : champion?.team.shortName ?? 'RECALCULATING'}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#fbbf24', marginTop: 4, letterSpacing: '0.2em' }}>
        PROJECTED CHAMPION
      </div>
      <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(251,191,36,0.2)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: '#64748b', letterSpacing: '0.15em', marginBottom: 2 }}>
          TITLE PROBABILITY
        </div>
        <div style={{ fontFamily: 'var(--font-inter)', fontWeight: 900, fontSize: 18, color: loading ? '#475569' : '#fbbf24' }}>
          {loading ? '—' : champion ? `${(champion.titleProbability * 100).toFixed(2)}%` : 'SYNC PENDING'}
        </div>
      </div>
      <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 8, color: t.hex, letterSpacing: '0.14em', fontWeight: 800 }}>
        SNAPSHOT SOURCE ONLY
      </div>
    </div>
  )
}

function SnapshotBracket({ data, league }: { data: PlayoffSimulationSummary; league: League }) {
  const t = leagueTheme(league)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, width: '100%' }}>
      {data.bracket.rounds.map((round) => (
        <div key={round.roundName} style={{ padding: '16px 18px', background: 'rgba(15,23,42,0.48)', border: `1px solid ${t.hex}26`, borderRadius: 8 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: t.hex, letterSpacing: '0.28em', fontWeight: 900, marginBottom: 12 }}>
            {round.roundName.toUpperCase()}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
            {round.matchups.map((matchup, idx) => (
              <div key={`${round.roundName}-${idx}`} style={{ padding: 12, background: 'rgba(2,6,23,0.72)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TeamLogo teamAbbr={matchup.teamA.shortName} league={league} size={22} accentColor={t.hex} displayName={matchup.teamA.displayName} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 900, color: '#f8fafc' }}>{matchup.teamA.shortName}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#475569' }}>VS</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 900, color: '#f8fafc' }}>{matchup.teamB.shortName}</span>
                    <TeamLogo teamAbbr={matchup.teamB.shortName} league={league} size={22} accentColor={t.hex} displayName={matchup.teamB.displayName} />
                  </div>
                </div>
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 8, color: '#64748b', letterSpacing: '0.12em', fontWeight: 800 }}>
                  <span>PROJECTED: {matchup.projectedWinner.shortName}</span>
                  <span>{(matchup.winProbability * 100).toFixed(1)}%</span>
                </div>
                {matchup.seriesScore ? (
                  <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 8, color: t.hex, letterSpacing: '0.12em', fontWeight: 900 }}>
                    SERIES: {matchup.seriesScore}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function FinalsMatchupCard({ summary, league, loading }: { summary: SimulationOkSummary | null; league: League; loading: boolean }) {
  const t = leagueTheme(league)
  const matchup = summary?.data.mostLikelyFinalsMatchup
  return (
    <div style={{ flex: 1, padding: '16px 20px', background: 'rgba(15,23,42,0.6)', border: `1px solid ${t.hex}33`, borderRadius: 4 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: '#475569', letterSpacing: '0.2em', marginBottom: 10 }}>MOST LIKELY FINALS MATCHUP</div>
      {loading || !matchup ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#334155' }}>—</div> : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <TeamLogo teamAbbr={matchup.teamA.shortName} league={league} size={28} accentColor={t.hex} displayName={matchup.teamA.displayName} />
            <span style={{ fontFamily: 'var(--font-inter)', fontWeight: 900, fontSize: 18, color: '#f8fafc' }}>{matchup.teamA.shortName}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#475569' }}>vs</span>
            <span style={{ fontFamily: 'var(--font-inter)', fontWeight: 900, fontSize: 18, color: '#f8fafc' }}>{matchup.teamB.shortName}</span>
            <TeamLogo teamAbbr={matchup.teamB.shortName} league={league} size={28} accentColor={t.hex} displayName={matchup.teamB.displayName} />
          </div>
          <div style={{ fontFamily: 'var(--font-inter)', fontWeight: 900, fontSize: 20, color: t.hex }}>{(matchup.probability * 100).toFixed(1)}%</div>
        </>
      )}
    </div>
  )
}

function TitleDistributionTable({ summary, league, loading }: { summary: SimulationOkSummary | null; league: League; loading: boolean }) {
  const t = leagueTheme(league)
  const top5 = summary?.data.titleDistribution.slice(0, 5) ?? []
  return (
    <div style={{ flex: 1, padding: '16px 20px', background: 'rgba(15,23,42,0.6)', border: `1px solid ${t.hex}33`, borderRadius: 4 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: '#475569', letterSpacing: '0.2em', marginBottom: 10 }}>TITLE DISTRIBUTION</div>
      {loading ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#334155' }}>—</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {top5.length === 0 ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#334155' }}>SYNC PENDING</div> : top5.map((entry, i) => (
            <div key={entry.team.shortName} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#475569', width: 12 }}>{i + 1}.</span>
              <TeamLogo teamAbbr={entry.team.shortName} league={league} size={16} accentColor={i === 0 ? t.hex : '#475569'} displayName={entry.team.displayName} />
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 10, color: i === 0 ? '#f8fafc' : '#94a3b8', flex: 1 }}>{entry.team.shortName}</span>
              <span style={{ fontFamily: 'var(--font-inter)', fontWeight: 900, fontSize: 13, color: i === 0 ? t.hex : '#64748b' }}>{(entry.probability * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ValidationSummaryCard({ summary, loading }: { summary: SimulationOkSummary | null; loading: boolean }) {
  const validation = summary?.data.validation
  return (
    <div style={{ flex: 1, padding: '16px 20px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 4 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: '#475569', letterSpacing: '0.2em', marginBottom: 10 }}>VALIDATION</div>
      {loading || !validation ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#334155' }}>—</div> : (
        <div style={{ fontFamily: 'var(--font-inter)', fontWeight: 800, fontSize: 11, color: '#34d399' }}>
          {validation.mode === 'live_projection' ? 'MODEL ACCURACY' : `${(Number(validation.overallAccuracy) * 100).toFixed(1)}% ACCURACY`}
        </div>
      )}
    </div>
  )
}

export default function PlayoffBracketPage({ embedded = false, league = 'NBA' }: { embedded?: boolean; league?: League } = {}) {
  const width = useWindowWidth()
  const isTablet = width < BREAKPOINTS.tablet
  const selectedLeague = league
  const t = leagueTheme(selectedLeague)
  const { summary, loading } = useSummary(selectedLeague)
  const { matches: allMatches, dataFreshness } = useMatchesContext()

  const summaryOk = summary?.status === 'ok' ? summary : null
  const summaryPending = summary?.status === 'pending'
  const summaryError = summary?.status === 'error'
  const liveLeaguePlayoffGames = useMemo(
    () => allMatches.filter(m => m.league === selectedLeague && m.status === 'FINAL' && (m.seasonType === 'postseason' || m.playoff != null)),
    [allMatches, selectedLeague]
  )
  const liveSeriesMap = useMemo(() => getSeriesStateFromCompletedGames(liveLeaguePlayoffGames), [liveLeaguePlayoffGames])
  const hasLiveSeriesData = liveSeriesMap.size > 0

  if (!loading && summaryPending && !hasLiveSeriesData) {
    return <StatusShell embedded={embedded} league={selectedLeague} title={`${selectedLeague} PLAYOFF SERIES SYNC PENDING`} message="Waiting for live playoff snapshot or completed series reconstruction. No mock bracket is shown in production." />
  }

  if (!loading && summaryError && !hasLiveSeriesData) {
    return <StatusShell embedded={embedded} league={selectedLeague} title={`${selectedLeague} PLAYOFF SNAPSHOT UNAVAILABLE`} message={summary?.message ?? 'Projection snapshot unavailable.'} />
  }

  return (
    <div style={embedded ? { width: '100%' } : PAGE_SHELL_STYLE}>
      <div className={embedded ? '' : isTablet ? 'py-8 sm:py-12' : 'py-12 sm:py-16'}>
        {!embedded && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 42, borderBottom: `1px solid ${t.hex}33`, paddingBottom: 28 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 800, letterSpacing: '0.32em', color: '#475569' }}>PLAYOFF INTELLIGENCE</span>
                <span style={{ color: '#1e293b', fontFamily: 'var(--font-mono)', fontSize: 9 }}>//</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.28em', color: '#334155' }}>PROJECTION AGENT ENGINE</span>
              </div>
              <h1 style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 900, fontSize: 'clamp(34px, 6vw, 56px)', color: '#fff', letterSpacing: '-0.04em', margin: 0, lineHeight: 0.9, fontStyle: 'italic' }}>
                {selectedLeague} <span style={{ color: t.hex, fontStyle: 'normal' }}>PLAYOFF PROJECTION</span>
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#475569', letterSpacing: '0.2em', fontWeight: 800 }}>
                  {(summaryOk?.meta.simulationRuns ?? 0).toLocaleString()} model iterations · {summaryOk ? 'snapshot' : 'sync pending'}
                </div>
                <DataFreshnessBadge freshness={dataFreshness} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: hasLiveSeriesData ? t.hex : '#64748b', letterSpacing: '0.15em', fontWeight: 900 }}>
                  SYNC: {hasLiveSeriesData ? 'LIVE_RECONSTRUCTION' : summaryPending ? 'PENDING' : summaryError ? 'ERROR' : 'SNAPSHOT'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '220px 1fr', gap: 24, alignItems: 'start' }}>
          <ChampionCard summary={summaryOk} league={selectedLeague} loading={loading} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {summaryOk ? (
              <SnapshotBracket data={summaryOk.data} league={selectedLeague} />
            ) : (
              <div style={{ padding: '48px 24px', background: 'rgba(15,23,42,0.45)', border: '1px dashed rgba(148,163,184,0.16)', borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: t.hex, letterSpacing: '0.24em', fontWeight: 900, marginBottom: 8 }}>
                  PROJECTION RECALCULATING
                </div>
                <div style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: '#94a3b8' }}>
                  No production mock bracket is displayed. Waiting for live playoff snapshot or reconstructed completed series.
                </div>
              </div>
            )}
            <LiveSeriesStrip league={selectedLeague} seriesMap={liveSeriesMap} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, marginTop: 32, flexWrap: 'wrap' }}>
          <FinalsMatchupCard summary={summaryOk} league={selectedLeague} loading={loading} />
          <TitleDistributionTable summary={summaryOk} league={selectedLeague} loading={loading} />
          <ValidationSummaryCard summary={summaryOk} loading={loading} />
        </div>
      </div>
    </div>
  )
}
