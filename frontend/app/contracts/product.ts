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
  decision: {
    label: 'STRONG' | 'UPSET' | 'CHAOS' | 'WEAK' | 'NONE'
    action: 'LEAN_HOME' | 'LEAN_AWAY' | 'UPSET_WATCH' | 'AVOID' | 'NO_ACTION'
    score: number | null
    explanation: string | null
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

export type SimulationSummaryResponse = {
  status: 'ok' | 'error'
  mode: 'simulation'
  data: PlayoffSimulationSummary
  meta: {
    league: 'NBA'
    simulationRuns: number
    generatedAt: string
    validationMode: 'live_projection' | 'historical_backtest' | 'unvalidated'
  }
}
