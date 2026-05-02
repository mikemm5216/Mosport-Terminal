import { canCallProvider, recordProviderSuccess, recordProviderError } from '../apiGovernor'
import { KEY_PLAYERS, ROSTER_DATA } from '../../data/mockData'

export type ProviderRosterPlayer = {
  name: string
  position?: string
  isStarter?: boolean
  depthRank?: number
  availability?: 'ACTIVE' | 'QUESTIONABLE' | 'DOUBTFUL' | 'OUT' | 'UNKNOWN'
}

export type RosterSnapshot = {
  league: string
  teamCode: string
  players: ProviderRosterPlayer[]
  source: 'espn_roster_provider' | 'cached_team_roster' | 'seeded_team_roster' | 'unavailable'
  updatedAtMs: number
}

const rosterCache = new Map<string, RosterSnapshot>()
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours as suggested

function getCacheKey(league: string, teamCode: string): string {
  return `${league.toUpperCase()}::${teamCode.toUpperCase()}`
}

const SEED_ROSTER = new Map<string, ProviderRosterPlayer[]>()

function registerSeed(league: string, teamCode: string, players: any[] = []) {
  if (!players || !Array.isArray(players)) return
  const key = getCacheKey(league, teamCode)
  const existing = SEED_ROSTER.get(key) ?? []
  
  for (const p of players) {
    if (!existing.find(e => e.name === p.name)) {
      existing.push({
        name: p.name,
        position: p.pos ? String(p.pos).split(' ')[0] : undefined, // clean "SP · #49" -> "SP"
        availability: p.flag === 'REST' ? 'OUT' : p.flag === 'MONITOR' ? 'QUESTIONABLE' : 'ACTIVE',
      })
    }
  }
  SEED_ROSTER.set(key, existing)
}

// Extract from ROSTER_DATA
if (ROSTER_DATA['mlb_2026_min_nym']) {
  registerSeed('MLB', 'MIN', ROSTER_DATA['mlb_2026_min_nym'].away)
  registerSeed('MLB', 'NYM', ROSTER_DATA['mlb_2026_min_nym'].home)
}

// Extract from KEY_PLAYERS
registerSeed('NBA', 'LAL', KEY_PLAYERS['nba_2026_lal_gsw_away'])
registerSeed('NBA', 'GSW', KEY_PLAYERS['nba_2026_lal_gsw_home'])
registerSeed('EPL', 'MCI', KEY_PLAYERS['epl_2026_mci_liv_away'])
registerSeed('EPL', 'LIV', KEY_PLAYERS['epl_2026_mci_liv_home'])
registerSeed('EPL', 'ARS', KEY_PLAYERS['epl_2026_ars_tot_home'])
registerSeed('EPL', 'TOT', KEY_PLAYERS['epl_2026_ars_tot_away'])
registerSeed('UCL', 'RMA', KEY_PLAYERS['ucl_2026_rma_bar_home'])
registerSeed('UCL', 'BAR', KEY_PLAYERS['ucl_2026_rma_bar_away'])
registerSeed('NHL', 'BOS', KEY_PLAYERS['nhl_2026_bos_nyr_home'])
registerSeed('NHL', 'NYR', KEY_PLAYERS['nhl_2026_bos_nyr_away'])
registerSeed('MLB', 'LAD', KEY_PLAYERS['mlb_2026_lad_nyy_away'])
registerSeed('MLB', 'NYY', KEY_PLAYERS['mlb_2026_lad_nyy_home'])

async function fetchRosterFromExternal(league: string, teamCode: string): Promise<{ players: ProviderRosterPlayer[], source: RosterSnapshot['source'] } | null> {
  // Try real API...
  // Fallback to seed
  const key = getCacheKey(league, teamCode)
  const seeded = SEED_ROSTER.get(key)
  if (seeded && seeded.length > 0) {
    return { players: seeded, source: 'seeded_team_roster' }
  }
  return null
}

export async function getTeamRosterSnapshot(params: {
  league: string
  teamCode: string
}): Promise<RosterSnapshot> {
  const { league, teamCode } = params
  const cacheKey = getCacheKey(league, teamCode)
  const now = Date.now()

  const cached = rosterCache.get(cacheKey)
  if (cached && now - cached.updatedAtMs < CACHE_TTL_MS) {
    return { ...cached, source: 'cached_team_roster' }
  }

  try {
    const fetched = await fetchRosterFromExternal(league, teamCode)
    if (fetched && fetched.players.length > 0) {
      const snapshot: RosterSnapshot = {
        league,
        teamCode,
        players: fetched.players,
        source: fetched.source,
        updatedAtMs: now,
      }
      rosterCache.set(cacheKey, snapshot)
      return snapshot
    }
  } catch (err) {
    console.error(`[rosterProvider] Error fetching roster for ${league} ${teamCode}:`, err)
  }

  return {
    league,
    teamCode,
    players: [],
    source: 'unavailable',
    updatedAtMs: now,
  }
}

