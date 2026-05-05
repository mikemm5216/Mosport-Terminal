import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { loadHistoricalCorpus } from "./loadHistoricalCorpus";
import { extractHistoricalFeatures } from "../../lib/features/extractorRouter";
import type { HistoricalGameRecord } from "../../types/historical";

type Baseline = { games: number; homeWins: number; avgMargin: number };
type Row = {
  matchId: string;
  league: string;
  startTime: string;
  homeTeamName?: string;
  awayTeamName?: string;
  predictedWinnerTeamId: string;
  actualWinnerTeamId: string;
  predictedWinnerName?: string;
  actualWinnerName?: string;
  confidence: number;
  actualMargin: number;
  predictedMargin: number;
  marginError: number;
  result: "HIT" | "MISS";
  featureCompleteness: number;
  featureStatus: string;
};

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    train: args.find((a) => a.startsWith("--train="))?.split("=")[1] || "data/historical/mosport_2020_2024_train.jsonl",
    test: args.find((a) => a.startsWith("--test="))?.split("=")[1] || "data/historical/mosport_2025_test.jsonl",
    output: args.find((a) => a.startsWith("--output="))?.split("=")[1] || "data/backtest-artifacts",
  };
}

const avg = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
const clamp01 = (v: number) => Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.5;
const sha256 = (p: string) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

function calculateBaselines(train: HistoricalGameRecord[]): Record<string, Baseline> {
  const byLeague: Record<string, { games: number; homeWins: number; margins: number[] }> = {};
  for (const game of train) {
    const league = game.league;
    byLeague[league] ||= { games: 0, homeWins: 0, margins: [] };
    byLeague[league].games += 1;
    byLeague[league].homeWins += game.finalResult.winnerTeamId === game.homeTeamId ? 1 : 0;
    byLeague[league].margins.push(game.finalResult.homeScore - game.finalResult.awayScore);
  }
  return Object.fromEntries(Object.entries(byLeague).map(([league, value]) => [league, {
    games: value.games,
    homeWins: value.homeWins,
    avgMargin: avg(value.margins),
  }]));
}

function featureEdge(game: HistoricalGameRecord): { edge: number; completeness: number; status: string } {
  const extraction = extractHistoricalFeatures(game);
  const f: any = extraction.featureSet;
  const home = f.teamContext?.home || {};
  const away = f.teamContext?.away || {};
  const formEdge = Number(home.recentFormScore ?? 0.5) - Number(away.recentFormScore ?? 0.5);
  const restEdge = (Number(home.restDays ?? 3) - Number(away.restDays ?? 3)) / 7;
  const injuryEdge = Number(away.injuryBurden ?? 0.35) - Number(home.injuryBurden ?? 0.35);
  const stabilityEdge = Number(home.rosterStability ?? 0.65) - Number(away.rosterStability ?? 0.65);
  let sportEdge = 0;
  if (game.league === "NBA") sportEdge = Number(f.nba?.matchupMismatch ?? 0.5) - 0.5;
  if (game.league === "MLB") sportEdge = Number(f.mlb?.starterAdvantage ?? 0.5) - 0.5;
  if (game.league === "NHL") sportEdge = Number(f.nhl?.goalieAdvantage ?? 0.5) - 0.5;
  if (game.league === "NFL") sportEdge = Number(f.nfl?.qbStability ?? 0.5) - 0.5;
  if (game.league === "EPL") sportEdge = Number(f.epl?.midfieldControl ?? 0.5) - 0.5;
  return {
    edge: formEdge * 0.42 + restEdge * 0.12 + injuryEdge * 0.16 + stabilityEdge * 0.12 + sportEdge * 0.18,
    completeness: extraction.completenessScore,
    status: extraction.featureStatus,
  };
}

function predict(game: HistoricalGameRecord, baseline?: Baseline): Row {
  const baseHomeWin = baseline ? baseline.homeWins / baseline.games : 0.5;
  const baseMargin = baseline?.avgMargin ?? 0;
  const feature = featureEdge(game);
  const homeProbability = clamp01(baseHomeWin * 0.45 + 0.275 + feature.edge * 0.85);
  const predictedWinnerTeamId = homeProbability >= 0.5 ? game.homeTeamId : game.awayTeamId;
  const confidence = homeProbability >= 0.5 ? homeProbability : 1 - homeProbability;
  const actualMargin = game.finalResult.homeScore - game.finalResult.awayScore;
  const predictedMargin = baseMargin + feature.edge * 20;
  const actualWinnerName = game.finalResult.winnerTeamId === game.homeTeamId ? game.homeTeamName : game.awayTeamName;
  const predictedWinnerName = predictedWinnerTeamId === game.homeTeamId ? game.homeTeamName : game.awayTeamName;
  return {
    matchId: game.matchId,
    league: game.league,
    startTime: game.startTime,
    homeTeamName: game.homeTeamName,
    awayTeamName: game.awayTeamName,
    predictedWinnerTeamId,
    actualWinnerTeamId: game.finalResult.winnerTeamId,
    predictedWinnerName,
    actualWinnerName,
    confidence,
    actualMargin,
    predictedMargin,
    marginError: Math.abs(predictedMargin - actualMargin),
    result: predictedWinnerTeamId === game.finalResult.winnerTeamId ? "HIT" : "MISS",
    featureCompleteness: feature.completeness,
    featureStatus: feature.status,
  };
}

