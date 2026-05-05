import { WorldEngineState } from "../../../types/world";
import { CoachReadDTO } from "../../../types/coach";
import { CURRENT_ENGINE_VERSION } from "../../engine/engineAudit";

export function translateNHLWorldStateToCoachRead(worldState: WorldEngineState): CoachReadDTO {
  const isInsufficient = worldState.engineStatus === "INSUFFICIENT_DATA";

  return {
    matchId: worldState.matchId,
    league: "NHL",
    sport: "HOCKEY",
    analysisPhase: "PREGAME_OPEN",
    generatedAt: worldState.generatedAt,
    generatedBeforeStart: true,
    isPregameOnly: true,
    homeTeam: { id: worldState.homeTeam.id, name: worldState.homeTeam.name, shortName: worldState.homeTeam.shortName || worldState.homeTeam.id, league: "NHL" },
    awayTeam: { id: worldState.awayTeam.id, name: worldState.awayTeam.name, shortName: worldState.awayTeam.shortName || worldState.awayTeam.id, league: "NHL" },
    gameStatus: { status: "pregame", display: "PREGAME" },
    coachQuestion: isInsufficient ? "Data insufficient for goalie analysis." : "Should we prioritize special teams practice?",
    coachDecision: isInsufficient ? "EARLY_AGGRESSION" : "EARLY_AGGRESSION",
    coachRead: isInsufficient
      ? "Netminder status or pairing stability data is unavailable."
      : "Netminder advantage is significant. Focus on shot quality and defensive pair stability to counter back-to-back fatigue.",
    emotionalHook: isInsufficient ? "Awaiting lineup verification." : "Goalie duel expected in high-intensity matchup.",
    whyItMatters: isInsufficient ? [] : [
      "Special teams edge on power play",
      "Back-to-back fatigue levels",
      "Defensive pairing stability under pressure"
    ],
    worldEngineEvidence: worldState.coachEvidence,
    opposingView: "N/A",
    fanPrompt: "Who would you start in net today?",
    confidenceLabel: isInsufficient ? "LOW" : "MEDIUM",
    debateIntensity: "ACTIVE",
    engineStatus: worldState.engineStatus,
    evidenceStatus: worldState.evidenceStatus,
    missingEvidence: worldState.missingEvidence,
    isProductionEngine: true,
    ...CURRENT_ENGINE_VERSION,
  };
}

