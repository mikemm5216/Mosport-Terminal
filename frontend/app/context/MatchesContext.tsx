'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import type { Match, TacticalLabel } from '../data/mockData'
import type { LiveMatchCard, LiveMatchesResponse } from '../contracts/product'

export type DataFreshness = 'live' | 'recent' | 'stale' | 'offline'

type MatchesState = {
  matches: Match[]
  loading: boolean
  error: string | null
  dataFreshness: DataFreshness
  refresh: () => void
}

const MatchesContext = createContext<MatchesState>({
  matches: [],
  loading: true,
  error: null,
  dataFreshness: 'offline',
  refresh: () => {},
})

function computeFreshness(matches: Match[], loading: boolean, error: string | null, lastSuccessAt: number | null): DataFreshness {
  if (loading) return 'stale'
  if (error || matches.length === 0) return 'offline'
  if (!lastSuccessAt) return 'offline'
  const ageMs = Date.now() - lastSuccessAt
  if (ageMs < 5 * 60 * 1000) return 'live'
  if (ageMs < 30 * 60 * 1000) return 'recent'
  return 'stale'
}

function toLegacyStatus(status: LiveMatchCard['status']): Match['status'] {
  if (status === 'live') return 'LIVE'
  if (status === 'closed') return 'FINAL'
  return 'SCHEDULED'
}

function toLegacyLabel(label: LiveMatchCard['decision']['label']): TacticalLabel {
  if (label === 'STRONG') return 'HIGH_CONFIDENCE'
  if (label === 'UPSET') return 'OUTLIER_POTENTIAL'
  if (label === 'CHAOS') return 'VULNERABILITY'
  return 'UNCERTAIN'
}

function adaptLiveCard(card: LiveMatchCard): Match {
  return {
    id: card.id,
    league: card.league,
    status: toLegacyStatus(card.status),
    time: card.clockLabel ?? card.periodLabel ?? card.startsAt,
    away: {
      abbr: card.away.shortName,
      name: card.away.displayName,
      city: card.away.displayName,
    },
    home: {
      abbr: card.home.shortName,
      name: card.home.displayName,
      city: card.home.displayName,
    },
    score: card.score.home == null && card.score.away == null ? null : {
      away: card.score.away ?? 0,
      home: card.score.home ?? 0,
    },
    baseline_win: card.decision.score ?? 0.5,
    physio_adjusted: card.decision.score ?? 0.5,
    wpa: card.decision.score ?? 0,
    perspective: card.decision.action.includes('HOME') ? 'HOME' : 'AWAY',
    tactical_label: toLegacyLabel(card.decision.label),
    matchup_complexity: 0.5,
    recovery_away: 0.72,
    recovery_home: 0.72,
    rosters: card.rosters,
  }
}

export function MatchesProvider({ children }: { children: React.ReactNode }) {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSuccessAt, setLastSuccessAt] = useState<number | null>(null)

  // Tracks when the last auto-refresh (focus/visibility) was triggered.
  // Manual refresh via refresh() bypasses this.
  const lastAutoFetchAt = useRef<number>(0)
  const AUTO_REFRESH_THROTTLE_MS = 60_000  // 60 seconds

  const fetchMatches = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/matches?mode=live&league=ALL')
      if (!res.ok) throw new Error(`/api/matches returned ${res.status}`)
      const data: LiveMatchesResponse = await res.json()
      const live = (data.data ?? []).map(adaptLiveCard)
      setMatches(live)
      if (live.length > 0) setLastSuccessAt(Date.now())
      if (data.status === 'error') setError('Live endpoint returned error status')
    } catch (err: any) {
      setError(err.message)
      setMatches([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial load — always fetch
    fetchMatches()
    lastAutoFetchAt.current = Date.now()

    const onFocus = () => {
      const now = Date.now()
      if (now - lastAutoFetchAt.current >= AUTO_REFRESH_THROTTLE_MS) {
        lastAutoFetchAt.current = now
        fetchMatches()
      }
    }
    const onVisibility = () => {
      if (document.hidden) return
      const now = Date.now()
      if (now - lastAutoFetchAt.current >= AUTO_REFRESH_THROTTLE_MS) {
        lastAutoFetchAt.current = now
        fetchMatches()
      }
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [fetchMatches])

  const dataFreshness = computeFreshness(matches, loading, error, lastSuccessAt)

  return <MatchesContext.Provider value={{ matches, loading, error, dataFreshness, refresh: fetchMatches }}>{children}</MatchesContext.Provider>
}

export function useMatchesContext() {
  return useContext(MatchesContext)
}

const FRESHNESS_META: Record<DataFreshness, { label: string; color: string; dot: string }> = {
  live: { label: 'LIVE', color: '#34d399', dot: '#34d399' },
  recent: { label: 'RECENT', color: '#22d3ee', dot: '#22d3ee' },
  stale: { label: 'STALE', color: '#fbbf24', dot: '#fbbf24' },
  offline: { label: 'OFFLINE', color: '#ef4444', dot: '#ef4444' },
}

export function DataFreshnessBadge({ freshness }: { freshness: DataFreshness }) {
  const m = FRESHNESS_META[freshness]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', border: `1px solid ${m.color}33`, borderRadius: 2,
      fontFamily: 'var(--font-mono), monospace', fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', color: m.color,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.dot, boxShadow: freshness === 'live' ? `0 0 6px ${m.dot}` : 'none' }} />
      DATA · {m.label}
    </span>
  )
}
