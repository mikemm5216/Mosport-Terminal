export type ProductMode = 'live' | 'simulation'
export type LeagueCode = 'MLB' | 'NBA' | 'EPL' | 'UCL' | 'NHL'
export type LeagueFilter = 'ALL' | LeagueCode
export type CanonicalTeamKey = `${LeagueCode}_${string}`

export type AppViewState = {
  mode: ProductMode
  selectedLeague: LeagueFilter
}

export type TeamRef = {
  id: string
  code: string
  canonicalKey: CanonicalTeamKey
  displayName: string
  shortName: string
  logoUrl: string
  seed?: number | null
  record?: string | null
}

import type { RosterSnapshot, RosterSource } from './roster'
import type { PlayoffInfo } from '../data/mockData'

export type LiveMatchCard = {
  id: string
  mode: 'live'
  league: LeagueCode
  startsAt: string
  status: 'scheduled' | 'live' | 'closed' | 'postponed' | 'cancelled'
  periodLabel: string | null
  clockLabel: string | null
  home: TeamRef
  away: TeamRef
  score: {
    home: number | null
    away: number | null
  }
  season?: string
  seasonYear?: number
  seasonType?: 'regular' | 'postseason' | 'preseason'
  playoff?: PlayoffInfo
  decision: {
    label: 'STRONG' | 'UPSET' | 'CHAOS' | 'WEAK' | 'NONE'
    action: 'LEAN_HOME' | 'LEAN_AWAY' | 'UPSET_WATCH' | 'AVOID' | 'NO_ACTION'
    score: number | null
    explanation: string | null
  }
  rosters?: {
    home: RosterSnapshot
    away: RosterSnapshot
  }
  dataSources?: {
    roster?: {
      home: RosterSource
      away: RosterSource
    }
  }
  meta: {
    sourceProvider: 'espn' | 'sportradar' | 'unknown'
    fallbackUsed: boolean
    updatedAt: string | null
  }
}

export type LiveMatchesResponse = {
  status: 'ok' | 'error'
  mode: 'live'
  data: LiveMatchCard[]
  meta: {
    queryDate: string
    league: LeagueFilter
    matchCount: number
    lastUpdatedAt: string | null
    dataFreshness: 'live' | 'recent' | 'stale' | 'offline'
    sourceProvider: 'espn' | 'sportradar' | 'mixed' | 'unknown'
    fallbackUsed: boolean
  }
}

export type PlayoffSimulationSummary = {
  projectedChampion: {
    team: TeamRef
    titleProbability: number
  }
  mostLikelyFinalsMatchup: {
    teamA: TeamRef
    teamB: TeamRef
    probability: number
  }
  titleDistribution: Array<{
    team: TeamRef
    probability: number
  }>
  bracket: {
    rounds: Array<{
      roundName: string
      matchups: Array<{
        teamA: TeamRef
        teamB: TeamRef
        projectedWinner: TeamRef
        winProbability: number
        seriesScore?: string | null
      }>
    }>
  }
  validation: {
    mode: 'live_projection' | 'historical_backtest' | 'unvalidated'
    overallAccuracy: number | null
    notes: string | null
  }
}

type SimulationSummaryMeta = {
  league: LeagueCode
  simulationRuns: number
  generatedAt: string | null
  validationMode: 'live_projection' | 'historical_backtest' | 'unvalidated'
}

export type SimulationOkSummary = {
  status: 'ok'
  mode: 'simulation'
  data: PlayoffSimulationSummary
  meta: SimulationSummaryMeta
}

export type SimulationPendingSummary = {
  status: 'pending'
  mode: 'simulation'
  message: string
  data: null
  meta: SimulationSummaryMeta & {
    simulationRuns: 0
    generatedAt: null
    validationMode: 'unvalidated'
  }
}

export type SimulationErrorSummary = {
  status: 'error'
  mode: 'simulation'
  message: string
  data: null
  meta?: SimulationSummaryMeta & {
    simulationRuns: 0
    generatedAt: null
    validationMode: 'unvalidated'
  }
}

export type SimulationSummaryResponse = SimulationOkSummary | SimulationPendingSummary | SimulationErrorSummary
