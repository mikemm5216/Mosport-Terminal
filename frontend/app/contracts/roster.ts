export type RosterSource =
  | 'espn_roster_provider'
  | 'live_roster_provider'
  | 'cached_team_roster'
  | 'mock_seeded_team_roster'
  | 'unavailable'

export type RosterPlayerSnapshot = {
  name: string
  position?: string
  jersey?: string
  isStarter?: boolean
  depthRank?: number
  availability?: 'ACTIVE' | 'QUESTIONABLE' | 'DOUBTFUL' | 'OUT' | 'UNKNOWN'
}

export type RosterSnapshot = {
  league: string
  teamCode: string
  players: RosterPlayerSnapshot[]
  source: RosterSource
  updatedAtMs: number
}
