// Historical playoff bracket seed used to keep the NBA butterfly bracket complete
// when ESPN's public scoreboard only exposes a partial current-series payload.
// Live ESPN reconstruction overlays this seed by round + team pair.

export type NbaPlayoffSeedSeries = {
  teamA: string
  teamB: string
  teamASeed: number | null
  teamBSeed: number | null
  winsA: number
  winsB: number
  summary: string
  roundName: string
  roundNumber: number
  date: string
}

export const NBA_PLAYOFF_HISTORY_SEED_2026: NbaPlayoffSeedSeries[] = [
  { teamA: 'OKC', teamB: 'PHX', teamASeed: 1, teamBSeed: 8, winsA: 4, winsB: 0, summary: '4-0', roundName: 'Western Conference 1st Round', roundNumber: 1, date: '2026-05-04' },
  { teamA: 'LAL', teamB: 'HOU', teamASeed: 4, teamBSeed: 5, winsA: 4, winsB: 2, summary: '4-2', roundName: 'Western Conference 1st Round', roundNumber: 1, date: '2026-05-04' },
  { teamA: 'MIN', teamB: 'DEN', teamASeed: 6, teamBSeed: 3, winsA: 4, winsB: 2, summary: '4-2', roundName: 'Western Conference 1st Round', roundNumber: 1, date: '2026-05-04' },
  { teamA: 'SAS', teamB: 'POR', teamASeed: 2, teamBSeed: 7, winsA: 4, winsB: 1, summary: '4-1', roundName: 'Western Conference 1st Round', roundNumber: 1, date: '2026-05-04' },

  { teamA: 'DET', teamB: 'ORL', teamASeed: 1, teamBSeed: 8, winsA: 4, winsB: 3, summary: '4-3', roundName: 'Eastern Conference 1st Round', roundNumber: 1, date: '2026-05-04' },
  { teamA: 'CLE', teamB: 'TOR', teamASeed: 4, teamBSeed: 5, winsA: 4, winsB: 3, summary: '4-3', roundName: 'Eastern Conference 1st Round', roundNumber: 1, date: '2026-05-04' },
  { teamA: 'NYK', teamB: 'ATL', teamASeed: 3, teamBSeed: 6, winsA: 4, winsB: 2, summary: '4-2', roundName: 'Eastern Conference 1st Round', roundNumber: 1, date: '2026-05-04' },
  { teamA: 'PHI', teamB: 'BOS', teamASeed: 7, teamBSeed: 2, winsA: 4, winsB: 3, summary: '4-3', roundName: 'Eastern Conference 1st Round', roundNumber: 1, date: '2026-05-04' },

  { teamA: 'OKC', teamB: 'LAL', teamASeed: 1, teamBSeed: 4, winsA: 0, winsB: 0, summary: '0-0', roundName: 'Western Conference Semifinals', roundNumber: 2, date: '2026-05-06' },
  { teamA: 'MIN', teamB: 'SAS', teamASeed: 6, teamBSeed: 2, winsA: 0, winsB: 0, summary: '0-0', roundName: 'Western Conference Semifinals', roundNumber: 2, date: '2026-05-05' },
  { teamA: 'DET', teamB: 'CLE', teamASeed: 1, teamBSeed: 4, winsA: 0, winsB: 0, summary: '0-0', roundName: 'Eastern Conference Semifinals', roundNumber: 2, date: '2026-05-06' },
  { teamA: 'NYK', teamB: 'PHI', teamASeed: 3, teamBSeed: 7, winsA: 0, winsB: 0, summary: '0-0', roundName: 'Eastern Conference Semifinals', roundNumber: 2, date: '2026-05-07' },

  { teamA: 'OKC', teamB: 'SAS', teamASeed: 1, teamBSeed: 2, winsA: 0, winsB: 0, summary: 'TBD', roundName: 'Western Conference Finals', roundNumber: 3, date: '2026-05-19' },
  { teamA: 'DET', teamB: 'NYK', teamASeed: 1, teamBSeed: 3, winsA: 0, winsB: 0, summary: 'TBD', roundName: 'Eastern Conference Finals', roundNumber: 3, date: '2026-05-19' },
  { teamA: 'OKC', teamB: 'DET', teamASeed: 1, teamBSeed: 1, winsA: 0, winsB: 0, summary: 'TBD', roundName: 'NBA Finals', roundNumber: 4, date: '2026-06-01' },
]
