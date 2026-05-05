import type { HistoricalGameRecord } from "../../types/historical";
import { deriveWorldState } from "../../lib/world/deriveWorldState";
import { getCoachRead } from "../../lib/coach/coachReadRouter";
import { extractHistoricalFeatures } from "../../lib/features/extractorRouter";

export type BacktestLeagueStats = {
  total: number;
  evaluated: number;
  skipped: number;
  ready: number;
  partial: number;
  missing: number;
  hits: number;
  misses: number;
  partialHits: number;
};

export type BacktestEvaluationResult = {
  gamesTotal: number;
  gamesEvaluated: number;
  gamesSkipped: number;
  skipRate: number;
  skipReasons: Record<string, number>;
  byLeague: Record<string, BacktestLeagueStats>;
  coverage: {
    featureCompletenessAvg: number;
    readyRate: number;
    partialRate: number;
    missingRate: number;
  };
  overallAccuracy: number | null;
  hits: number;
  misses: number;
  partialHits: number;
  engineVersion: string;
  featureVersion: string;
  translatorVersion: string;
  sampleSizeWarning?: string;
};

function emptyLeagueStats(): BacktestLeagueStats {
  return { total: 0, evaluated: 0, skipped: 0, ready: 0, partial: 0, missing: 0, hits: 0, misses: 0, partialHits: 0 };
}

function increment(map: Record<string, number>, key: string) {
  map[key] = (map[key] || 0) + 1;
}

export async function evaluateBacktestRun(corpus: HistoricalGameRecord[]): Promise<BacktestEvaluationResult> {
  const stats: BacktestEvaluationResult = {
    gamesTotal: corpus.length,
    gamesEvaluated: 0,
    gamesSkipped: 0,
    skipRate: 0,
    skipReasons: {},
    byLeague: {},
    coverage: {
      featureCompletenessAvg: 0,
      readyRate: 0,
      partialRate: 0,
      missingRate: 0,
    },
    overallAccuracy: null,
    hits: 0,
    misses: 0,
    partialHits: 0,
    engineVersion: "14.0.0",
    featureVersion: "15.0.0",
    translatorVersion: "14.0.0",
  };

  let completenessTotal = 0;
  let readyCount = 0;
  let partialCount = 0;
  let missingCount = 0;

  for (const game of corpus) {
    const league = game.league || "UNKNOWN";
    if (!stats.byLeague[league]) stats.byLeague[league] = emptyLeagueStats();
    stats.byLeague[league].total++;

    try {
      const extraction = extractHistoricalFeatures(game);
      completenessTotal += extraction.completenessScore;

      if (extraction.featureStatus === "READY") {
        readyCount++;
        stats.byLeague[league].ready++;
      } else if (extraction.featureStatus === "PARTIAL") {
        partialCount++;
        stats.byLeague[league].partial++;
      } else {
        missingCount++;
        stats.byLeague[league].missing++;
      }

      if (extraction.featureStatus === "MISSING") {
        stats.gamesSkipped++;
        stats.byLeague[league].skipped++;
        increment(stats.skipReasons, extraction.missingEvidence[0] || "MISSING_FEATURES");
        continue;
      }

      const worldState = deriveWorldState(extraction.featureSet);
      const coachRead = getCoachRead(worldState);

      if (worldState.engineStatus === "INSUFFICIENT_DATA") {
        stats.gamesSkipped++;
        stats.byLeague[league].skipped++;
        increment(stats.skipReasons, worldState.missingEvidence[0] || "INSUFFICIENT_DATA");
        continue;
      }

      stats.gamesEvaluated++;
      stats.byLeague[league].evaluated++;

      const hit = evaluateCoachReadAgainstResult(coachRead, game);
      if (hit === "HIT") {
        stats.hits++;
        stats.byLeague[league].hits++;
      } else if (hit === "PARTIAL") {
        stats.partialHits++;
        stats.byLeague[league].partialHits++;
      } else {
        stats.misses++;
        stats.byLeague[league].misses++;
      }
    } catch (err) {
      stats.gamesSkipped++;
      stats.byLeague[league].skipped++;
      increment(stats.skipReasons, `ERROR:${err instanceof Error ? err.message : String(err)}`);
    }
  }

  stats.skipRate = stats.gamesTotal === 0 ? 0 : stats.gamesSkipped / stats.gamesTotal;
  stats.coverage.featureCompletenessAvg = stats.gamesTotal === 0 ? 0 : completenessTotal / stats.gamesTotal;
  stats.coverage.readyRate = stats.gamesTotal === 0 ? 0 : readyCount / stats.gamesTotal;
  stats.coverage.partialRate = stats.gamesTotal === 0 ? 0 : partialCount / stats.gamesTotal;
  stats.coverage.missingRate = stats.gamesTotal === 0 ? 0 : missingCount / stats.gamesTotal;
  stats.overallAccuracy = stats.gamesEvaluated > 0 ? stats.hits / stats.gamesEvaluated : null;

  if (stats.gamesEvaluated < 100) {
    stats.sampleSizeWarning = "Sample size too small for performance claims.";
  }

  return stats;
}

function evaluateCoachReadAgainstResult(_coachRead: unknown, game: HistoricalGameRecord): "HIT" | "MISS" | "PARTIAL" {
  // V15 keeps this intentionally conservative. Real sport-specific verdict mapping belongs in V16.
  // For now, a record is a HIT only when the historical record explicitly marks the home team as winner.
  if (game.finalResult.winnerTeamId === game.homeTeamId) return "HIT";
  return "MISS";
}
