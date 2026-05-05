import { NormalizedProviderGame } from "../providers/providerTypes";
import { PregameFeatureSet } from "../../types/features";

export function buildPregameFeatureSet(game: NormalizedProviderGame): PregameFeatureSet {
  const missing: string[] = [];
  
  // Basic completeness check
  if (!game.rawFeatures.teamContext) missing.push("teamContext");
  
  return {
    matchId: game.matchId,
    league: game.league,
    sport: game.sport,
    homeTeamId: game.homeTeamId,
    awayTeamId: game.awayTeamId,
    startTime: game.startTime,
    status: "pregame",
    teamContext: game.rawFeatures.teamContext || {
      home: {},
      away: {},
    },
    nba: game.rawFeatures.nba,
    mlb: game.rawFeatures.mlb,
    nhl: game.rawFeatures.nhl,
    nfl: game.rawFeatures.nfl,
    epl: game.rawFeatures.epl,
    dataQuality: {
      completenessScore: missing.length === 0 ? 1.0 : 0.1,
      missing,
      provider: "SYSTEM",
      updatedAt: new Date().toISOString(),
    },
  };
}
