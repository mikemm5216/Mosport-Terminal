import { WorldEngineState } from "../../../types/world";
import { CoachReadDTO } from "../../../types/coach";
import { CURRENT_ENGINE_VERSION } from "../../engine/engineAudit";

export function translateNHLWorldStateToCoachRead(worldState: WorldEngineState): CoachReadDTO {
  return {
    matchId: worldState.matchId,
    league: "NHL",
    sport: "HOCKEY",
    analysisPhase: "PREGAME_OPEN",
    generatedAt: worldState.generatedAt,
    generatedBeforeStart: true,
    isPregameOnly: true,
    homeTeam: { id: "HOME", name: "Home Team", shortName: "HOME", league: "NHL" },
    awayTeam: { id: "AWAY", name: "Away Team", shortName: "AWAY", league: "NHL" },
    gameStatus: { status: "pregame", display: "PREGAME" },
    coachQuestion: "Should we prioritize special teams practice?",
    coachDecision: "EARLY_AGGRESSION",
    coachRead: "Netminder advantage is significant. Focus on shot quality and defensive pair stability to counter back-to-back fatigue.",
    emotionalHook: "Goalie duel expected in high-intensity matchup.",
    whyItMatters: [
      "Special teams edge on power play",
      "Back-to-back fatigue levels",
      "Defensive pairing stability under pressure"
    ],
    worldEngineEvidence: worldState.coachEvidence,
    opposingView: "Playing a more defensive system might mitigate the fatigue factor.",
    fanPrompt: "Do you agree with the goalie choice today?",
    confidenceLabel: "MEDIUM",
    debateIntensity: "ACTIVE",
    engineStatus: worldState.engineStatus,
    evidenceStatus: worldState.evidenceStatus,
    missingEvidence: worldState.missingEvidence,
    isProductionEngine: true,
    ...CURRENT_ENGINE_VERSION,
  };
}
