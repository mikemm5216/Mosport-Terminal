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

type BracketMatchup = PlayoffSimulationSummary['bracket']['rounds'][number]['matchups'][number]
type ConferenceSide = 'West' | 'East' | 'Finals'

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
            meta: { league: league as any, simulationRuns: 0, generatedAt: null, validationMode: 'unvalidated' },
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

function StatusShell({ league, title, message, embedded }: { league: League; title: string; message: string; embedded?: boolean }) {
  const t = leagueTheme(league)
  return (
    <div style={embedded ? { width: '100%' } : PAGE_SHELL_STYLE}>
      <div style={{ padding: '80px 24px', border: `1px dashed ${t.hex}33`, borderRadius: 12, textAlign: 'center', background: 'rgba(15,23,42,0.35)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: t.hex, letterSpacing: '0.36em', fontWeight: 900, marginBottom: 14 }}>[ {title} ]</div>
        <div style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: '#94a3b8' }}>{message}</div>
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
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#64748b', letterSpacing: '0.28em', fontWeight: 900 }}>LIVE SERIES RECONSTRUCTION</div>
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

function isCompleted(matchup: BracketMatchup) {
  return (matchup.winsA ?? 0) >= 4 || (matchup.winsB ?? 0) >= 4
}

function SeriesCard({ matchup, league, compact = false }: { matchup: BracketMatchup; league: League; compact?: boolean }) {
  const t = leagueTheme(league)
  const winsA = matchup.winsA
  const winsB = matchup.winsB
  const hasWins = typeof winsA === 'number' && typeof winsB === 'number'
  const completed = isCompleted(matchup)
  return (
    <div style={{ minHeight: compact ? 58 : 74, padding: compact ? '9px 12px' : '12px 14px', background: 'linear-gradient(180deg, rgba(15,23,42,0.74), rgba(2,6,23,0.82))', border: `1px solid ${completed ? '#34d39966' : t.hex + '55'}`, borderLeft: `3px solid ${completed ? '#34d399' : t.hex}`, borderRadius: 6, boxShadow: `0 0 18px ${(completed ? '#34d399' : t.hex)}20` }}>
      {[matchup.teamA, matchup.teamB].map((team, idx) => {
        const isProjected = team.shortName === matchup.projectedWinner.shortName
        const wins = idx === 0 ? winsA : winsB
        return (
          <div key={`${team.shortName}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', opacity: isProjected ? 1 : 0.58, marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <TeamLogo teamAbbr={team.shortName} league={league} size={compact ? 16 : 20} accentColor={isProjected ? t.hex : '#475569'} displayName={team.displayName} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: compact ? 9 : 10, fontWeight: 900, color: isProjected ? '#f8fafc' : '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team.shortName}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {hasWins && <span style={{ fontFamily: 'var(--font-mono)', color: isProjected ? t.hex : '#64748b', fontSize: 10, fontWeight: 900 }}>{wins}</span>}
              {isProjected && <span style={{ color: t.hex, fontSize: 10, fontWeight: 900 }}>›</span>}
            </div>
          </div>
        )
      })}
      <div style={{ marginTop: 5, display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 7, color: '#64748b', letterSpacing: '0.12em', fontWeight: 800 }}>
        <span>{completed ? `FINAL ${matchup.seriesScore ?? `${winsA}-${winsB}`}` : matchup.seriesScore && matchup.seriesScore !== 'TBD' ? `SERIES ${matchup.seriesScore}` : 'MOSPORT PROJECTION'}</span>
        <span style={{ color: completed ? '#34d399' : t.hex }}>{completed ? 'LOCKED' : `${(matchup.winProbability * 100).toFixed(1)}%`}</span>
      </div>
    </div>
  )
}

function EmptySlot({ league, label }: { league: League; label: string }) {
  const t = leagueTheme(league)
  return (
    <div style={{ minHeight: 58, padding: '10px 12px', background: 'linear-gradient(180deg, rgba(15,23,42,0.45), rgba(2,6,23,0.62))', border: '1px dashed rgba(148,163,184,0.16)', borderLeft: `3px solid ${t.hex}`, borderRadius: 6 }}>
      <div style={{ height: 9, width: '55%', background: 'rgba(148,163,184,0.12)', borderRadius: 999, marginBottom: 10 }} />
      <div style={{ height: 9, width: '42%', background: 'rgba(148,163,184,0.08)', borderRadius: 999, marginBottom: 9 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 7, color: t.hex, letterSpacing: '0.12em', fontWeight: 900 }}><span>{label}</span><span>WAIT</span></div>
    </div>
  )
}

function PendingButterflyBracket({ league, message }: { league: League; message: string }) {
  const labels = ['R1', 'R1', 'R1', 'R1']
  return (
    <div style={{ position: 'relative', minHeight: 520, padding: '28px 24px', border: `1px solid ${leagueTheme(league).hex}22`, borderRadius: 10, background: 'radial-gradient(circle at center, rgba(34,211,238,0.08), rgba(2,6,23,0) 45%)', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.9fr 220px 0.9fr 1fr 1.2fr', gap: 16, alignItems: 'center', height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{labels.map((label, i) => <EmptySlot key={`pl1-${i}`} league={league} label={label} />)}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 42 }}><EmptySlot league={league} label="R2" /><EmptySlot league={league} label="R2" /></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 96 }}><EmptySlot league={league} label="CONF" /></div>
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-inter)', color: '#94a3b8' }}>{message}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 96 }}><EmptySlot league={league} label="CONF" /></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 42 }}><EmptySlot league={league} label="R2" /><EmptySlot league={league} label="R2" /></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{labels.map((label, i) => <EmptySlot key={`pr1-${i}`} league={league} label={label} />)}</div>
      </div>
    </div>
  )
}

function ChampionCard({ summary, league, loading }: { summary: SimulationOkSummary | null; league: League; loading: boolean }) {
  const champion = summary?.data.projectedChampion
  return (
    <div style={{ padding: '22px', background: 'rgba(251,191,36,0.05)', border: '2px solid #fbbf24', borderRadius: 8, boxShadow: '0 0 30px rgba(251,191,36,0.18)', textAlign: 'center', minWidth: 190 }}>
      {champion ? <TeamLogo teamAbbr={champion.team.shortName} league={league} size={64} accentColor="#fbbf24" displayName={champion.team.displayName} /> : null}
      <div style={{ marginTop: 12, fontFamily: 'var(--font-inter)', fontWeight: 900, color: '#fff', fontSize: 22 }}>{loading ? '—' : champion?.team.shortName ?? 'RECALCULATING'}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#fbbf24', marginTop: 4, letterSpacing: '0.2em' }}>PROJECTED CHAMPION</div>
      <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(251,191,36,0.2)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: '#64748b', letterSpacing: '0.15em', marginBottom: 2 }}>TITLE PROBABILITY</div>
        <div style={{ fontFamily: 'var(--font-inter)', fontWeight: 900, fontSize: 18, color: loading ? '#475569' : '#fbbf24' }}>{loading ? '—' : champion ? `${(champion.titleProbability * 100).toFixed(2)}%` : 'SYNC PENDING'}</div>
      </div>
    </div>
  )
}

function getConference(matchup: BracketMatchup): ConferenceSide {
  const c = String(matchup.conference ?? '').toLowerCase()
  if (c.includes('west')) return 'West'
  if (c.includes('east')) return 'East'
  return 'Finals'
}

function getRound(matchup: BracketMatchup): number {
  return Number(matchup.round ?? 1) || 1
}

function BracketColumn({ matchups, league, label, compact = true, gap = 14 }: { matchups: BracketMatchup[]; league: League; label: string; compact?: boolean; gap?: number }) {
  const slots = label === 'R1' ? 4 : label === 'R2' ? 2 : 1
  const padded = [...matchups]
  while (padded.length < slots) padded.push(null as any)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {padded.slice(0, slots).map((matchup, i) => matchup ? <SeriesCard key={`${label}-${i}-${matchup.teamA.shortName}-${matchup.teamB.shortName}`} matchup={matchup} league={league} compact={compact} /> : <EmptySlot key={`${label}-empty-${i}`} league={league} label={label} />)}
    </div>
  )
}

function ButterflyBracket({ data, league }: { data: PlayoffSimulationSummary; league: League }) {
  const t = leagueTheme(league)
  const all = data.bracket.rounds.flatMap(round => round.matchups)
  const westR1 = all.filter(m => getConference(m) === 'West' && getRound(m) === 1)
  const westR2 = all.filter(m => getConference(m) === 'West' && getRound(m) === 2)
  const westR3 = all.filter(m => getConference(m) === 'West' && getRound(m) === 3)
  const eastR1 = all.filter(m => getConference(m) === 'East' && getRound(m) === 1)
  const eastR2 = all.filter(m => getConference(m) === 'East' && getRound(m) === 2)
  const eastR3 = all.filter(m => getConference(m) === 'East' && getRound(m) === 3)
  const finals = all.find(m => getRound(m) === 4) ?? all.find(m => getConference(m) === 'Finals')

  return (
    <div style={{ position: 'relative', minHeight: 560, padding: '28px 24px', border: `1px solid ${t.hex}18`, borderRadius: 10, background: 'radial-gradient(circle at center, rgba(34,211,238,0.08), rgba(2,6,23,0) 45%)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: '50%', top: 70, bottom: 40, width: 1, background: `linear-gradient(180deg, transparent, ${t.hex}77, transparent)` }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.05fr 0.9fr 230px 0.9fr 1.05fr 1.3fr', gap: 16, alignItems: 'center', height: '100%' }}>
        <BracketColumn matchups={westR1} league={league} label="R1" compact gap={14} />
        <BracketColumn matchups={westR2} league={league} label="R2" compact gap={42} />
        <BracketColumn matchups={westR3} league={league} label="WCF" compact={false} gap={96} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#fbbf24', letterSpacing: '0.42em', fontWeight: 900 }}>FINALS</div>
          {finals ? <SeriesCard matchup={finals} league={league} /> : <EmptySlot league={league} label="FINALS" />}
          <ChampionCard summary={{ status: 'ok', mode: 'simulation', data, meta: { league: league as any, simulationRuns: 0, generatedAt: null, validationMode: 'unvalidated' } }} league={league} loading={false} />
        </div>
        <BracketColumn matchups={eastR3} league={league} label="ECF" compact={false} gap={96} />
        <BracketColumn matchups={eastR2} league={league} label="R2" compact gap={42} />
        <BracketColumn matchups={eastR1} league={league} label="R1" compact gap={14} />
      </div>
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
        <div style={{ fontFamily: 'var(--font-inter)', fontWeight: 800, fontSize: 11, color: '#34d399' }}>{validation.mode === 'live_projection' ? 'SEEDED BASELINE + LIVE OVERLAY' : `${(Number(validation.overallAccuracy) * 100).toFixed(1)}% ACCURACY`}</div>
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
  const hasLiveSeriesData = summaryOk?.data.validation.mode === 'live_projection' || liveSeriesMap.size > 0

  if (!loading && summaryError && !hasLiveSeriesData) {
    return <StatusShell embedded={embedded} league={selectedLeague} title={`${selectedLeague} PLAYOFF SNAPSHOT UNAVAILABLE`} message={summary?.message ?? 'Projection snapshot unavailable.'} />
  }

  const pendingMessage = summaryPending
    ? 'Waiting for live playoff snapshot or completed series reconstruction. No mock bracket is shown in production.'
    : 'Waiting for projection snapshot. No mock bracket is shown in production.'

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
                  SYNC: {hasLiveSeriesData ? 'SEEDED_LIVE_OVERLAY' : summaryPending ? 'PENDING' : summaryError ? 'ERROR' : 'SNAPSHOT'}
                </span>
              </div>
            </div>
          </div>
        )}

        {summaryOk ? <ButterflyBracket data={summaryOk.data} league={selectedLeague} /> : <PendingButterflyBracket league={selectedLeague} message={pendingMessage} />}

        <LiveSeriesStrip league={selectedLeague} seriesMap={liveSeriesMap} />

        <div style={{ display: 'flex', gap: 20, marginTop: 32, flexWrap: 'wrap' }}>
          <FinalsMatchupCard summary={summaryOk} league={selectedLeague} loading={loading} />
          <TitleDistributionTable summary={summaryOk} league={selectedLeague} loading={loading} />
          <ValidationSummaryCard summary={summaryOk} loading={loading} />
        </div>
      </div>
    </div>
  )
}
