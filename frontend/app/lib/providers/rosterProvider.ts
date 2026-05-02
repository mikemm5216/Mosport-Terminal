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
const ROSTER_FAIL_TTL_MS = 1 * 60 * 60 * 1000 // 1 hour for failures

const ESPN_ROSTER_CONFIG: Record<string, { sport: string, league: string }> = {
  NBA: { sport: 'basketball', league: 'nba' },
  MLB: { sport: 'baseball', league: 'mlb' },
  NHL: { sport: 'hockey', league: 'nhl' },
  EPL: { sport: 'soccer', league: 'eng.1' },
  UCL: { sport: 'soccer', league: 'uefa.champions' },
}

const teamIdCache = new Map<string, { id: string | null, updatedAtMs: number }>()
const TEAM_ID_CACHE_TTL = 24 * 60 * 60 * 1000
const TEAM_ID_FAIL_TTL = 1 * 60 * 60 * 1000

function getCacheKey(league: string, teamCode: string, espnId?: string): string {
  if (espnId) return `${league.toUpperCase()}::${teamCode.toUpperCase()}::${espnId}`
  return `${league.toUpperCase()}::${teamCode.toUpperCase()}`
}

async function resolveEspnTeamId(leagueKey: string, teamCode: string): Promise<string | null> {
  const config = ESPN_ROSTER_CONFIG[leagueKey]
  if (!config) return null
  
  const cacheKey = `${leagueKey}::${teamCode.toUpperCase()}`
  const now = Date.now()
  const cached = teamIdCache.get(cacheKey)
  if (cached) {
    if (cached.id && now - cached.updatedAtMs < TEAM_ID_CACHE_TTL) return cached.id
    if (!cached.id && now - cached.updatedAtMs < TEAM_ID_FAIL_TTL) return null
  }

  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${config.sport}/${config.league}/teams`
    // using standard fetch
    const res = await fetch(url)
    if (!res.ok) throw new Error(`ESPN teams endpoint failed: ${res.status}`)
    const data = await res.json()
    const teams = data.sports?.[0]?.leagues?.[0]?.teams || []
    
    const code = teamCode.toUpperCase()
    for (const t of teams) {
      const teamObj = t.team || t
      if (teamObj.abbreviation?.toUpperCase() === code || 
          teamObj.shortDisplayName?.toUpperCase() === code ||
          teamObj.displayName?.toUpperCase() === code) {
        teamIdCache.set(cacheKey, { id: teamObj.id, updatedAtMs: now })
        return teamObj.id
      }
    }
    teamIdCache.set(cacheKey, { id: null, updatedAtMs: now })
    return null
  } catch (err) {
    console.error(`[rosterProvider] resolveEspnTeamId error for ${leagueKey} ${teamCode}:`, err)
    teamIdCache.set(cacheKey, { id: null, updatedAtMs: now })
    return null
  }
}

function parseEspnRoster(data: any): ProviderRosterPlayer[] {
  const result: ProviderRosterPlayer[] = []
  
  if (!data) return result

  let athletes = data.athletes || []
  
  if (Array.isArray(athletes) && athletes.length > 0 && athletes[0].items) {
    athletes = athletes.reduce((acc: any[], group: any) => {
      if (Array.isArray(group.items)) {
        return acc.concat(group.items)
      }
      return acc
    }, [])
  }

  if (!Array.isArray(athletes)) return result

  for (const item of athletes) {
    const ath = item.athlete || item
    
    if (!ath) continue
    
    const name = ath.displayName || ath.fullName || item.displayName || item.fullName
    if (!name) continue
      
    let posStr: string | undefined
    const posObj = ath.position || item.position
    if (posObj) {
      posStr = posObj.abbreviation || posObj.name
    }
    
    result.push({
      name,
      position: posStr,
      availability: 'ACTIVE',
    })
  }

  return result
}

const SEED_ROSTER = new Map<string, ProviderRosterPlayer[]>()

function registerSeed(league: string, teamCode: string, players: any[] = []) {
  if (!players || !Array.isArray(players)) return
  const key = `${league.toUpperCase()}::${teamCode.toUpperCase()}`
  const existing = SEED_ROSTER.get(key) ?? []
  
  for (const p of players) {
    if (!existing.find(e => e.name === p.name)) {
      existing.push({
        name: p.name,
        position: p.pos ? String(p.pos).split(' ')[0] : undefined,
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

async function fetchRosterFromExternal(league: string, teamCode: string, espnId?: string): Promise<{ players: ProviderRosterPlayer[], source: RosterSnapshot['source'] } | null> {
  const leagueKey = league.toUpperCase()
  const config = ESPN_ROSTER_CONFIG[leagueKey]

  let resolvedId = espnId
  if (config && !resolvedId) {
    resolvedId = await resolveEspnTeamId(leagueKey, teamCode) || undefined
  }

  if (config && resolvedId) {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/${config.sport}/${config.league}/teams/${resolvedId}/roster`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        const players = parseEspnRoster(data)
        if (players.length > 0) {
          return { players, source: 'espn_roster_provider' }
        }
      }
    } catch (err) {
      console.error(`[rosterProvider] ESPN roster fetch error for ${league} ${teamCode}:`, err)
    }
  }

  // Fallback to seed for demo purposes
  const key = `${league.toUpperCase()}::${teamCode.toUpperCase()}`
  const seeded = SEED_ROSTER.get(key)
  if (seeded && seeded.length > 0) {
    return { players: seeded, source: 'mock_seeded_team_roster' }
  }
  return null
}

export async function getTeamRosterSnapshot(params: {
  league: string
  teamCode: string
  espnId?: string
}): Promise<RosterSnapshot> {
  const { league, teamCode, espnId } = params
  const cacheKey = getCacheKey(league, teamCode, espnId)
  const now = Date.now()

  const cached = rosterCache.get(cacheKey)
  if (cached) {
    if (cached.players.length > 0 && now - cached.updatedAtMs < CACHE_TTL_MS) {
      return cached
    }
    if (cached.source === 'unavailable' && now - cached.updatedAtMs < ROSTER_FAIL_TTL_MS) {
      return cached
    }
  }

  try {
    const fetched = await fetchRosterFromExternal(league, teamCode, espnId)
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

  const unavailableSnapshot: RosterSnapshot = {
    league,
    teamCode,
    players: [],
    source: 'unavailable',
    updatedAtMs: now,
  }
  rosterCache.set(cacheKey, unavailableSnapshot)
  return unavailableSnapshot
}


