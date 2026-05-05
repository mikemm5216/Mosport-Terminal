import { NormalizedProviderGame } from "../providers/providerTypes";
import { PregameFeatureSet } from "../../types/features";
import { buildNBAFeatures } from "./features/nbaBuilder";
import { buildMLBFeatures } from "./features/mlbBuilder";
import { buildNHLFeatures, buildNFLFeatures, buildEPLFeatures } from "./features/otherBuilders";

export function buildPregameFeatureSet(game: NormalizedProviderGame): PregameFeatureSet {
  const missing: string[] = [];
  const league = game.league.toUpperCase();
  
  const nba = league === "NBA" ? buildNBAFeatures(game) : undefined;
  const mlb = league === "MLB" ? buildMLBFeatures(game) : undefined;
  const nhl = league === "NHL" ? buildNHLFeatures(game) : undefined;
  const nfl = league === "NFL" ? buildNFLFeatures(game) : undefined;
  const epl = league === "EPL" ? buildEPLFeatures(game) : undefined;

  // Basic completeness check
  const teamContext = game.rawFeatures?.teamContext;
  if (!teamContext) missing.push("teamContext");
  
  return {
    matchId: game.matchId,
    league: game.league,
    sport: game.sport,
    homeTeamId: game.homeTeamId,
    awayTeamId: game.awayTeamId,
    homeTeamName: game.rawFeatures?.homeTeamName || "Home Team",
    awayTeamName: game.rawFeatures?.awayTeamName || "Away Team",
    startTime: game.startTime,
    status: "pregame",
    teamContext: teamContext || {
      home: { recentFormScore: 0.5, travelFatigue: 0.2 },
      away: { recentFormScore: 0.5, travelFatigue: 0.2 },
    },
    nba,
    mlb,
    nhl,
    nfl,
    epl,
    dataQuality: {
      completenessScore: missing.length === 0 ? 1.0 : 0.1,
      missing,
      provider: "SYSTEM",
      updatedAt: new Date().toISOString(),
    },
  };
}
