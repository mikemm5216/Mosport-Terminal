import { NormalizedProviderGame } from "../providers/providerTypes";

export function normalizeProviderGame(raw: any): NormalizedProviderGame {
  return {
    matchId: raw.id || raw.matchId,
    league: raw.league,
    sport: raw.sport,
    startTime: raw.startTime,
    homeTeamId: raw.homeTeamId,
    awayTeamId: raw.awayTeamId,
    rawFeatures: raw.rawFeatures || raw.features || {},
  };
}
