import type { HistoricalGameRecord, SupportedHistoricalLeague } from "../../types/historical";

const SUPPORTED = new Set(["NBA", "MLB", "NHL", "NFL", "EPL"]);

export function normalizeHistoricalRecord(raw: any, row: number, sourceFile: string): HistoricalGameRecord {
  const league = String(raw.league || "").toUpperCase() as SupportedHistoricalLeague;
  if (!SUPPORTED.has(league)) {
    throw new Error(`UNSUPPORTED_LEAGUE:${raw.league || "missing"}`);
  }

  return {
    matchId: String(raw.matchId || ""),
    league,
    sport: String(raw.sport || ""),
    season: raw.season,
    startTime: String(raw.startTime || ""),
    homeTeamId: String(raw.homeTeamId || raw.pregameSnapshot?.features?.homeTeamId || ""),
    awayTeamId: String(raw.awayTeamId || raw.pregameSnapshot?.features?.awayTeamId || ""),
    homeTeamName: raw.homeTeamName || raw.pregameSnapshot?.features?.homeTeamName,
    awayTeamName: raw.awayTeamName || raw.pregameSnapshot?.features?.awayTeamName,
    pregameSnapshot: {
      provider: String(raw.pregameSnapshot?.provider || "UNKNOWN"),
      collectedAt: String(raw.pregameSnapshot?.collectedAt || raw.startTime || ""),
      features: raw.pregameSnapshot?.features,
    },
    finalResult: {
      homeScore: Number(raw.finalResult?.homeScore),
      awayScore: Number(raw.finalResult?.awayScore),
      winnerTeamId: String(raw.finalResult?.winnerTeamId || ""),
      completedAt: raw.finalResult?.completedAt,
    },
    metadata: {
      ...(raw.metadata || {}),
      sourceFile,
      sourceRow: row,
    },
  };
}
