import { CoachReadDTO, CoachDecisionType } from "../../types/coach";
import { WorldEngineState } from "../../types/world";
import { TeamRef } from "../../types/sports";
import { LiveStatus } from "../../types/gameStatus";

export function translateWorldStateToCoachRead(
  worldState: WorldEngineState,
  match: { id: string, league: string, sport: string, homeTeam: TeamRef, awayTeam: TeamRef, match_date: Date },
  status: LiveStatus
): CoachReadDTO {
  // This logic translates the World Engine's quantitative data into the qualitative Coach Read
  
  const coachQuestion = "How should the rotation be adjusted to handle the opponent's momentum?";
  const coachDecision: CoachDecisionType = (worldState.momentum ?? 0) > 60 ? "ROTATION_COMPRESSION" : "TRUST_BENCH";
  
  return {
    matchId: match.id,
    league: match.league,
    sport: match.sport,
    analysisPhase: "PREGAME_OPEN",
    generatedAt: new Date().toISOString(),
    generatedBeforeStart: true,
    isPregameOnly: true,
    
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    gameStatus: status,
    
    coachQuestion,
    coachDecision,
    coachRead: "The current data suggests a tightening of the rotation. The opponent is building significant momentum, and the bench unit is struggling to contain the mismatch in the paint.",
    emotionalHook: "Don't let the game slip away in the second quarter.",
    whyItMatters: [
      "Bench net rating is -12 in the last 3 games.",
      "Opponent paint points increase by 40% when the Defensive Anchor sits."
    ],
    worldEngineEvidence: [
      {
        label: "Momentum Stress",
        valueLabel: `${(worldState.momentum ?? 0).toFixed(1)}%`,
        severity: (worldState.momentum ?? 0) > 60 ? "HIGH" : "MEDIUM",
        explanation: "Opponent is on a scoring run and the defensive rhythm is broken.",
        source: "WORLD_ENGINE"
      }
    ],
    opposingView: "Some coaches would prefer to trust the depth and allow the bench to play through the slump to preserve energy for the fourth quarter.",
    fanPrompt: "Do you compress the rotation or trust your bench?",
    confidenceLabel: (worldState.momentum ?? 0) > 0.7 ? "HIGH" : "MEDIUM",
    debateIntensity: (worldState.momentum ?? 0) > 0.5 ? "HOT" : "ACTIVE",
    
    engineStatus: worldState.engineStatus,
    evidenceStatus: worldState.evidenceStatus,
    missingEvidence: worldState.missingEvidence?.map(e => e.toString()),
    noLeanReason: worldState.noLeanReason,
    isProductionEngine: false,
    engineVersion: "14.0.0",
    featureVersion: "14.0.0",
    translatorVersion: "1.0.0"
  };
}
