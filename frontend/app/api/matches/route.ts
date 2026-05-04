import { NextResponse } from 'next/server'
import type { Match } from '../../data/mockData'
import type { LiveMatchCard, LiveMatchesResponse } from '../../contracts/product'
import { toCanonicalTeamKey } from '../../config/teamCodeNormalization'
import { getTeamLogo } from '../../lib/teamLogoResolver'
import { GET as legacyGamesGet } from '../games/route'
import type { RosterSnapshot, RosterPlayerSnapshot } from '../../contracts/roster'

function parseLeague(raw: string | null): LiveMatchesResponse['meta']['league'] {
  const candidate = (raw ?? 'ALL').toUpperCase()
  if (['ALL', 'MLB', 'NBA', 'EPL', 'UCL', 'NHL'].includes(candidate)) {
    return candidate as LiveMatchesResponse['meta']['league']
  }
  return 'ALL'
}

function parseStatus(status: Match['status']): LiveMatchCard['status'] {
  if (status === 'LIVE') return 'live'
  if (status === 'FINAL') return 'closed'
  return 'scheduled'
}

function toLiveRosterSnapshot(snapshot: RosterSnapshot | undefined): RosterSnapshot | undefined {
  if (!snapshot) return undefined
  return {
    league: snapshot.league,
    teamCode: snapshot.teamCode,
    source: snapshot.source,
    updatedAtMs: snapshot.updatedAtMs,
    players: (snapshot.players ?? []).map((p: RosterPlayerSnapshot) => ({
      name: p.name,
      position: p.position,
      jersey: p.jersey,
      isStarter: p.isStarter,
      depthRank: p.depthRank,
      availability: p.availability,
    })),
  }
}

function parseDecision(m: Match): LiveMatchCard['decision'] {
  const abs = Math.abs(m.wpa)
  if (m.tactical_label === 'HIGH_CONFIDENCE') return { label: 'STRONG', action: m.perspective === 'HOME' ? 'LEAN_HOME' : 'LEAN_AWAY', score: abs, explanation: null }
  if (m.tactical_label === 'OUTLIER_POTENTIAL') return { label: 'UPSET', action: 'UPSET_WATCH', score: abs, explanation: null }
  if (m.tactical_label === 'VULNERABILITY') return { label: 'CHAOS', action: 'AVOID', score: abs, explanation: null }
  return { label: 'WEAK', action: 'NO_ACTION', score: abs || null, explanation: null }
}

function toCard(m: Match, fallbackUsed: boolean): LiveMatchCard {
  const homeCode = m.home.abbr.toUpperCase()
  const awayCode = m.away.abbr.toUpperCase()

  return {
    id: m.id,
    mode: 'live',
    league: m.league,
    startsAt: new Date().toISOString(),
    status: parseStatus(m.status),
    periodLabel: m.status === 'LIVE' ? m.time : null,
    clockLabel: m.time,
    home: {
      id: `${m.league}-${homeCode}`,
      code: homeCode,
      canonicalKey: toCanonicalTeamKey(m.league, homeCode),
      displayName: m.home.name,
      shortName: homeCode,
      logoUrl: getTeamLogo(m.league, homeCode),
    },
    away: {
      id: `${m.league}-${awayCode}`,
      code: awayCode,
      canonicalKey: toCanonicalTeamKey(m.league, awayCode),
      displayName: m.away.name,
      shortName: awayCode,
      logoUrl: getTeamLogo(m.league, awayCode),
    },
    score: {
      home: m.score?.home ?? null,
      away: m.score?.away ?? null,
    },
    season: m.season,
    seasonYear: m.seasonYear,
    seasonType: m.seasonType,
    playoff: m.playoff,
    decision: parseDecision(m),
    rosters: m.rosters?.home && m.rosters?.away
      ? {
          home: toLiveRosterSnapshot(m.rosters.home)!,
          away: toLiveRosterSnapshot(m.rosters.away)!,
        }
      : undefined,
    dataSources: {
      roster: {
        home: m.rosters?.home?.source ?? 'unavailable',
        away: m.rosters?.away?.source ?? 'unavailable',
      }
    },
    meta: {
      sourceProvider: 'unknown',
      fallbackUsed,
      updatedAt: new Date().toISOString(),
    },
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') ?? 'live'
  const league = parseLeague(searchParams.get('league'))
  const queryDate = searchParams.get('date') ?? new Date().toISOString().slice(0, 10)

  if (mode !== 'live') {
    return NextResponse.json({ status: 'error', mode: 'live', data: [], meta: { queryDate, league, matchCount: 0, lastUpdatedAt: null, dataFreshness: 'offline', sourceProvider: 'unknown', fallbackUsed: false } } satisfies LiveMatchesResponse, { status: 400 })
  }

  const legacyResponse = await legacyGamesGet()
  const payload = await legacyResponse.json()
  const rawMatches: Match[] = payload.matches ?? []
  const fallbackUsed = Boolean(payload.meta?.fallbackUsed)
  const sourceValues = Object.values(payload.meta?.sources ?? {})

  const data = rawMatches
    .filter((m) => league === 'ALL' || m.league === league)
    .map((m) => toCard(m, fallbackUsed))

  const response: LiveMatchesResponse = {
    status: 'ok',
    mode: 'live',
    data,
    meta: {
      queryDate,
      league,
      matchCount: data.length,
      lastUpdatedAt: data.length ? new Date().toISOString() : null,
      dataFreshness: data.length ? 'live' : 'offline',
      sourceProvider: sourceValues.includes('espn') && sourceValues.includes('sportradar') ? 'mixed' : sourceValues.includes('espn') ? 'espn' : sourceValues.includes('sportradar') ? 'sportradar' : 'unknown',
      fallbackUsed,
    },
  }

  return NextResponse.json(response)
}
