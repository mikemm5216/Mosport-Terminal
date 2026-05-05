import { WorldEngineState } from "../../../types/world";
import { CoachReadDTO } from "../../../types/coach";
import { CURRENT_ENGINE_VERSION } from "../../engine/engineAudit";

export function translateNFLWorldStateToCoachRead(worldState: WorldEngineState): CoachReadDTO {
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
    coachQuestion: "Should the game script be more aggressive early?",
    coachDecision: "EARLY_AGGRESSION",
    coachRead: "QB stability and offensive line health allow for a more aggressive game script. Pass rush mismatch is the key risk.",
    emotionalHook: "High-volatility matchup with red zone efficiency implications.",
    whyItMatters: [
      "QB protection against pass rush",
      "Red zone efficiency edge",
      "Turnover volatility in recent games"
    ],
    worldEngineEvidence: worldState.coachEvidence,
    opposingView: "A conservative approach might limit turnover volatility.",
    fanPrompt: "Would you go for it on 4th down in the first half?",
    confidenceLabel: "MEDIUM",
    debateIntensity: "ACTIVE",
    engineStatus: worldState.engineStatus,
    evidenceStatus: worldState.evidenceStatus,
    missingEvidence: worldState.missingEvidence,
    isProductionEngine: true,
    ...CURRENT_ENGINE_VERSION,
  };
}
