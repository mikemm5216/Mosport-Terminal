import { BacktestEngine } from "../lib/backtest/BacktestEngine";
import { ESPNHistoricalLoader } from "../lib/backtest/ESPNHistoricalLoader";
import { FixtureHistoricalLoader } from "../lib/backtest/FixtureHistoricalLoader";
import { PregameSignalFixtureLayer, buildSyntheticSignalBacktest } from "../lib/backtest/PregameSignalFixtureLayer";

const DEFAULT_LEAGUES = ["NBA", "MLB", "EPL", "UCL"] as const;

function fmt(value: number | null, decimals = 4): string {
  return value === null ? "null" : value.toFixed(decimals);
}

function delta(pipeline: number | null, live: number | null): string {
  if (pipeline === null || live === null) return "n/a";
  const value = pipeline - live;
  return `${value >= 0 ? "+" : ""}${value.toFixed(4)}`;
}

async function main() {
  const source = process.env.BACKTEST_SOURCE ?? "fixture";
  const withSyntheticSignals = process.env.BACKTEST_WITH_SYNTHETIC_SIGNALS === "1";
  const startDate = process.env.BACKTEST_START_DATE ?? "2025-11-01";
  const endDate = process.env.BACKTEST_END_DATE ?? "2026-04-24";
  const limit = process.env.BACKTEST_LIMIT ? Number(process.env.BACKTEST_LIMIT) : undefined;

  const loader =
    source === "espn"
      ? new ESPNHistoricalLoader()
      : new FixtureHistoricalLoader();

  const matches = await loader.loadCompletedMatches({
    leagues: [...DEFAULT_LEAGUES],
    startDate,
    endDate,
    limit,
  });

  const { rows, report } =
    source === "espn" && withSyntheticSignals
      ? (() => {
          const syntheticMatches = new PregameSignalFixtureLayer().enrich(matches);
          const { rows: syntheticRows, report: syntheticReport } = buildSyntheticSignalBacktest(syntheticMatches, {
            dataSource: "espn",
            dateRange: { startDate, endDate },
          });
          syntheticReport.notes.unshift(
            "ESPN_PREGAME_MODE: ESPN historical scores are used only as final outcomes, not decision inputs.",
          );
          return { rows: syntheticRows, report: syntheticReport };
        })()
      : new BacktestEngine().run(matches, {
          dataSource: source === "espn" ? "espn" : "fixture",
          dateRange: {
            startDate,
            endDate,
          },
        });

  const pipelineModeCounts = rows.reduce<Record<string, number>>((acc, row) => {
    const key = row.pipelineDecision.decisionMode ?? "UNKNOWN";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const liveStrongCount = rows.filter((row) => row.liveDecision.label === "STRONG").length;
  const pipelineAttackCount = pipelineModeCounts["ATTACK"] ?? 0;
  const pipelineBenchCount = pipelineModeCounts["BENCH"] ?? 0;

  console.log("Mosport Backtest v1.5\n");

  console.log(`dataSource: ${report.dataSource}`);
  console.log(`dateRange: ${report.dateRange.startDate} -> ${report.dateRange.endDate}`);
  console.log(`sampleConfidence: ${report.sampleConfidence}`);
  console.log(`sampleSize: ${report.sampleSize}`);
  console.log(`judgedSampleSize: ${report.judgedSampleSize}`);
  console.log();

  console.log("liveDecision:");
  console.log(`  overallAccuracy: ${fmt(report.liveDecision.overallAccuracy)}`);
  console.log(`  strongAccuracy: ${fmt(report.liveDecision.strongAccuracy)}`);
  console.log(`  upsetAccuracy: ${fmt(report.liveDecision.upsetAccuracy)}`);
  console.log(`  decisionCoverage: ${fmt(report.liveDecision.decisionCoverage)}`);
  console.log(`  upsetBaseRate: ${fmt(report.liveDecision.upsetBaseRate)}`);
  console.log(`  upsetLift: ${fmt(report.liveDecision.upsetLift)}`);
  console.log();

  console.log("pipelineDecision:");
  console.log(`  overallAccuracy: ${fmt(report.pipelineDecision.overallAccuracy)}`);
  console.log(`  strongAccuracy: ${fmt(report.pipelineDecision.strongAccuracy)}`);
  console.log(`  upsetAccuracy: ${fmt(report.pipelineDecision.upsetAccuracy)}`);
  console.log(`  decisionCoverage: ${fmt(report.pipelineDecision.decisionCoverage)}`);
  console.log(`  upsetBaseRate: ${fmt(report.pipelineDecision.upsetBaseRate)}`);
  console.log(`  upsetLift: ${fmt(report.pipelineDecision.upsetLift)}`);
  console.log();

  console.log("Live vs Pipeline deltas:");
  console.log(
    `  overallAccuracy: ${delta(report.pipelineDecision.overallAccuracy, report.liveDecision.overallAccuracy)}`,
  );
  console.log(
    `  strongAccuracy: ${delta(report.pipelineDecision.strongAccuracy, report.liveDecision.strongAccuracy)}`,
  );
  console.log(
    `  upsetAccuracy: ${delta(report.pipelineDecision.upsetAccuracy, report.liveDecision.upsetAccuracy)}`,
  );
  console.log(
    `  decisionCoverage: ${delta(report.pipelineDecision.decisionCoverage, report.liveDecision.decisionCoverage)}`,
  );
  console.log(`  upsetLift: ${delta(report.pipelineDecision.upsetLift, report.liveDecision.upsetLift)}`);
  console.log();

  console.log("coachMode:");
  console.log(`  ATTACK: ${pipelineAttackCount}`);
  console.log(`  ADJUST: ${pipelineModeCounts["ADJUST"] ?? 0}`);
  console.log(`  KEEP: ${pipelineModeCounts["KEEP"] ?? 0}`);
  console.log(`  BENCH: ${pipelineBenchCount}`);
  console.log(`  liveStrongCount: ${liveStrongCount}`);
  console.log();

  console.log("byLeague:");
  for (const [league, stats] of Object.entries(report.byLeague)) {
    console.log(
      `  ${league}: sampleSize=${stats.sampleSize} overallAccuracy=${fmt(stats.overallAccuracy)} upsetLift=${fmt(stats.upsetLift)}`,
    );
  }
  console.log();

  console.log("notes:");
  for (const note of report.notes) {
    console.log(`  ${note}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown backtest error");
  process.exit(1);
});
