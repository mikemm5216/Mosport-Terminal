import type {
  ValidationAction,
  ValidationDecision,
  ValidationInput,
  ValidationLabel,
  ValidationLabelStats,
  ValidationMatchResult,
  ValidationReport,
} from "./types";

type ActualWinner = "HOME" | "AWAY" | "DRAW";

const LABELS: ValidationLabel[] = ["STRONG", "UPSET", "CHAOS", "WEAK", "NONE"];

function roundMetric(value: number | null): number | null {
  if (value === null) return null;
  return Number(value.toFixed(4));
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

function getActualWinner(result: ValidationMatchResult): ActualWinner {
  if (result.homeScore > result.awayScore) return "HOME";
  if (result.awayScore > result.homeScore) return "AWAY";
  return "DRAW";
}

function getMarketFavorite(result: ValidationMatchResult): ActualWinner | "NONE" {
  if (result.marketHomeProb == null) return "NONE";
  if (result.marketHomeProb >= 0.55) return "HOME";
  if (result.marketHomeProb <= 0.45) return "AWAY";
  return "NONE";
}

function isActualUpset(result: ValidationMatchResult): boolean {
  const actualWinner = getActualWinner(result);
  const marketFavorite = getMarketFavorite(result);

  return actualWinner !== "DRAW" && marketFavorite !== "NONE" && actualWinner !== marketFavorite;
}

function judgeStrong(action: ValidationAction, actualWinner: ActualWinner): boolean {
  return (
    (action === "LEAN_HOME" && actualWinner === "HOME") ||
    (action === "LEAN_AWAY" && actualWinner === "AWAY")
  );
}

function judgeUpset(action: ValidationAction, result: ValidationMatchResult, actualWinner: ActualWinner): boolean | null {
  const marketFavorite = getMarketFavorite(result);
  if (marketFavorite === "NONE") return null;

  return action === "UPSET_WATCH" && actualWinner !== "DRAW" && actualWinner !== marketFavorite;
}

function initBreakdown(): Record<ValidationLabel, ValidationLabelStats> {
  return {
    STRONG: { count: 0, judgedCount: 0, correctCount: 0, accuracy: null, averageConfidence: null },
    UPSET: { count: 0, judgedCount: 0, correctCount: 0, accuracy: null, averageConfidence: null },
    CHAOS: { count: 0, judgedCount: 0, correctCount: 0, accuracy: null, averageConfidence: null },
    WEAK: { count: 0, judgedCount: 0, correctCount: 0, accuracy: null, averageConfidence: null },
    NONE: { count: 0, judgedCount: 0, correctCount: 0, accuracy: null, averageConfidence: null },
  };
}

export class ValidationAgent {
  run(input: ValidationInput): ValidationReport {
    const resultMap = new Map<string, ValidationMatchResult>(
      input.results.map((result) => [result.matchId, result]),
    );

    const labelBreakdown = initBreakdown();
    const confidenceByLabel = new Map<ValidationLabel, number[]>(LABELS.map((label) => [label, []]));
    const judgedConfidence: number[] = [];
    const calibrationErrors: number[] = [];
    const notes: string[] = [];

    let judgedSampleSize = 0;
    let correctJudged = 0;
    let strongJudged = 0;
    let strongCorrect = 0;
    let upsetJudged = 0;
    let upsetCorrect = 0;
    let chaosCount = 0;
    let weakOrNoneCount = 0;
    let marketJudgableMatches = 0;
    let actualUpsets = 0;

    for (const result of input.results) {
      if (getMarketFavorite(result) !== "NONE") {
        marketJudgableMatches += 1;
        if (isActualUpset(result)) actualUpsets += 1;
      }
    }

    for (const decision of input.decisions) {
      const breakdown = labelBreakdown[decision.label];
      breakdown.count += 1;
      confidenceByLabel.get(decision.label)?.push(decision.confidence);

      const result = resultMap.get(decision.matchId);
      if (!result) {
        notes.push(`Missing result for decision ${decision.matchId}.`);
        continue;
      }

      const actualWinner = getActualWinner(result);

      if (decision.label === "CHAOS") {
        chaosCount += 1;
        continue;
      }

      if (decision.label === "WEAK" || decision.label === "NONE") {
        weakOrNoneCount += 1;
        continue;
      }

      if (decision.label === "STRONG") {
        const correct = judgeStrong(decision.action, actualWinner);
        breakdown.judgedCount += 1;
        judgedSampleSize += 1;
        strongJudged += 1;
        judgedConfidence.push(decision.confidence);
        calibrationErrors.push(Math.abs(decision.confidence - (correct ? 1 : 0)));

        if (correct) {
          breakdown.correctCount += 1;
          correctJudged += 1;
          strongCorrect += 1;
        }
        continue;
      }

      if (decision.label === "UPSET") {
        const correct = judgeUpset(decision.action, result, actualWinner);
        if (correct === null) {
          notes.push(`UPSET decision ${decision.matchId} excluded due to missing or neutral market probability.`);
          continue;
        }

        breakdown.judgedCount += 1;
        judgedSampleSize += 1;
        upsetJudged += 1;
        judgedConfidence.push(decision.confidence);
        calibrationErrors.push(Math.abs(decision.confidence - (correct ? 1 : 0)));

        if (correct) {
          breakdown.correctCount += 1;
          correctJudged += 1;
          upsetCorrect += 1;
        }
      }
    }

    for (const label of LABELS) {
      const breakdown = labelBreakdown[label];
      breakdown.accuracy = roundMetric(ratio(breakdown.correctCount, breakdown.judgedCount));
      breakdown.averageConfidence = roundMetric(average(confidenceByLabel.get(label) ?? []));
    }

    return {
      agent: "ValidationAgent",
      sampleSize: input.decisions.length,
      judgedSampleSize,
      decisionCoverage: roundMetric(ratio(judgedSampleSize, input.decisions.length)),
      overallAccuracy: roundMetric(ratio(correctJudged, judgedSampleSize)),
      strongAccuracy: roundMetric(ratio(strongCorrect, strongJudged)),
      upsetAccuracy: roundMetric(ratio(upsetCorrect, upsetJudged)),
      upsetBaseRate: roundMetric(ratio(actualUpsets, marketJudgableMatches)),
      upsetLift: roundMetric(
        (() => {
          const accuracy = ratio(upsetCorrect, upsetJudged);
          const baseRate = ratio(actualUpsets, marketJudgableMatches);
          if (accuracy === null || baseRate === null || baseRate === 0) return null;
          return accuracy / baseRate;
        })(),
      ),
      chaosAvoidanceRate: roundMetric(ratio(chaosCount, input.decisions.length)),
      weakExclusionRate: roundMetric(ratio(weakOrNoneCount, input.decisions.length)),
      averageConfidence: roundMetric(average(judgedConfidence)),
      calibrationScore: roundMetric(
        calibrationErrors.length > 0 ? 1 - (average(calibrationErrors) ?? 1) : null,
      ),
      labelBreakdown,
      notes,
    };
  }
}
