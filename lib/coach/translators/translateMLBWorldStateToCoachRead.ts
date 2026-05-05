import { WorldEngineState } from "../../../types/world";
import { CoachReadDTO } from "../../../types/coach";
import { CURRENT_ENGINE_VERSION } from "../../engine/engineAudit";

export function translateMLBWorldStateToCoachRead(worldState: WorldEngineState): CoachReadDTO {
  const isInsufficient = worldState.engineStatus === "INSUFFICIENT_DATA";

  return {
    matchId: worldState.matchId,
    league: "MLB",
    sport: "BASEBALL",
    analysisPhase: "PREGAME_OPEN",
    generatedAt: worldState.generatedAt,
    generatedBeforeStart: true,
    isPregameOnly: true,
    homeTeam: { id: "HOME", name: "Home Team", shortName: "HOME", league: "MLB" },
    awayTeam: { id: "AWAY", name: "Away Team", shortName: "AWAY", league: "MLB" },
    gameStatus: { status: "pregame", display: "PREGAME" },
    coachQuestion: isInsufficient ? "Data insufficient for full analysis." : "Should the bullpen be activated early?",
    coachDecision: isInsufficient ? "BULLPEN_TIMING" : "BULLPEN_TIMING",
    coachRead: isInsufficient 
      ? "Starting pitcher or recent form data is missing. Cannot derive third-time-through risk."
      : "The third time through the order risk is high. Managing starter workload and bullpen freshness will be key.",
    emotionalHook: isInsufficient ? "Awaiting starter confirmation." : "Starter vs lineup matchup heavily influenced by park factors.",
    whyItMatters: isInsufficient ? [] : [
      "Starter workload management",
      "Bullpen freshness after recent series",
      "Handedness split advantages in late innings"
    ],
    worldEngineEvidence: worldState.coachEvidence,
    opposingView: "N/A",
    fanPrompt: "Do you trust the starter today?",
    confidenceLabel: isInsufficient ? "LOW" : "MEDIUM",
    debateIntensity: "ACTIVE",
    engineStatus: worldState.engineStatus,
    evidenceStatus: worldState.evidenceStatus,
    missingEvidence: worldState.missingEvidence,
    isProductionEngine: true,
    ...CURRENT_ENGINE_VERSION,
  };
}
