import { DecisionPipelineAgent } from "../agents/decision-pipeline/DecisionPipelineAgent";
import type { DecisionPipelineInput } from "../agents/decision-pipeline/types";
import type { LeagueCode } from "../pipeline/types";
import type { BacktestReport, BacktestRow, HistoricalMatch } from "./types";

type Side = "HOME" | "AWAY" | "NONE";

export type SyntheticHistoricalMatch = HistoricalMatch & {
  signalSource: "synthetic_fixture";
  marketHomeProb: number;
  signals: NonNullable<HistoricalMatch["signals"]>;
  syntheticDecision: NonNullable<HistoricalMatch["syntheticDecision"]>;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, decimals = 4): number {
  return Number(value.toFixed(decimals));
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashUnit(input: string): number {
  return hashString(input) / 4294967295;
}

function getModelHomeProb(match: HistoricalMatch): number {
  const homeStrength = hashUnit(`${match.league}:${match.homeTeam}:home`);
  const awayStrength = hashUnit(`${match.league}:${match.awayTeam}:away`);
  const matchupNoise = hashUnit(`${match.matchId}:matchup`) - 0.5;
  const homeAdvantage = match.league === "MLB" ? 0.03 : 0.05;
  const edge = (homeStrength - awayStrength) * 0.85 + matchupNoise * 0.18 + homeAdvantage;
  return clamp(0.5 + edge, 0.18, 0.82);
}

function getMarketHomeProb(match: HistoricalMatch, modelHomeProb: number): number {
  const marketNoise = (hashUnit(`${match.matchId}:market`) - 0.5) * 0.18;
  return round(clamp(modelHomeProb * 0.8 + 0.1 + marketNoise, 0.18, 0.82));
}

function getFavorite(prob: number): Side {
  if (prob >= 0.55) return "HOME";
  if (prob <= 0.45) return "AWAY";
  return "NONE";
}

function buildSyntheticDecision(match: HistoricalMatch, marketHomeProb: number) {
  const modelHomeProb = getModelHomeProb(match);
  const marketFavorite = getFavorite(marketHomeProb);
  const modelFavorite = getFavorite(modelHomeProb);
  const modelEdge = Math.abs(modelHomeProb - 0.5);
  const disagreement = Math.abs(modelHomeProb - marketHomeProb);

  if (
    marketFavorite !== "NONE" &&
    modelFavorite !== "NONE" &&
    marketFavorite !== modelFavorite &&
    disagreement >= 0.12
  ) {
    const confidence = round(clamp(0.58 + disagreement * 0.9, 0.58, 0.76), 2);
    return {
      marketHomeProb,
      signals: [{ label: "synthetic_upset_edge", score: confidence }],
      syntheticDecision: {
        label: "UPSET" as const,
        action: "UPSET_WATCH" as const,
        confidence,
      },
    };
  }

  if (modelEdge >= 0.14) {
    const homeLean = modelHomeProb >= 0.5;
    const confidence = round(clamp(0.62 + modelEdge * 0.7, 0.62, 0.84), 2);
    return {
      marketHomeProb,
      signals: [{ label: homeLean ? "synthetic_home_edge" : "synthetic_away_edge", score: confidence }],
      syntheticDecision: {
        label: "STRONG" as const,
        action: homeLean ? "LEAN_HOME" as const : "LEAN_AWAY" as const,
        confidence,
      },
    };
  }

  const confidence = round(clamp(0.33 + disagreement * 0.2, 0.33, 0.45), 2);
  return {
    marketHomeProb,
    signals: [{ label: "synthetic_weak_signal", score: confidence }],
    syntheticDecision: {
      label: "WEAK" as const,
      action: "NO_ACTION" as const,
      confidence,
    },
  };
}

function getActualWinner(homeScore: number, awayScore: number): "HOME" | "AWAY" | "DRAW" {
  if (homeScore > awayScore) return "HOME";
  if (awayScore > homeScore) return "AWAY";
  return "DRAW";
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return round(numerator / denominator);
}

function sampleConfidenceLevel(n: number): BacktestReport["sampleConfidence"] {
  if (n >= 1000) return "strong";
  if (n >= 300) return "usable";
  if (n >= 100) return "directional";
  return "exploratory";
}

function isStrongCorrect(action: string, winner: "HOME" | "AWAY" | "DRAW"): boolean {
  return (
    (action === "LEAN_HOME" && winner === "HOME") ||
    (action === "LEAN_AWAY" && winner === "AWAY")
  );
}

function isUpsetCorrect(
  action: string,
  marketFavorite: Side,
  winner: "HOME" | "AWAY" | "DRAW",
): boolean | null {
  if (marketFavorite === "NONE") return null;
  return action === "UPSET_WATCH" && winner !== "DRAW" && winner !== marketFavorite;
}

function computeMetrics(
  rows: BacktestRow[],
  pickDecision: (row: BacktestRow) => { label: string; action: string },
  marketJudgable: number,
  actualUpsets: number,
  isActionable?: (row: BacktestRow) => boolean,
) {
  let judgedCount = 0;
  let correctCount = 0;
  let strongJudged = 0;
  let strongCorrect = 0;
  let upsetJudged = 0;
  let upsetCorrect = 0;

  for (const row of rows) {
    if (isActionable && !isActionable(row)) continue;

    const decision = pickDecision(row);
    const favorite = getFavorite(row.result.marketHomeProb ?? 0.5);

    if (decision.label === "STRONG") {
      const correct = isStrongCorrect(decision.action, row.result.actualWinner);
      judgedCount += 1;
      strongJudged += 1;
      if (correct) {
        correctCount += 1;
        strongCorrect += 1;
      }
      continue;
    }

    if (decision.label === "UPSET") {
      const correct = isUpsetCorrect(decision.action, favorite, row.result.actualWinner);
      if (correct !== null) {
        judgedCount += 1;
        upsetJudged += 1;
        if (correct) {
          correctCount += 1;
          upsetCorrect += 1;
        }
      }
    }
  }

  const upsetBaseRate = ratio(actualUpsets, marketJudgable);
  const upsetAccuracy = ratio(upsetCorrect, upsetJudged);
  const upsetLift =
    upsetAccuracy !== null && upsetBaseRate !== null && upsetBaseRate > 0
      ? round(upsetAccuracy / upsetBaseRate)
      : null;

  return {
    judgedCount,
    overallAccuracy: ratio(correctCount, judgedCount),
    strongAccuracy: ratio(strongCorrect, strongJudged),
    upsetAccuracy,
    decisionCoverage: ratio(judgedCount, rows.length),
    upsetBaseRate,
    upsetLift,
  };
}

function sortMatchesChronologically<T extends HistoricalMatch>(matches: T[]): T[] {
  return [...matches].sort((a, b) => {
    const startsAtDelta = new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    if (startsAtDelta !== 0) return startsAtDelta;
    const snapshotDelta = new Date(a.snapshotAt).getTime() - new Date(b.snapshotAt).getTime();
    if (snapshotDelta !== 0) return snapshotDelta;
    return a.matchId.localeCompare(b.matchId);
  });
}

function buildRollingValidationContext(
  priorRows: BacktestRow[],
): DecisionPipelineInput["validationContext"] {
  if (priorRows.length === 0) {
    return {
      overallAccuracy: null,
      upsetLift: null,
      decisionCoverage: null,
      calibrationScore: null,
    };
  }

  const marketJudgable = priorRows.filter((row) => getFavorite(row.result.marketHomeProb ?? 0.5) !== "NONE").length;
  const actualUpsets = priorRows.filter((row) => {
    const favorite = getFavorite(row.result.marketHomeProb ?? 0.5);
    return favorite !== "NONE" && row.result.actualWinner !== "DRAW" && row.result.actualWinner !== favorite;
  }).length;
  const live = computeMetrics(priorRows, (row) => row.liveDecision, marketJudgable, actualUpsets);

  return {
    overallAccuracy: live.overallAccuracy,
    upsetLift: live.upsetLift,
    decisionCoverage: live.decisionCoverage,
    calibrationScore: null,
  };
}

function buildProxyScores(
  match: SyntheticHistoricalMatch,
): { status: "live"; homeScore: number; awayScore: number } {
  const leagueStrongGap: Record<Exclude<HistoricalMatch["league"], "NHL">, number> = {
    NBA: 12,
    MLB: 3,
    EPL: 2,
    UCL: 2,
  };

  if (match.league === "NHL") {
    throw new Error("PregameSignalFixtureLayer does not support NHL in backtest v1.5.");
  }

  if (match.syntheticDecision.label === "STRONG") {
    if (match.syntheticDecision.confidence < 0.76) {
      if (match.syntheticDecision.action === "LEAN_HOME") {
        return match.league === "NBA"
          ? { status: "live", homeScore: 56, awayScore: 50 }
          : { status: "live", homeScore: 2, awayScore: 1 };
      }
      return match.league === "NBA"
        ? { status: "live", homeScore: 50, awayScore: 56 }
        : { status: "live", homeScore: 1, awayScore: 2 };
    }

    const gap = leagueStrongGap[match.league];
    if (match.syntheticDecision.action === "LEAN_HOME") {
      return match.league === "NBA"
        ? { status: "live", homeScore: 62, awayScore: 50 }
        : { status: "live", homeScore: gap + 1, awayScore: 0 };
    }
    return match.league === "NBA"
      ? { status: "live", homeScore: 50, awayScore: 62 }
      : { status: "live", homeScore: 0, awayScore: gap + 1 };
  }

  if (match.syntheticDecision.label === "UPSET") {
    const homeFav = (match.marketHomeProb ?? 0.5) >= 0.55;
    return homeFav
      ? { status: "live", homeScore: 0, awayScore: 1 }
      : { status: "live", homeScore: 1, awayScore: 0 };
  }

  return match.league === "NBA"
    ? { status: "live", homeScore: 54, awayScore: 50 }
    : { status: "live", homeScore: 1, awayScore: 0 };
}

export class PregameSignalFixtureLayer {
  enrich(matches: HistoricalMatch[]): SyntheticHistoricalMatch[] {
    return matches.map((match) => {
      const decision = buildSyntheticDecision(match, getMarketHomeProb(match, getModelHomeProb(match)));
      return {
        ...match,
        status: "scheduled",
        homeScore: null,
        awayScore: null,
        marketHomeProb: decision.marketHomeProb,
        signalSource: "synthetic_fixture",
        signals: decision.signals,
        syntheticDecision: decision.syntheticDecision,
      };
    });
  }
}

export function buildSyntheticSignalBacktest(
  matches: SyntheticHistoricalMatch[],
  options: {
    dataSource: BacktestReport["dataSource"];
    dateRange: BacktestReport["dateRange"];
  },
): { rows: BacktestRow[]; report: BacktestReport } {
  const orderedMatches = sortMatchesChronologically(matches);
  const baseRows: BacktestRow[] = orderedMatches.map((match) => ({
    matchId: match.matchId,
    league: match.league,
    liveDecision: {
      label: match.syntheticDecision.label,
      action: match.syntheticDecision.action,
      confidence: match.syntheticDecision.confidence,
    },
    pipelineDecision: {
      label: "NONE",
      action: "NO_ACTION",
      confidence: 0,
      finalConfidence: 0,
      decisionMode: "BENCH",
    },
    result: {
      actualWinner: getActualWinner(match.finalHomeScore, match.finalAwayScore),
      marketHomeProb: match.marketHomeProb,
    },
  }));

  let marketJudgable = 0;
  let actualUpsets = 0;
  for (const row of baseRows) {
    const favorite = getFavorite(row.result.marketHomeProb ?? 0.5);
    if (favorite !== "NONE") {
      marketJudgable += 1;
      if (row.result.actualWinner !== "DRAW" && row.result.actualWinner !== favorite) {
        actualUpsets += 1;
      }
    }
  }

  const live = computeMetrics(baseRows, (row) => row.liveDecision, marketJudgable, actualUpsets);
  const rows: BacktestRow[] = [];

  for (const match of orderedMatches) {
    const proxy = buildProxyScores(match);
    const validationContext = buildRollingValidationContext(rows);
    const pipeline = new DecisionPipelineAgent().run({
      match: {
        league: match.league as LeagueCode,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        status: proxy.status,
        homeScore: proxy.homeScore,
        awayScore: proxy.awayScore,
        startsAt: match.startsAt,
        marketHomeProb: match.marketHomeProb,
        signals: match.signals,
      },
      validationContext,
      simulationContext: {
        projectedChampion: null,
        matchupResults: [],
        titleDistribution: [],
      },
    });

    rows.push({
      matchId: match.matchId,
      league: match.league,
      liveDecision: {
        label: match.syntheticDecision.label,
        action: match.syntheticDecision.action,
        confidence: match.syntheticDecision.confidence,
      },
      pipelineDecision: {
        label: pipeline.decision.label,
        action: pipeline.decision.action,
        confidence: pipeline.decision.confidence,
        finalConfidence: pipeline.finalConfidence,
        decisionMode: pipeline.decisionMode,
      },
      result: {
        actualWinner: getActualWinner(match.finalHomeScore, match.finalAwayScore),
        marketHomeProb: match.marketHomeProb,
      },
    });
  }

  const pipeline = computeMetrics(
    rows,
    (row) => row.pipelineDecision,
    marketJudgable,
    actualUpsets,
    (row) =>
      row.pipelineDecision.decisionMode === "ATTACK" ||
      row.pipelineDecision.decisionMode === "ADJUST",
  );

  const byLeague: BacktestReport["byLeague"] = {};
  const labelBreakdown: BacktestReport["labelBreakdown"] = {
    STRONG: { count: 0, accuracy: null },
    UPSET: { count: 0, accuracy: null },
    CHAOS: { count: 0 },
    WEAK: { count: 0 },
    NONE: { count: 0 },
  };

  const perLeagueRows = new Map<string, BacktestRow[]>();
  for (const row of rows) {
    const label = row.liveDecision.label as keyof BacktestReport["labelBreakdown"];
    if (label in labelBreakdown) {
      if ("accuracy" in labelBreakdown[label]) {
        labelBreakdown[label].count += 1;
      } else {
        labelBreakdown[label].count += 1;
      }
    }

    const bucket = perLeagueRows.get(row.league) ?? [];
    bucket.push(row);
    perLeagueRows.set(row.league, bucket);
  }

  const strongRows = rows.filter((row) => row.liveDecision.label === "STRONG");
  labelBreakdown.STRONG.accuracy = ratio(
    strongRows.filter((row) => isStrongCorrect(row.liveDecision.action, row.result.actualWinner)).length,
    strongRows.length,
  );

  const upsetRows = rows.filter((row) => row.liveDecision.label === "UPSET");
  const upsetJudgedRows = upsetRows.filter(
    (row) => isUpsetCorrect(row.liveDecision.action, getFavorite(row.result.marketHomeProb ?? 0.5), row.result.actualWinner) !== null,
  );
  labelBreakdown.UPSET.accuracy = ratio(
    upsetJudgedRows.filter(
      (row) => isUpsetCorrect(row.liveDecision.action, getFavorite(row.result.marketHomeProb ?? 0.5), row.result.actualWinner) === true,
    ).length,
    upsetJudgedRows.length,
  );

  for (const [league, leagueRows] of perLeagueRows) {
    const leagueMarketJudgable = leagueRows.filter(
      (row) => getFavorite(row.result.marketHomeProb ?? 0.5) !== "NONE",
    ).length;
    const leagueActualUpsets = leagueRows.filter((row) => {
      const favorite = getFavorite(row.result.marketHomeProb ?? 0.5);
      return favorite !== "NONE" && row.result.actualWinner !== "DRAW" && row.result.actualWinner !== favorite;
    }).length;
    const leagueMetrics = computeMetrics(
      leagueRows,
      (row) => row.liveDecision,
      leagueMarketJudgable,
      leagueActualUpsets,
    );
    byLeague[league] = {
      sampleSize: leagueRows.length,
      overallAccuracy: leagueMetrics.overallAccuracy,
      upsetLift: leagueMetrics.upsetLift,
    };
  }

  const notes = [
    "SYNTHETIC_SIGNALS: used for structural decision-path testing only, not real performance proof.",
    "PIPELINE_CONTEXT_ROLLING: validationContext is recomputed from prior backtest matches only, with no fixed bootstrap.",
  ];

  return {
    rows,
    report: {
      sampleSize: rows.length,
      judgedSampleSize: live.judgedCount,
      dataSource: options.dataSource,
      dateRange: options.dateRange,
      sampleConfidence: sampleConfidenceLevel(rows.length),
      liveDecision: {
        overallAccuracy: live.overallAccuracy,
        strongAccuracy: live.strongAccuracy,
        upsetAccuracy: live.upsetAccuracy,
        decisionCoverage: live.decisionCoverage,
        upsetBaseRate: live.upsetBaseRate,
        upsetLift: live.upsetLift,
      },
      pipelineDecision: {
        overallAccuracy: pipeline.overallAccuracy,
        strongAccuracy: pipeline.strongAccuracy,
        upsetAccuracy: pipeline.upsetAccuracy,
        decisionCoverage: pipeline.decisionCoverage,
        upsetBaseRate: pipeline.upsetBaseRate,
        upsetLift: pipeline.upsetLift,
      },
      byLeague,
      labelBreakdown,
      notes,
    },
  };
}
