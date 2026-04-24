import { LiveDecisionAgent } from "../agents/live-decision/LiveDecisionAgent";
import { DecisionPipelineAgent } from "../agents/decision-pipeline/DecisionPipelineAgent";
import type { LiveDecisionAgentInput } from "../agents/live-decision/types";
import type { MatchStatus } from "../pipeline/types";
import type { DecisionPipelineInput } from "../agents/decision-pipeline/types";
import type { BacktestReport, BacktestRow, HistoricalMatch } from "./types";

export type BacktestOptions = {
  validationContext?: DecisionPipelineInput["validationContext"];
};

type DataProvenance = {
  dataSource: "db" | "espn" | "fixture";
  dateRange?: { startDate: string; endDate: string };
};

type ActualWinner = "HOME" | "AWAY" | "DRAW";
type MarketSide = "HOME" | "AWAY" | "NONE";

// HistoricalMatch.status includes "pre"/"final"; map to agent MatchStatus.
// "pre" = pre-game snapshot → "scheduled" (game not yet started)
// "final" = completed game → "closed"
function mapStatus(s: HistoricalMatch["status"]): MatchStatus {
  if (s === "pre") return "scheduled";
  if (s === "final") return "closed";
  return s as MatchStatus;
}

function getActualWinner(homeScore: number, awayScore: number): ActualWinner {
  if (homeScore > awayScore) return "HOME";
  if (awayScore > homeScore) return "AWAY";
  return "DRAW";
}

function getMarketFavorite(marketHomeProb?: number | null): MarketSide {
  if (marketHomeProb == null) return "NONE";
  if (marketHomeProb >= 0.55) return "HOME";
  if (marketHomeProb <= 0.45) return "AWAY";
  return "NONE";
}

function isStrongCorrect(action: string, winner: ActualWinner): boolean {
  return (
    (action === "LEAN_HOME" && winner === "HOME") ||
    (action === "LEAN_AWAY" && winner === "AWAY")
  );
}

// Returns null when the match is not market-judgable (exclude from upset accuracy).
function isUpsetCorrect(
  action: string,
  marketFavorite: MarketSide,
  winner: ActualWinner,
): boolean | null {
  if (marketFavorite === "NONE") return null;
  return (
    action === "UPSET_WATCH" && winner !== "DRAW" && winner !== marketFavorite
  );
}

function ratio(n: number, d: number): number | null {
  if (d === 0) return null;
  return Number((n / d).toFixed(4));
}

type AgentDecision = { label: string; action: string };

type AgentMetricsResult = {
  judgedCount: number;
  overallAccuracy: number | null;
  strongAccuracy: number | null;
  upsetAccuracy: number | null;
  decisionCoverage: number | null;
  upsetBaseRate: number | null;
  upsetLift: number | null;
};

