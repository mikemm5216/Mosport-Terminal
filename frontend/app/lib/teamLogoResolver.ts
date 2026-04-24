import type { LeagueCode } from '../contracts/product'
import { toCanonicalTeamKey } from '../config/teamCodeNormalization'
import { TEAM_LOGOS } from '../config/teamLogos'

const FALLBACK_LOGO = '/logos/fallback.png'

export function getTeamLogo(league: LeagueCode, rawCode: string): string {
  const key = toCanonicalTeamKey(league, rawCode)
  const direct = TEAM_LOGOS[key]
  if (direct) return direct

  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[logos] Missing canonical logo map for ${key}; using fallback logo.`)
  }

  return FALLBACK_LOGO
}
