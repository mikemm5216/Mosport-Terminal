import type { League } from '../data/mockData'
import { normalizeTeamCode, toCanonicalTeamKey } from '../config/teamCodeNormalization'
import { TEAM_LOGOS } from '../config/teamLogos'

export const TEAM_LOGO_FALLBACK = '/logos/fallback.png'

interface ResolveParams {
  league: League
  teamId?: string | number
  abbreviation: string
  displayName?: string
}

/**
 * resolveTeamLogo
 * 
 * Deterministic logo resolver with prioritized fallback logic.
 * Resolution priority:
 * 1. canonical league + teamId (e.g. NBA_1610612747)
 * 2. league + abbreviation (e.g. NBA_LAL)
 * 3. normalized displayName (e.g. NBA_LAKERS)
 * 4. clean neutral fallback badge
 */
export function resolveTeamLogo({
  league,
  teamId,
  abbreviation,
  displayName
}: ResolveParams): string {
  // 1. Try League + TeamId (canonical mapping)
  if (teamId) {
    const idKey = `${league}_ID_${teamId}`
    if (TEAM_LOGOS[idKey]) return TEAM_LOGOS[idKey]
  }

  // 2. Try League + Abbreviation (normalized)
  const normalizedCode = normalizeTeamCode(league, abbreviation)
  const canonicalKey = toCanonicalTeamKey(league, abbreviation)
  if (TEAM_LOGOS[canonicalKey]) return TEAM_LOGOS[canonicalKey]

  // 3. Try Normalized Display Name
  if (displayName) {
    const nameKey = `${league}_${displayName.trim().toUpperCase().replace(/\s+/g, '_')}`
    if (TEAM_LOGOS[nameKey]) return TEAM_LOGOS[nameKey]
    
    // Also try normalization of the display name (handles aliases like "MAN CITY")
    const normalizedName = normalizeTeamCode(league, displayName)
    const normalizedNameKey = `${league}_${normalizedName}`
    if (TEAM_LOGOS[normalizedNameKey]) return TEAM_LOGOS[normalizedNameKey]
  }

  // 4. Default Guess Path (e.g. /logos/nba/lal.png)
  const guessPath = `/logos/${league.toLowerCase()}/${normalizedCode.toLowerCase()}.png`
  
  // If we still haven't found it, return the explicit fallback
  console.warn(`[logo-missing] No resolved logo for ${league} ${abbreviation} (${normalizedCode}). Falling back.`)
  return TEAM_LOGO_FALLBACK
}

/** 
 * Legacy wrapper for getTeamLogo 
 */
export function getTeamLogo(league: League, rawCode: string): string {
  return resolveTeamLogo({
    league,
    abbreviation: rawCode
  })
}
