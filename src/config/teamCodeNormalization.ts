export type TeamLogoLeague = "MLB" | "NBA" | "EPL" | "UCL" | "NHL";

const MLB_TEAM_CODE_NORMALIZATION: Record<string, string> = {
  ARI: "ARI",
  ATL: "ATL",
  BAL: "BAL",
  BOS: "BOS",
  CHC: "CHC",
  CHW: "CHW",
  CIN: "CIN",
  CLE: "CLE",
  COL: "COL",
  CWS: "CHW",
  DET: "DET",
  HOU: "HOU",
  KC: "KCR",
  KCR: "KCR",
  LAA: "LAA",
  LA: "LAD",
  LAD: "LAD",
  MIA: "MIA",
  MIL: "MIL",
  MIN: "MIN",
  NY: "NYY",
  NYM: "NYM",
  NYY: "NYY",
  OAK: "OAK",
  ATH: "ATH",
  PHI: "PHI",
  PIT: "PIT",
  SD: "SDP",
  SDP: "SDP",
  SEA: "SEA",
  SF: "SFG",
  SFG: "SFG",
  STL: "STL",
  TB: "TBR",
  TBR: "TBR",
  TEX: "TEX",
  TOR: "TOR",
  WAS: "WSH",
  WSH: "WSH",
};

const NBA_TEAM_CODE_NORMALIZATION: Record<string, string> = {
  ATL: "ATL",
  BOS: "BOS",
  BKN: "BKN",
  CHA: "CHA",
  CHI: "CHI",
  CLE: "CLE",
  DAL: "DAL",
  DEN: "DEN",
  DET: "DET",
  GS: "GSW",
  GSW: "GSW",
  HOU: "HOU",
  IND: "IND",
  LA: "LAL",
  LAC: "LAC",
  LAL: "LAL",
  MEM: "MEM",
  MIA: "MIA",
  MIL: "MIL",
  MIN: "MIN",
  NO: "NOP",
  NOP: "NOP",
  NY: "NYK",
  NYK: "NYK",
  OKC: "OKC",
  ORL: "ORL",
  PHI: "PHI",
  PHO: "PHX",
  PHX: "PHX",
  POR: "POR",
  SAC: "SAC",
  SA: "SAS",
  SAS: "SAS",
  TOR: "TOR",
  UTA: "UTA",
  UTAH: "UTA",
  WAS: "WAS",
  WSH: "WAS",
};

const TEAM_CODE_NORMALIZATION: Partial<Record<TeamLogoLeague, Record<string, string>>> = {
  MLB: MLB_TEAM_CODE_NORMALIZATION,
  NBA: NBA_TEAM_CODE_NORMALIZATION,
};

function cleanRawCode(rawCode: string): string {
  const cleaned = rawCode.trim().toUpperCase();

  if (cleaned.includes("_")) {
    const parts = cleaned.split("_").filter(Boolean);
    return parts[parts.length - 1] ?? cleaned;
  }

  return cleaned;
}

export function normalizeTeamCode(league: string, rawCode: string): string {
  const normalizedLeague = league.trim().toUpperCase() as TeamLogoLeague;
  const cleanedCode = cleanRawCode(rawCode);
  const leagueMap = TEAM_CODE_NORMALIZATION[normalizedLeague];

  return leagueMap?.[cleanedCode] ?? cleanedCode;
}

export function getCanonicalTeamLogoKey(league: string, rawCode: string): string {
  const normalizedLeague = league.trim().toUpperCase();
  const normalizedCode = normalizeTeamCode(normalizedLeague, rawCode);

  return `${normalizedLeague}_${normalizedCode}`;
}

export const TEAM_CODE_NORMALIZATION_MAP = TEAM_CODE_NORMALIZATION;
