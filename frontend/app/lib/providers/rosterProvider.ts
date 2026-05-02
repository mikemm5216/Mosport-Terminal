import { canCallProvider, recordProviderSuccess, recordProviderError } from '../apiGovernor'
import { ROSTER_DATA } from '../../data/mockData'

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
  source: 'espn_roster_provider' | 'cached_team_roster' | 'mock_seeded_team_roster' | 'unavailable'
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

// Extract from ROSTER_DATA (for demo purposes only)
if (ROSTER_DATA['mlb_2026_min_nym']) {
  registerSeed('MLB', 'MIN', ROSTER_DATA['mlb_2026_min_nym'].away)
  registerSeed('MLB', 'NYM', ROSTER_DATA['mlb_2026_min_nym'].home)
}

async function fetchRosterFromExternal(league: string, teamCode: string): Promise<{ players: ProviderRosterPlayer[], source: RosterSnapshot['source'] } | null> {
  // Try real API...
  // Fallback to seed for demo purposes
  const key = getCacheKey(league, teamCode)
  const seeded = SEED_ROSTER.get(key)
  if (seeded && seeded.length > 0) {
    return { players: seeded, source: 'mock_seeded_team_roster' }
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
    return cached
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


