import { WorldEngineState } from "../../../types/world";
import { CoachReadDTO } from "../../../types/coach";
import { CURRENT_ENGINE_VERSION } from "../../engine/engineAudit";

export function translateMLBWorldStateToCoachRead(worldState: WorldEngineState): CoachReadDTO {
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
    coachQuestion: "Should the bullpen be activated early?",
    coachDecision: "BULLPEN_TIMING",
    coachRead: "The third time through the order risk is high. Managing starter workload and bullpen freshness will be key.",
    emotionalHook: "Starter vs lineup matchup heavily influenced by park factors.",
    whyItMatters: [
      "Starter workload management",
      "Bullpen freshness after recent series",
      "Handedness split advantages in late innings"
    ],
    worldEngineEvidence: worldState.coachEvidence,
    opposingView: "Letting the starter go deep could save the bullpen for the series finale.",
    fanPrompt: "When would you pull the starter today?",
    confidenceLabel: "MEDIUM",
    debateIntensity: "ACTIVE",
    engineStatus: worldState.engineStatus,
    evidenceStatus: worldState.evidenceStatus,
    missingEvidence: worldState.missingEvidence,
    isProductionEngine: true,
    ...CURRENT_ENGINE_VERSION,
  };
}
