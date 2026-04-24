import { getCanonicalTeamLogoKey, normalizeTeamCode } from '@/src/config/teamCodeNormalization'
import { TEAM_LOGOS } from '@/src/config/teamLogos'

export const TEAM_LOGO_FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">' +
      '<rect width="96" height="96" rx="14" fill="#0f172a"/>' +
      '<rect x="4" y="4" width="88" height="88" rx="10" fill="none" stroke="#334155"/>' +
      '<text x="48" y="56" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="18" text-anchor="middle">N/A</text>' +
    '</svg>',
  )

export function getTeamLogo(league: string, rawCode: string | null | undefined): string {
  const safeLeague = league?.trim().toUpperCase()
  const safeRawCode = rawCode?.trim()

  if (!safeLeague || !safeRawCode) {
    return TEAM_LOGO_FALLBACK
  }

  const canonicalKey = getCanonicalTeamLogoKey(safeLeague, safeRawCode)
  return TEAM_LOGOS[canonicalKey] ?? TEAM_LOGO_FALLBACK
}

export { normalizeTeamCode }
