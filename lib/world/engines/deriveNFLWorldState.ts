import { PregameFeatureSet } from "../../../types/features";
import { WorldEngineState } from "../../../types/world";
import { buildInsufficientDataWorldState } from "../../engine/engineStatus";

export function deriveNFLWorldState(features: PregameFeatureSet): WorldEngineState {
  const missing: string[] = [];
  const { nfl, teamContext } = features;

  if (!nfl) missing.push("MISSING_QB_CONTEXT");
  if (teamContext.home.recentFormScore === undefined) missing.push("MISSING_RECENT_FORM");
  
  if (missing.length > 0) {
    return buildInsufficientDataWorldState(features, missing as any);
  }

  const isPartial = !nfl?.qbStability || !nfl?.gameScriptPressure;

  return {
    matchId: features.matchId,
    league: "NFL",
    sport: "FOOTBALL",
    engineStatus: isPartial ? "PARTIAL" : "READY",
    evidenceStatus: isPartial ? "PARTIAL" : "VALIDATED",
    missingEvidence: isPartial ? ["MISSING_ADVANCED_METRICS"] : [],
    pressure: nfl?.gameScriptPressure ?? null,
    fatigue: teamContext.home.travelFatigue ?? null,
    volatility: nfl?.turnoverVolatility ?? null,
    momentum: teamContext.home.recentFormScore ?? null,
    mismatch: nfl?.qbStability ?? null,
    sportSpecific: {
      passRushMismatch: nfl?.passRushMismatch ?? null,
      offensiveLineHealth: nfl?.offensiveLineHealth ?? null,
      redZoneEdge: nfl?.redZoneEdge ?? null,
    },
    coachEvidence: [
      {
        label: "QB Stability",
        valueLabel: nfl?.qbStability && nfl.qbStability > 0.7 ? "STABLE" : (nfl?.qbStability ? "RISKY" : "UNKNOWN"),
        severity: "MEDIUM",
        explanation: nfl?.qbStability ? "Evaluating quarterback health and offensive line protection." : "QB metrics unavailable.",
        source: "WORLD_ENGINE",
      }
    ],
    generatedAt: new Date().toISOString(),
  };
}
