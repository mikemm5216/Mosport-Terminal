import { NormalizedProviderGame } from "../../types/provider";
import { NBAFeatures } from "../../../types/features";

export function buildNBAFeatures(game: NormalizedProviderGame): NBAFeatures {
  // Derive baseline features from ESPN scoreboard data
  // Even if incomplete, we avoid total pass-through
  
  const homeCompetitor = game.raw?.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === "home");
  const awayCompetitor = game.raw?.competitions?.[0]?.competitors?.find((c: any) => c.homeAway === "away");

  // Example: Basic rest days calculation (if we had previous game dates, but here we just stub)
  // In production, this would query the DB for the team's last match date
  
  return {
    pacePressure: null, // Requires tracking data
    rotationRisk: null, // Requires injury reports
    benchStability: null,
    starLoad: null,
    foulTroubleRisk: null,
    matchupMismatch: null,
  };
}
