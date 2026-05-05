import { WorldEngineState } from "../../../types/world";
import { CoachReadDTO } from "../../../types/coach";
import { CURRENT_ENGINE_VERSION } from "../../engine/engineAudit";

export function translateEPLWorldStateToCoachRead(worldState: WorldEngineState): CoachReadDTO {
  const isInsufficient = worldState.engineStatus === "INSUFFICIENT_DATA";

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
    coachQuestion: isInsufficient ? "Data insufficient for tactical analysis." : "Should the team press high from the start?",
    coachDecision: isInsufficient ? "PRESS_HIGH" : "PRESS_HIGH",
    coachRead: isInsufficient
      ? "Fixture congestion or midfield control data is unavailable."
      : "Fixture congestion is high. Press resistance and midfield control will be critical to manage defensive line risk.",
    emotionalHook: isInsufficient ? "Awaiting lineup verification." : "Tactical battle in midfield likely to decide the fixture.",
    whyItMatters: isInsufficient ? [] : [
      "Midfield control against high press",
      "Set piece risk management",
      "Defensive line positioning against wide threats"
    ],
    worldEngineEvidence: worldState.coachEvidence,
    opposingView: "N/A",
    fanPrompt: "Would you change the starting XI?",
    confidenceLabel: isInsufficient ? "LOW" : "MEDIUM",
    debateIntensity: "ACTIVE",
    engineStatus: worldState.engineStatus,
    evidenceStatus: worldState.evidenceStatus,
    missingEvidence: worldState.missingEvidence,
    isProductionEngine: true,
    ...CURRENT_ENGINE_VERSION,
  };
}
