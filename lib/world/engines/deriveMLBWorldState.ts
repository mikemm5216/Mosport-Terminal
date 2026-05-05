import { PregameFeatureSet } from "../../../types/features";
import { WorldEngineState } from "../../../types/world";
import { buildInsufficientDataWorldState } from "../../engine/engineStatus";

export function deriveMLBWorldState(features: PregameFeatureSet): WorldEngineState {
  const missing: string[] = [];
  const { mlb, teamContext } = features;

  if (mlb?.starterAdvantage == null) missing.push("MISSING_STARTING_PITCHER");
  if (teamContext.home.recentFormScore == null) missing.push("MISSING_RECENT_FORM");
  
  if (missing.length > 0 && missing.includes("MISSING_RECENT_FORM")) {
    return buildInsufficientDataWorldState(features, missing as any);
  }

  const isPartial = mlb?.starterAdvantage == null || mlb?.bullpenFreshness == null || mlb?.lineupQuality == null;

  return {
    matchId: features.matchId,
    league: "MLB",
    sport: "BASEBALL",
    engineStatus: isPartial ? "PARTIAL" : "READY",
    evidenceStatus: isPartial ? "PARTIAL" : "VALIDATED",
    missingEvidence: isPartial ? ["MISSING_ADVANCED_METRICS"] : [],
    homeTeam: { id: features.homeTeamId, name: features.homeTeamName },
    awayTeam: { id: features.awayTeamId, name: features.awayTeamName },
    pressure: mlb?.lateInningLeverageRisk ?? null,
    fatigue: mlb?.bullpenFreshness ?? null,
    volatility: mlb?.thirdTimeThroughOrderRisk ?? null,
    momentum: teamContext.home.recentFormScore ?? null,
    mismatch: mlb?.starterAdvantage ?? null,
    sportSpecific: {
      parkFactor: mlb?.parkFactor ?? null,
      handednessSplit: mlb?.handednessSplitAdvantage ?? null,
      lineupQuality: mlb?.lineupQuality ?? null,
      defensiveStability: mlb?.defensiveStability ?? null,
    },
    coachEvidence: [
      {
        label: "Starter Advantage",
        valueLabel: mlb?.starterAdvantage != null && mlb.starterAdvantage > 0.6 ? "STRONG" : (mlb?.starterAdvantage != null ? "NEUTRAL" : "UNKNOWN"),
        severity: "MEDIUM",
        explanation: mlb?.starterAdvantage != null ? "Evaluating starter vs opponent lineup and park factors." : "Starter metrics unavailable.",
        source: "WORLD_ENGINE",
      }
    ],
    generatedAt: new Date().toISOString(),
  };
}