function summary(rows: Row[]) {
  const make = (items: Row[]) => {
    const hits = items.filter((r) => r.result === "HIT").length;
    return {
      games: items.length,
      hits,
      misses: items.length - hits,
      accuracy: items.length ? hits / items.length : 0,
      averageConfidence: avg(items.map((r) => r.confidence)),
      averageMarginError: avg(items.map((r) => r.marginError)),
    };
  };
  const byLeague: Record<string, ReturnType<typeof make>> = {};
  for (const league of [...new Set(rows.map((r) => r.league))]) byLeague[league] = make(rows.filter((r) => r.league === league));
  return { overall: make(rows), byLeague };
}

function markdown(report: any): string {
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  const lines = [
    "# Mosport 2025 Out-of-Sample Prediction Backtest",
    "",
    "## Method",
    "- Train/calibration: real completed 2020-2024 games.",
    "- Test: real completed 2025 games.",
    "- Features are derived only from team games before each predicted game.",
    "- Actual 2025 results are used only for scoring after prediction.",
    "",
    "## Overall",
    `- Train records: ${report.trainRecords}`,
    `- Test predictions: ${report.testRecords}`,
    `- Accuracy: ${pct(report.summary.overall.accuracy)}`,
    `- Hits: ${report.summary.overall.hits}`,
    `- Misses: ${report.summary.overall.misses}`,
    `- Average confidence: ${pct(report.summary.overall.averageConfidence)}`,
    `- Average margin error: ${report.summary.overall.averageMarginError.toFixed(2)}`,
    "",
    "## By League",
  ];
  for (const [league, item] of Object.entries(report.summary.byLeague) as any) {
    lines.push(`- **${league}:** ${item.games} games, ${pct(item.accuracy)} accuracy, avg margin error ${item.averageMarginError.toFixed(2)}`);
  }
  lines.push("", "## Largest Misses");
  for (const row of report.largestMisses) {
    lines.push(`- ${row.startTime} ${row.league} ${row.awayTeamName} @ ${row.homeTeamName}: predicted ${row.predictedWinnerName}, actual ${row.actualWinnerName}, margin error ${row.marginError.toFixed(2)}, confidence ${pct(row.confidence)}`);
  }
  return lines.join("\n") + "\n";
}

async function main() {
  const args = parseArgs();
  if (!fs.existsSync(args.train)) throw new Error(`Train file not found: ${args.train}`);
  if (!fs.existsSync(args.test)) throw new Error(`Test file not found: ${args.test}`);
  fs.mkdirSync(args.output, { recursive: true });
  const train = await loadHistoricalCorpus(args.train);
  const test = await loadHistoricalCorpus(args.test);
  const baselines = calculateBaselines(train);
  const predictions = test.map((game) => predict(game, baselines[game.league]));
  const report = {
    createdAt: new Date().toISOString(),
    engine: "Mosport V15 2025 out-of-sample baseline",
    trainFile: args.train,
    testFile: args.test,
    trainSha256: sha256(args.train),
    testSha256: sha256(args.test),
    trainRecords: train.length,
    testRecords: test.length,
    baselines,
    summary: summary(predictions),
    predictions,
    largestMisses: [...predictions].sort((a, b) => b.marginError - a.marginError).slice(0, 25),
  };
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(args.output, `oos_2025_prediction_backtest_${ts}.json`);
  const mdPath = path.join(args.output, `oos_2025_prediction_backtest_${ts}.md`);
  const csvPath = path.join(args.output, `oos_2025_predictions_${ts}.csv`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, markdown(report));
  fs.writeFileSync(csvPath, [
    "matchId,league,startTime,homeTeam,awayTeam,predictedWinner,actualWinner,confidence,actualMargin,predictedMargin,marginError,result",
    ...predictions.map((r) => [r.matchId, r.league, r.startTime, r.homeTeamName, r.awayTeamName, r.predictedWinnerName, r.actualWinnerName, r.confidence.toFixed(6), r.actualMargin.toFixed(3), r.predictedMargin.toFixed(3), r.marginError.toFixed(3), r.result].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n") + "\n");
  console.log("Mosport 2025 out-of-sample backtest complete.");
  console.log(`Train records: ${train.length}`);
  console.log(`Test records: ${test.length}`);
  console.log(`Accuracy: ${(report.summary.overall.accuracy * 100).toFixed(2)}%`);
  console.log(`Average margin error: ${report.summary.overall.averageMarginError.toFixed(2)}`);
  console.log(`Report JSON: ${jsonPath}`);
  console.log(`Report Markdown: ${mdPath}`);
  console.log(`Predictions CSV: ${csvPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
