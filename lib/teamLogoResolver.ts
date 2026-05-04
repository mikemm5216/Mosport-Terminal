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

const LOGO_ALIASES: Record<string, Record<string, string>> = {
  EPL: {
    MAN: 'MCI',
    MUN: 'MUN',
    MCI: 'MCI',
    BOU: 'BOU',
  },
}

export function getTeamLogo(league: string, rawCode: string | null | undefined): string {
  const safeLeague = league?.trim().toUpperCase() || ''
  const safeRawCode = rawCode?.trim().toUpperCase() || ''

  if (!safeLeague || !safeRawCode) {
    console.warn('[logo-missing]', {
      league: safeLeague || league || '',
      rawCode: safeRawCode || rawCode || '',
      normalizedCode: '',
      canonicalKey: '',
      expectedPath: TEAM_LOGO_FALLBACK,
    })
    return TEAM_LOGO_FALLBACK
  }

  const aliasesForLeague = LOGO_ALIASES[safeLeague]
  let finalCode = safeRawCode

  if (aliasesForLeague && Object.prototype.hasOwnProperty.call(aliasesForLeague, safeRawCode)) {
    const alias = aliasesForLeague[safeRawCode]
    if (alias) {
      if (safeRawCode === 'MAN') {
        console.warn('[logo-alias] alias_ambiguous: MAN mapping to MCI for EPL')
      }
      finalCode = alias
    }
  }

  const normalizedCode = normalizeTeamCode(safeLeague, finalCode)
  const canonicalKey = getCanonicalTeamLogoKey(safeLeague, finalCode)
  const resolvedPath = TEAM_LOGOS[canonicalKey] ?? TEAM_LOGO_FALLBACK

  if (process.env.NODE_ENV !== 'production') {
    console.warn('[logo-resolve]', {
      league: safeLeague,
      rawCode: safeRawCode,
      normalizedCode,
      canonicalKey,
      resolvedPath,
      found: resolvedPath !== TEAM_LOGO_FALLBACK,
    })
  }

  if (resolvedPath === TEAM_LOGO_FALLBACK) {
    console.warn('[logo-missing]', {
      league: safeLeague,
      rawCode: safeRawCode,
      normalizedCode,
      canonicalKey,
      expectedPath: `/logos/${safeLeague.toLowerCase()}/${normalizedCode.toLowerCase()}.png`,
    })
  }

  return resolvedPath
}

export { normalizeTeamCode }
