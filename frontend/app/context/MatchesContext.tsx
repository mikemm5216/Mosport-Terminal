'use client'

// ── DATA CONTRACT ────────────────────────────────────────────────────────────
// ALLOWED:   /api/games, /api/matches
// FORBIDDEN: /api/admin/*, /api/ingest/*, any internal pipeline routes
// This context is the ONLY permitted data source for match data in the UI.
// ────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Match } from '../data/mockData'

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

function computeFreshness(
  matches: Match[],
  loading: boolean,
  error: string | null,
  lastSuccessAt: number | null,
): DataFreshness {
  if (loading) return 'stale'
  if (error || matches.length === 0) return 'offline'
  if (!lastSuccessAt) return 'offline'
  const ageMs = Date.now() - lastSuccessAt
  if (ageMs < 3 * 60 * 1000) return 'live'
  if (ageMs < 10 * 60 * 1000) return 'recent'
  return 'stale'
}

export function MatchesProvider({ children }: { children: React.ReactNode }) {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSuccessAt, setLastSuccessAt] = useState<number | null>(null)

  const fetchMatches = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/games', { cache: 'no-store' })
      if (!res.ok) throw new Error(`/api/games returned ${res.status}`)
      const data = await res.json()
      const live: Match[] = data.matches ?? []
      // Never fall back to mock — if API returns 0, surface as offline
      setMatches(live)
      if (live.length > 0) setLastSuccessAt(Date.now())
    } catch (err: any) {
      setError(err.message)
      setMatches([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMatches()
    const id = setInterval(fetchMatches, 2 * 60 * 1000)
    return () => clearInterval(id)
  }, [fetchMatches])

  const dataFreshness = computeFreshness(matches, loading, error, lastSuccessAt)

  return (
    <MatchesContext.Provider value={{ matches, loading, error, dataFreshness, refresh: fetchMatches }}>
      {children}
    </MatchesContext.Provider>
  )
}

export function useMatchesContext() {
  return useContext(MatchesContext)
}

// ── DataFreshnessBadge ───────────────────────────────────────────────────────
const FRESHNESS_META: Record<DataFreshness, { label: string; color: string; dot: string }> = {
  live:    { label: 'LIVE',    color: '#34d399', dot: '#34d399' },
  recent:  { label: 'RECENT', color: '#22d3ee', dot: '#22d3ee' },
  stale:   { label: 'STALE',  color: '#fbbf24', dot: '#fbbf24' },
  offline: { label: 'OFFLINE', color: '#ef4444', dot: '#ef4444' },
}

export function DataFreshnessBadge({ freshness }: { freshness: DataFreshness }) {
  const m = FRESHNESS_META[freshness]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px',
      border: `1px solid ${m.color}33`,
      borderRadius: 2,
      fontFamily: 'var(--font-mono), monospace',
      fontSize: 9, fontWeight: 800, letterSpacing: '0.22em',
      color: m.color,
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: m.dot,
        boxShadow: freshness === 'live' ? `0 0 6px ${m.dot}` : 'none',
      }} />
      DATA · {m.label}
    </span>
  )
}
