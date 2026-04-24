import type { League } from '../data/mockData'
import { toCanonicalTeamKey } from '../config/teamCodeNormalization'
import { TEAM_LOGOS } from '../config/teamLogos'

export const TEAM_LOGO_FALLBACK = '/logos/fallback.png'

export function getTeamLogo(league: League, rawCode: string): string {
  const key = toCanonicalTeamKey(league, rawCode)
  const direct = TEAM_LOGOS[key]
  if (direct) return direct

  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[logos] Missing canonical logo map for ${key}; using fallback logo.`)
  }

  return TEAM_LOGO_FALLBACK
}
