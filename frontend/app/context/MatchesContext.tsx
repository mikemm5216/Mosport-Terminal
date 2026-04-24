'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Match } from '../data/mockData'

type MatchesState = {
  matches: Match[]
  loading: boolean
  error: string | null
  refresh: () => void
}

const MatchesContext = createContext<MatchesState>({
  matches: [],
  loading: true,
  error: null,
  refresh: () => {},
})

export function MatchesProvider({ children }: { children: React.ReactNode }) {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMatches = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/games', { cache: 'no-store' })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()
      setMatches(data.matches ?? [])
    } catch (err: any) {
      setError(err.message)
      setMatches([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMatches()
    // Refresh every 2 minutes for live score updates
    const id = setInterval(fetchMatches, 2 * 60 * 1000)
    return () => clearInterval(id)
  }, [fetchMatches])

  return (
    <MatchesContext.Provider value={{ matches, loading, error, refresh: fetchMatches }}>
      {children}
    </MatchesContext.Provider>
  )
}

export function useMatchesContext() {
  return useContext(MatchesContext)
}
