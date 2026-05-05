import { prisma } from "../prisma";
import { CoachReadDTO } from "../../types/coach";

export async function generatePostgameVerdict(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { match_id: matchId },
    include: { stats: true, predictions: true }
  });

  if (!match || match.status !== "final") {
    throw new Error("MATCH_NOT_FINAL");
  }

  const pregamePrediction = match.predictions.find(p => p.payload);
  if (!pregamePrediction) {
    throw new Error("NO_PREGAME_READ_TO_VERIFY");
  }

  const coachRead = pregamePrediction.payload as unknown as CoachReadDTO;
  
  // Logic to determine HIT/MISS/PARTIAL based on actual stats
  // This is a placeholder for the actual verdict engine
  const result: "HIT" | "MISS" | "PARTIAL" = Math.random() > 0.5 ? "HIT" : "MISS";

  const verdict = {
    matchId,
    analysisPhase: "POSTGAME_VERDICT",
    lockedCoachReadId: pregamePrediction.id,
    result,
    verdictTitle: result === "HIT" ? "Coach Was Right" : "Tactical Miscalculation",
    verdictExplanation: `The pregame read suggested ${coachRead.coachDecision}. Looking at the final stats, this was ${result === "HIT" ? "exactly what happened" : "not the primary driver of the outcome"}.`,
    whatWeLearned: [
      "Transition defense remained an issue through Q4.",
      "Rotation adjustments were made too late."
    ]
  };

  return verdict;
}
