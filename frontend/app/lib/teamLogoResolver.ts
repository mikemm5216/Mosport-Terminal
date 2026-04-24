import type { League } from '../data/mockData'
import { normalizeTeamCode, toCanonicalTeamKey } from '../config/teamCodeNormalization'
import { TEAM_LOGOS } from '../config/teamLogos'

export const TEAM_LOGO_FALLBACK = '/logos/fallback.png'

export function getTeamLogo(league: League, rawCode: string): string {
  const normalizedCode = normalizeTeamCode(league, rawCode)
  const canonicalKey = toCanonicalTeamKey(league, rawCode)
  const resolvedPath = TEAM_LOGOS[canonicalKey] ?? TEAM_LOGO_FALLBACK

  if (process.env.NODE_ENV !== 'production') {
    console.warn('[logo-resolve]', {
      league,
      rawCode,
      normalizedCode,
      canonicalKey,
      resolvedPath,
      found: Boolean(resolvedPath && resolvedPath !== TEAM_LOGO_FALLBACK),
    })
  }

  if (resolvedPath !== TEAM_LOGO_FALLBACK) {
    return resolvedPath
  }

  const expectedPath = `/logos/${league.toLowerCase()}/${normalizedCode.toLowerCase()}.png`

  console.warn('[logo-missing]', {
    league,
    rawCode,
    normalizedCode,
    canonicalKey,
    expectedPath,
  })

  return TEAM_LOGO_FALLBACK
}
