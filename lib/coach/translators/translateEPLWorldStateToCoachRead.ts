import { WorldEngineState } from "../../../types/world";
import { CoachReadDTO } from "../../../types/coach";
import { CURRENT_ENGINE_VERSION } from "../../engine/engineAudit";

export function translateEPLWorldStateToCoachRead(worldState: WorldEngineState): CoachReadDTO {
  return {
    matchId: worldState.matchId,
    league: "EPL",
    sport: "SOCCER",
    analysisPhase: "PREGAME_OPEN",
    generatedAt: worldState.generatedAt,
    generatedBeforeStart: true,
    isPregameOnly: true,
    homeTeam: { id: "HOME", name: "Home Team", shortName: "HOME", league: "EPL" },
    awayTeam: { id: "AWAY", name: "Away Team", shortName: "AWAY", league: "EPL" },
    gameStatus: { status: "pregame", display: "PREGAME" },
    coachQuestion: "Should the team press high from the start?",
    coachDecision: "PRESS_HIGH",
    coachRead: "Fixture congestion is high. Press resistance and midfield control will be critical to manage defensive line risk.",
    emotionalHook: "Tactical battle in midfield likely to decide the fixture.",
    whyItMatters: [
      "Midfield control against high press",
      "Set piece risk management",
      "Defensive line positioning against wide threats"
    ],
    worldEngineEvidence: worldState.coachEvidence,
    opposingView: "Sitting deeper could mitigate fixture congestion fatigue.",
    fanPrompt: "Would you start the main striker given the congestion?",
    confidenceLabel: "MEDIUM",
    debateIntensity: "ACTIVE",
    engineStatus: worldState.engineStatus,
    evidenceStatus: worldState.evidenceStatus,
    missingEvidence: worldState.missingEvidence,
    isProductionEngine: true,
    ...CURRENT_ENGINE_VERSION,
  };
}
