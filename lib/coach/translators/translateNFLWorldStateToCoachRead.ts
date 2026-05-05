import { WorldEngineState } from "../../../types/world";
import { CoachReadDTO } from "../../../types/coach";
import { CURRENT_ENGINE_VERSION } from "../../engine/engineAudit";

export function translateNFLWorldStateToCoachRead(worldState: WorldEngineState): CoachReadDTO {
  const isInsufficient = worldState.engineStatus === "INSUFFICIENT_DATA";

  return {
    matchId: worldState.matchId,
    league: "NFL",
    sport: "FOOTBALL",
    analysisPhase: "PREGAME_OPEN",
    generatedAt: worldState.generatedAt,
    generatedBeforeStart: true,
    isPregameOnly: true,
    homeTeam: { id: "HOME", name: "Home Team", shortName: "HOME", league: "NFL" },
    awayTeam: { id: "AWAY", name: "Away Team", shortName: "AWAY", league: "NFL" },
    gameStatus: { status: "pregame", display: "PREGAME" },
    coachQuestion: isInsufficient ? "Data insufficient for QB analysis." : "Should the game script be more aggressive early?",
    coachDecision: isInsufficient ? "EARLY_AGGRESSION" : "EARLY_AGGRESSION",
    coachRead: isInsufficient
      ? "QB context or offensive line health data is missing."
      : "QB stability and offensive line health allow for a more aggressive game script. Pass rush mismatch is the key risk.",
    emotionalHook: isInsufficient ? "Awaiting injury report updates." : "High-volatility matchup with red zone efficiency implications.",
    whyItMatters: isInsufficient ? [] : [
      "QB protection against pass rush",
      "Red zone efficiency edge",
      "Turnover volatility in recent games"
    ],
    worldEngineEvidence: worldState.coachEvidence,
    opposingView: "N/A",
    fanPrompt: "How would you call the first drive?",
    confidenceLabel: isInsufficient ? "LOW" : "MEDIUM",
    debateIntensity: "ACTIVE",
    engineStatus: worldState.engineStatus,
    evidenceStatus: worldState.evidenceStatus,
    missingEvidence: worldState.missingEvidence,
    isProductionEngine: true,
    ...CURRENT_ENGINE_VERSION,
  };
}
