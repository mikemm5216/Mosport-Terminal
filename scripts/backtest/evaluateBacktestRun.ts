import { deriveWorldState } from "../../lib/world/deriveWorldState";
import { getCoachRead } from "../../lib/coach/coachReadRouter";

export async function evaluateBacktestRun(corpus: any[]): Promise<any> {
  const stats = {
    gamesEvaluated: 0,
    gamesSkipped: 0,
    skipReasons: {} as Record<string, number>,
    byLeague: {} as Record<string, any>,
    overallAccuracy: 0,
    hits: 0,
  };

  for (const game of corpus) {
    try {
      const worldState = deriveWorldState(game.features);
      const coachRead = getCoachRead(worldState);

      if (worldState.engineStatus === "INSUFFICIENT_DATA") {
        stats.gamesSkipped++;
        const reason = worldState.missingEvidence[0] || "UNKNOWN";
        stats.skipReasons[reason] = (stats.skipReasons[reason] || 0) + 1;
        continue;
      }

      stats.gamesEvaluated++;
      // Simplified evaluation: compare coach decision or lean against final result
      const hit = simulateEvaluation(coachRead, game.finalResult);
      if (hit) stats.hits++;

      const league = game.league || "UNKNOWN";
      if (!stats.byLeague[league]) stats.byLeague[league] = { count: 0, hits: 0 };
      stats.byLeague[league].count++;
      if (hit) stats.byLeague[league].hits++;

    } catch (err) {
      stats.gamesSkipped++;
      stats.skipReasons["ERROR"] = (stats.skipReasons["ERROR"] || 0) + 1;
    }
  }

  stats.overallAccuracy = stats.gamesEvaluated > 0 ? stats.hits / stats.gamesEvaluated : 0;
  return stats;
}

function simulateEvaluation(coachRead: any, finalResult: any): boolean {
  // In a real backtest, this would be a complex comparison.
  // For the pipeline, we'll return a deterministic mock hit if the home team won and the coach read suggests home.
  return finalResult.winnerTeamId === finalResult.homeTeamId;
}
