import { WorldEngineState } from "../../../types/world";
import { CoachReadDTO } from "../../../types/coach";
import { CURRENT_ENGINE_VERSION } from "../../engine/engineAudit";

export function translateNBAWorldStateToCoachRead(worldState: WorldEngineState): CoachReadDTO {
  return {
    matchId: worldState.matchId,
    league: "NBA",
    sport: "BASKETBALL",
    analysisPhase: "PREGAME_OPEN",
    generatedAt: worldState.generatedAt,
    generatedBeforeStart: true,
    isPregameOnly: true,
    homeTeam: { id: "HOME", name: "Home Team", shortName: "HOME", league: "NBA" },
    awayTeam: { id: "AWAY", name: "Away Team", shortName: "AWAY", league: "NBA" },
    gameStatus: { status: "pregame", display: "PREGAME" },
    coachQuestion: "Should the rotation be compressed early?",
    coachDecision: "ROTATION_COMPRESSION",
    coachRead: "Given the pace pressure and star load, we recommend a tighter rotation to maintain defensive stability.",
    emotionalHook: "High stakes matchup requires maximum bench unit stability.",
    whyItMatters: [
      "Pace pressure is high",
      "Star load management is critical in this stretch",
      "Bench unit stability could be the deciding factor"
    ],
    worldEngineEvidence: worldState.coachEvidence,
    opposingView: "A wider rotation might preserve energy for the fourth quarter.",
    fanPrompt: "Do you trust the bench unit in this matchup?",
    confidenceLabel: "MEDIUM",
    debateIntensity: "ACTIVE",
    engineStatus: worldState.engineStatus,
    evidenceStatus: worldState.evidenceStatus,
    missingEvidence: worldState.missingEvidence,
    isProductionEngine: true,
    ...CURRENT_ENGINE_VERSION,
  };
}