function computeAgentMetrics(
  rows: BacktestRow[],
  getDecision: (row: BacktestRow) => AgentDecision,
  marketJudgable: number,
  actualUpsets: number,
  isActionable?: (row: BacktestRow) => boolean,
): AgentMetricsResult {
  let judgedCount = 0;
  let correctCount = 0;
  let strongJudged = 0;
  let strongCorrect = 0;
  let upsetJudged = 0;
  let upsetCorrect = 0;

  for (const row of rows) {
    if (isActionable && !isActionable(row)) continue;

    const d = getDecision(row);
    const { actualWinner, marketHomeProb } = row.result;
    const mf = getMarketFavorite(marketHomeProb);

    if (d.label === "STRONG") {
      const ok = isStrongCorrect(d.action, actualWinner);
      judgedCount++;
      strongJudged++;
      if (ok) { correctCount++; strongCorrect++; }
    } else if (d.label === "UPSET") {
      const ok = isUpsetCorrect(d.action, mf, actualWinner);
      if (ok !== null) {
        judgedCount++;
        upsetJudged++;
        if (ok) { correctCount++; upsetCorrect++; }
      }
    }
    // CHAOS / WEAK / NONE: not judged
  }

  const upsetBaseRate = ratio(actualUpsets, marketJudgable);
  const upsetAccuracy = ratio(upsetCorrect, upsetJudged);
  const upsetLift =
    upsetAccuracy !== null && upsetBaseRate !== null && upsetBaseRate > 0
      ? Number((upsetAccuracy / upsetBaseRate).toFixed(4))
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

function sampleConfidenceLevel(n: number): BacktestReport["sampleConfidence"] {
  if (n >= 1000) return "strong";
  if (n >= 300) return "usable";
  if (n >= 100) return "directional";
  return "exploratory";
}

function sortMatchesChronologically(matches: HistoricalMatch[]): HistoricalMatch[] {
  return [...matches].sort((a, b) => {
    const startsAtDelta = new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    if (startsAtDelta !== 0) return startsAtDelta;
    const snapshotDelta = new Date(a.snapshotAt).getTime() - new Date(b.snapshotAt).getTime();
    if (snapshotDelta !== 0) return snapshotDelta;
    return a.matchId.localeCompare(b.matchId);
  });
}

function buildRollingValidationContext(rows: BacktestRow[]): DecisionPipelineInput["validationContext"] {
  if (rows.length === 0) {
    return {
      overallAccuracy: null,
      upsetLift: null,
      decisionCoverage: null,
      calibrationScore: null,
    };
  }

  let marketJudgable = 0;
  let actualUpsets = 0;
  for (const row of rows) {
    const marketFavorite = getMarketFavorite(row.result.marketHomeProb);
    if (marketFavorite !== "NONE") {
      marketJudgable++;
      if (row.result.actualWinner !== "DRAW" && row.result.actualWinner !== marketFavorite) {
        actualUpsets++;
      }
    }
  }

  const live = computeAgentMetrics(rows, (row) => row.liveDecision, marketJudgable, actualUpsets);
  return {
    overallAccuracy: live.overallAccuracy,
    upsetLift: live.upsetLift,
    decisionCoverage: live.decisionCoverage,
    calibrationScore: null,
  };
}

function deriveDateRange(matches: HistoricalMatch[]): { startDate: string; endDate: string } {
  if (matches.length === 0) return { startDate: "", endDate: "" };
  const dates = matches.map((m) => m.startsAt).sort();
  return { startDate: dates[0].slice(0, 10), endDate: dates[dates.length - 1].slice(0, 10) };
}

export class BacktestEngine {
  constructor(_options?: BacktestOptions) {}

  // Run a single match — NO lookahead: only snapshot fields go into agent input.
  runMatch(
    match: HistoricalMatch,
    validationContext: DecisionPipelineInput["validationContext"],
  ): BacktestRow {
    const agentInput: LiveDecisionAgentInput = {
      league: match.league as LiveDecisionAgentInput["league"],
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      status: mapStatus(match.status),
      homeScore: match.homeScore ?? null,
      awayScore: match.awayScore ?? null,
      startsAt: match.startsAt,
      marketHomeProb: match.marketHomeProb,
    };

    // Pass snapshotAt as "now" so isLateCloseGame measures time correctly.
    const snapshotDate = new Date(match.snapshotAt);

    const liveResult = new LiveDecisionAgent().run(agentInput, snapshotDate);

    const pipelineResult = new DecisionPipelineAgent().run({
      match: agentInput,
      validationContext,
      simulationContext: null,
    });

    // Ground truth — only used here for scoring, never fed back into decision inputs.
    const actualWinner = getActualWinner(match.finalHomeScore, match.finalAwayScore);

    return {
      matchId: match.matchId,
      league: match.league,
      liveDecision: {
        label: liveResult.label,
        action: liveResult.action,
        confidence: liveResult.confidence,
      },
      pipelineDecision: {
        label: pipelineResult.decision.label,
        action: pipelineResult.decision.action,
        confidence: pipelineResult.decision.confidence,
        finalConfidence: pipelineResult.finalConfidence,
        decisionMode: pipelineResult.decisionMode,
      },
      result: {
        actualWinner,
        marketHomeProb: match.marketHomeProb,
      },
    };
  }

  run(
    matches: HistoricalMatch[],
    provenance?: DataProvenance,
  ): { rows: BacktestRow[]; report: BacktestReport } {
    const rows: BacktestRow[] = [];
    for (const match of sortMatchesChronologically(matches)) {
      const validationContext = buildRollingValidationContext(rows);
      rows.push(this.runMatch(match, validationContext));
    }
    const report = this.buildReport(rows, provenance, matches);
    return { rows, report };
  }

  private buildReport(
    rows: BacktestRow[],
    provenance: DataProvenance | undefined,
    matches: HistoricalMatch[],
  ): BacktestReport {
    const notes: string[]= [];

    // Market stats — property of the dataset, same for both agents.
    let marketJudgable = 0;
    let actualUpsets = 0;
    for (const row of rows) {
      const mf = getMarketFavorite(row.result.marketHomeProb);
      if (mf !== "NONE") {
        marketJudgable++;
        if (row.result.actualWinner !== "DRAW" && row.result.actualWinner !== mf) {
          actualUpsets++;
        }
      }
    }

    if (marketJudgable === 0) {
      notes.push("No market-judgable matches. upsetBaseRate and upsetLift unavailable.");
    }

    // Per-agent metrics
    const live = computeAgentMetrics(rows, (r) => r.liveDecision, marketJudgable, actualUpsets);
    const pipeline = computeAgentMetrics(
      rows,
      (r) => r.pipelineDecision,
      marketJudgable,
      actualUpsets,
      (row) =>
        row.pipelineDecision.decisionMode === "ATTACK" ||
        row.pipelineDecision.decisionMode === "ADJUST",
    );

    // Label breakdown from live decision (baseline reference)
    const lbCount = { STRONG: 0, UPSET: 0, CHAOS: 0, WEAK: 0, NONE: 0 };
    let lbStrongJudged = 0;
    let lbStrongCorrect = 0;
    let lbUpsetJudged = 0;
    let lbUpsetCorrect = 0;

    for (const row of rows) {
      const label = row.liveDecision.label as keyof typeof lbCount;
      if (label in lbCount) lbCount[label]++;

      const mf = getMarketFavorite(row.result.marketHomeProb);
      if (row.liveDecision.label === "STRONG") {
        lbStrongJudged++;
        if (isStrongCorrect(row.liveDecision.action, row.result.actualWinner)) lbStrongCorrect++;
      } else if (row.liveDecision.label === "UPSET") {
        const ok = isUpsetCorrect(row.liveDecision.action, mf, row.result.actualWinner);
        if (ok !== null) {
          lbUpsetJudged++;
          if (ok) lbUpsetCorrect++;
        }
      }
    }

    // Per-league stats using live decision
    const leagueMap = new Map<
      string,
      {
        sampleSize: number;
        judgedCount: number;
        correctCount: number;
        marketJudgable: number;
        actualUpsets: number;
        upsetJudged: number;
        upsetCorrect: number;
      }
    >();

    for (const row of rows) {
      if (!leagueMap.has(row.league)) {
        leagueMap.set(row.league, {
          sampleSize: 0,
          judgedCount: 0,
          correctCount: 0,
          marketJudgable: 0,
          actualUpsets: 0,
          upsetJudged: 0,
          upsetCorrect: 0,
        });
      }
      const ls = leagueMap.get(row.league)!;
      ls.sampleSize++;

      const mf = getMarketFavorite(row.result.marketHomeProb);
      if (mf !== "NONE") {
        ls.marketJudgable++;
        if (row.result.actualWinner !== "DRAW" && row.result.actualWinner !== mf) {
          ls.actualUpsets++;
        }
      }

      const d = row.liveDecision;
      if (d.label === "STRONG") {
        ls.judgedCount++;
        if (isStrongCorrect(d.action, row.result.actualWinner)) ls.correctCount++;
      } else if (d.label === "UPSET") {
        const ok = isUpsetCorrect(d.action, mf, row.result.actualWinner);
        if (ok !== null) {
          ls.judgedCount++;
          if (ok) ls.correctCount++;
          ls.upsetJudged++;
          if (ok) ls.upsetCorrect++;
        }
      }
    }

    const byLeague: BacktestReport["byLeague"] = {};
    for (const [league, ls] of leagueMap) {
      const lUBR = ls.marketJudgable > 0 ? ls.actualUpsets / ls.marketJudgable : null;
      const lUA = ls.upsetJudged > 0 ? ls.upsetCorrect / ls.upsetJudged : null;
      const lUL =
        lUA !== null && lUBR !== null && lUBR > 0
          ? Number((lUA / lUBR).toFixed(4))
          : null;

      byLeague[league] = {
        sampleSize: ls.sampleSize,
        overallAccuracy: ratio(ls.correctCount, ls.judgedCount),
        upsetLift: lUL,
      };
    }

    const sampleSize = rows.length;
    if (sampleSize < 100) {
      notes.push("LOW_SAMPLE_SIZE: results are not statistically reliable");
    }

    const dataSource = provenance?.dataSource ?? "fixture";
    const dateRange = provenance?.dateRange ?? deriveDateRange(matches);
    const sampleConfidence = sampleConfidenceLevel(sampleSize);

    if (dataSource === "fixture") {
      notes.push("FIXTURE_DATA: structural validation only, not real edge proof.");
    } else if (dataSource === "espn") {
      notes.push("ESPN_PREGAME_MODE: ESPN historical scores are used only as final outcomes, not decision inputs.");
      if (sampleSize < 100) {
        notes.push("ESPN_SAMPLE_TOO_SMALL: not statistically reliable");
      } else {
        notes.push("ESPN_DATA: larger sample may be directionally informative, not proof of durable edge.");
      }
    }

    return {
      sampleSize,
      judgedSampleSize: live.judgedCount,
      dataSource,
      dateRange,
      sampleConfidence,
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
      labelBreakdown: {
        STRONG: { count: lbCount.STRONG, accuracy: ratio(lbStrongCorrect, lbStrongJudged) },
        UPSET: { count: lbCount.UPSET, accuracy: ratio(lbUpsetCorrect, lbUpsetJudged) },
        CHAOS: { count: lbCount.CHAOS },
        WEAK: { count: lbCount.WEAK },
        NONE: { count: lbCount.NONE },
      },
      notes,
    };
  }
}
