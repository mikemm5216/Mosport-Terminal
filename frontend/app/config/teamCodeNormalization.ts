import type { CanonicalTeamKey, LeagueCode } from '../contracts/product'

const TEAM_CODE_NORMALIZATION: Record<LeagueCode, Record<string, string>> = {
  MLB: {
    LA: 'LAD', LAD: 'LAD', NY: 'NYY', NYY: 'NYY', SF: 'SFG', SFG: 'SFG', WSH: 'WSH', WAS: 'WSH', CHW: 'CHW', CWS: 'CHW',
    CHICAGO_WHITE_SOX: 'CHW', SD: 'SDP', SDP: 'SDP', TB: 'TBR', TBR: 'TBR', KC: 'KCR', KCR: 'KCR',
  },
  NBA: {
    LA: 'LAL', LAL: 'LAL', GS: 'GSW', GSW: 'GSW', NY: 'NYK', NYK: 'NYK', PHO: 'PHX', PHX: 'PHX', NO: 'NOP', NOP: 'NOP', SA: 'SAS', SAS: 'SAS',
  },
  EPL: {
    NFO: 'NFO', NOT: 'NFO', NOTTINGHAM_FOREST: 'NFO',
    SUN: 'SUN', MUN: 'MUN', MAN_UNITED: 'MUN', MANCHESTER_UNITED: 'MUN',
    MCI: 'MCI', MNC: 'MCI', MAN_CITY: 'MCI', MANCHESTER_CITY: 'MCI',
    TOT: 'TOT', SPURS: 'TOT', TOTTENHAM: 'TOT',
    ARS: 'ARS', LIV: 'LIV', CHE: 'CHE',
  },
  UCL: {
    PSG: 'PSG', RMA: 'RMA', BAR: 'BAR', MUN: 'MUN', MCI: 'MCI', ARS: 'ARS', LIV: 'LIV',
    BAY: 'BAY', FCB: 'BAY', BAYERN: 'BAY', BAYERN_MUNICH: 'BAY', 'BAYERN_MÜNCHEN': 'BAY',
  },
  NHL: {
    LA: 'LAK', LAK: 'LAK', TB: 'TBL', TBL: 'TBL', NJ: 'NJD', NJD: 'NJD', VGK: 'VGK', UTA: 'UTA',
  },
}

export function normalizeTeamCode(league: LeagueCode, rawCode: string): string {
  const cleaned = rawCode.trim().toUpperCase().replace(/\s+/g, '_')
  return TEAM_CODE_NORMALIZATION[league]?.[cleaned] ?? cleaned
}

export function toCanonicalTeamKey(league: LeagueCode, rawCode: string): CanonicalTeamKey {
  return `${league}_${normalizeTeamCode(league, rawCode)}`
}
