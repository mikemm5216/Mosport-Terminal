import type { CanonicalTeamKey, LeagueCode } from '../contracts/product'

const TEAM_CODE_NORMALIZATION: Record<LeagueCode, Record<string, string>> = {
  MLB: {
    LA: 'LAD', LAD: 'LAD', NY: 'NYY', NYY: 'NYY', SF: 'SFG', SFG: 'SFG', WSH: 'WSH', WAS: 'WSH', CHW: 'CHW', CWS: 'CHW',
  },
  NBA: {
    LA: 'LAL', LAL: 'LAL', GS: 'GSW', GSW: 'GSW', NY: 'NYK', NYK: 'NYK', PHO: 'PHX', PHX: 'PHX', NO: 'NOP', NOP: 'NOP', SA: 'SAS', SAS: 'SAS',
  },
  EPL: {
    MAN_CITY: 'MCI', MANCHESTER_CITY: 'MCI', MAN_UNITED: 'MUN', MANCHESTER_UNITED: 'MUN', SPURS: 'TOT', TOTTENHAM: 'TOT',
  },
  UCL: {},
  NHL: {},
}

export function normalizeTeamCode(league: LeagueCode, rawCode: string): string {
  const cleaned = rawCode.trim().toUpperCase().replace(/\s+/g, '_')
  return TEAM_CODE_NORMALIZATION[league]?.[cleaned] ?? cleaned
}

export function toCanonicalTeamKey(league: LeagueCode, rawCode: string): CanonicalTeamKey {
  return `${league}_${normalizeTeamCode(league, rawCode)}`
}
