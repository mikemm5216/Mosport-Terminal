import { NormalizedProviderGame } from "../../providers/providerTypes";
import { MLBPregameFeatures } from "../../../types/features";

/**
 * ⚾ [MLB EVIDENCE DETECTOR] ⚾
 * Current state: Skeleton detection for starters only.
 * NOT PRODUCTION READY for advanced feature extraction.
 */
export function buildMLBFeatures(game: NormalizedProviderGame): MLBPregameFeatures {
  const competitors = game.raw?.competitions?.[0]?.competitors || [];
  const homeCompetitor = competitors.find((c: any) => c.homeAway === "home");
  const awayCompetitor = competitors.find((c: any) => c.homeAway === "away");

  const homeStarter = homeCompetitor?.probables?.[0]?.athlete?.displayName;
  const awayStarter = awayCompetitor?.probables?.[0]?.athlete?.displayName;

  const missingEvidence: string[] = [];
  const sourceFieldsUsed: string[] = ["raw.competitions[0].competitors"];

  if (!homeStarter) missingEvidence.push("homeStarter");
  if (!awayStarter) missingEvidence.push("awayStarter");
  
  // Advanced metrics missing
  missingEvidence.push("bullpenFreshness", "lineupQuality", "parkFactor", "handednessSplit", "lateInningRisk");

  return {
    featureStatus: (homeStarter && awayStarter) ? "PARTIAL" : "MISSING",
    missingEvidence,
    sourceFieldsUsed,
    starterAdvantage: null, // Deterministic logic pending
    bullpenFreshness: null,
    lineupQuality: null,
    parkFactor: null,
    handednessSplitAdvantage: null,
    lateInningLeverageRisk: null,
    thirdTimeThroughOrderRisk: null,
    defensiveStability: null,
  };
}
