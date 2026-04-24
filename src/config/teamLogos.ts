import { getCanonicalTeamLogoKey, normalizeTeamCode } from "./teamCodeNormalization";

export const TEAM_LOGO_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">' +
      '<rect width="96" height="96" rx="14" fill="#0f172a"/>' +
      '<rect x="4" y="4" width="88" height="88" rx="10" fill="none" stroke="#334155"/>' +
      '<text x="48" y="56" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="18" text-anchor="middle">N/A</text>' +
    "</svg>",
  );

export const TEAM_LOGOS: Record<string, string> = {
  MLB_ARI: "/logos/mlb/ari.png",
  MLB_ATH: "/logos/mlb/ath.png",
  MLB_ATL: "/logos/mlb/atl.png",
  MLB_BAL: "/logos/mlb/bal.png",
  MLB_BOS: "/logos/mlb/bos.png",
  MLB_CHC: "/logos/mlb/chc.png",
  MLB_CHW: "/logos/mlb/chw.png",
  MLB_CIN: "/logos/mlb/cin.png",
  MLB_CLE: "/logos/mlb/cle.png",
  MLB_COL: "/logos/mlb/col.png",
  MLB_DET: "/logos/mlb/det.png",
  MLB_HOU: "/logos/mlb/hou.png",
  MLB_KCR: "/logos/mlb/kc.png",
  MLB_LAA: "/logos/mlb/laa.png",
  MLB_LAD: "/logos/mlb/lad.png",
  MLB_MIA: "/logos/mlb/mia.png",
  MLB_MIL: "/logos/mlb/mil.png",
  MLB_MIN: "/logos/mlb/min.png",
  MLB_NYM: "/logos/mlb/nym.png",
  MLB_NYY: "/logos/mlb/nyy.png",
  MLB_OAK: "/logos/mlb/oak.png",
  MLB_PHI: "/logos/mlb/phi.png",
  MLB_PIT: "/logos/mlb/pit.png",
  MLB_SDP: "/logos/mlb/sd.png",
  MLB_SEA: "/logos/mlb/sea.png",
  MLB_SFG: "/logos/mlb/sf.png",
  MLB_STL: "/logos/mlb/stl.png",
  MLB_TBR: "/logos/mlb/tb.png",
  MLB_TEX: "/logos/mlb/tex.png",
  MLB_TOR: "/logos/mlb/tor.png",
  MLB_WSH: "/logos/mlb/wsh.png",

  NBA_ATL: "/logos/nba/atl.png",
  NBA_BKN: "/logos/nba/bkn.png",
  NBA_BOS: "/logos/nba/bos.png",
  NBA_CHA: "/logos/nba/cha.png",
  NBA_CHI: "/logos/nba/chi.png",
  NBA_CLE: "/logos/nba/cle.png",
  NBA_DAL: "/logos/nba/dal.png",
  NBA_DEN: "/logos/nba/den.png",
  NBA_DET: "/logos/nba/det.png",
  NBA_GSW: "/logos/nba/gsw.png",
  NBA_HOU: "/logos/nba/hou.png",
  NBA_IND: "/logos/nba/ind.png",
  NBA_LAC: "/logos/nba/lac.png",
  NBA_LAL: "/logos/nba/lal.png",
  NBA_MEM: "/logos/nba/mem.png",
  NBA_MIA: "/logos/nba/mia.png",
  NBA_MIL: "/logos/nba/mil.png",
  NBA_MIN: "/logos/nba/min.png",
  NBA_NOP: "/logos/nba/nop.png",
  NBA_NYK: "/logos/nba/nyk.png",
  NBA_OKC: "/logos/nba/okc.png",
  NBA_ORL: "/logos/nba/orl.png",
  NBA_PHI: "/logos/nba/phi.png",
  NBA_PHX: "/logos/nba/phx.png",
  NBA_POR: "/logos/nba/por.png",
  NBA_SAC: "/logos/nba/sac.png",
  NBA_SAS: "/logos/nba/sas.png",
  NBA_TOR: "/logos/nba/tor.png",
  NBA_UTA: "/logos/nba/uta.png",
  NBA_WAS: "/logos/nba/was.png",

  EPL_ARS: "/logos/epl/ars.png",
  EPL_AVL: "/logos/epl/avl.png",
  EPL_BHA: "/logos/epl/bha.png",
  EPL_BOU: "/logos/epl/bou.png",
  EPL_BRE: "/logos/epl/bre.png",
  EPL_BUR: "/logos/epl/bur.png",
  EPL_CHE: "/logos/epl/che.png",
  EPL_CRY: "/logos/epl/cry.png",
  EPL_EVE: "/logos/epl/eve.png",
  EPL_FUL: "/logos/epl/ful.png",
  EPL_IPS: "/logos/epl/ips.png",
  EPL_LEE: "/logos/epl/lee.png",
  EPL_LEI: "/logos/epl/lei.png",
  EPL_LIV: "/logos/epl/liv.png",
  EPL_MCI: "/logos/epl/mci.png",
  EPL_MUN: "/logos/epl/mun.png",
  EPL_NEW: "/logos/epl/new.png",
  EPL_NFO: "/logos/epl/nfo.png",
  EPL_SOU: "/logos/epl/sou.png",
  EPL_TOT: "/logos/epl/tot.png",
  EPL_WHU: "/logos/epl/whu.png",
  EPL_WOL: "/logos/epl/wol.png",
};

export function getTeamLogo(league: string, rawCode: string | null | undefined): string {
  const safeLeague = league?.trim().toUpperCase();
  const safeRawCode = rawCode?.trim();

  if (!safeLeague || !safeRawCode) {
    const normalizedCode = safeRawCode ? normalizeTeamCode(safeLeague ?? "UNKNOWN", safeRawCode) : "";
    const canonicalKey = safeLeague && safeRawCode ? getCanonicalTeamLogoKey(safeLeague, safeRawCode) : "";
    console.warn("[logo-missing]", {
      league: safeLeague ?? league ?? "",
      rawCode: safeRawCode ?? rawCode ?? "",
      normalizedCode,
      canonicalKey,
    });
    return TEAM_LOGO_FALLBACK;
  }

  const normalizedCode = normalizeTeamCode(safeLeague, safeRawCode);
  const canonicalKey = getCanonicalTeamLogoKey(safeLeague, safeRawCode);
  const logoPath = TEAM_LOGOS[canonicalKey];

  if (logoPath) {
    return logoPath;
  }

  console.warn("[logo-missing]", { league: safeLeague, rawCode: safeRawCode, normalizedCode, canonicalKey });
  return TEAM_LOGO_FALLBACK;
}

export { getCanonicalTeamLogoKey, normalizeTeamCode };
