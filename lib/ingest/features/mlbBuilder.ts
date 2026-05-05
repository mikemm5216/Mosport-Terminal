import { NormalizedProviderGame } from "../../types/provider";
import { MLBFeatures } from "../../../types/features";

export function buildMLBFeatures(game: NormalizedProviderGame): MLBFeatures {
  const competitors = game.raw?.competitions?.[0]?.competitors || [];
  const homeCompetitor = competitors.find((c: any) => c.homeAway === "home");
  const awayCompetitor = competitors.find((c: any) => c.homeAway === "away");

  // ESPN Scoreboard often has probables in competitors[i].probables
  const homeStarter = homeCompetitor?.probables?.[0]?.athlete?.displayName;
  const awayStarter = awayCompetitor?.probables?.[0]?.athlete?.displayName;

  return {
    starterAdvantage: homeStarter && awayStarter ? 0.0 : null, // Placeholder for comparison logic
    bullpenFreshness: null,
    lineupQuality: null,
    parkFactor: null,
    handednessSplitAdvantage: null,
    lateInningLeverageRisk: null,
    thirdTimeThroughOrderRisk: null,
    defensiveStability: null,
  };
}
