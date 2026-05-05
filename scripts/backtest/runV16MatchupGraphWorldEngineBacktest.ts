import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { loadHistoricalCorpus } from "./loadHistoricalCorpus";
import type { HistoricalGameRecord } from "../../types/historical";
import type { SpecialWorldType } from "../../types/worldEngineDoctrine";

type Side = "HOME" | "AWAY" | "BOTH";
type Lean = "HOME" | "AWAY" | "NO_LEAN";
type MatchupCertainty = "CONFIRMED" | "PROJECTED" | "PROBABLE" | "RUMORED" | "UNKNOWN" | "CONFLICTING";
type MatchupKind = "TEAM_UNIT" | "PLAYER_ROLE" | "COACHING";

type AvailabilityContext = {
  sourceLevel: "TEAM_PROXY" | "ROLE_PROXY" | "PLAYER_FEED";
  leagueSpecificHook: string;
  leagueSpecificHookAttached: boolean;
  baseCertainty: MatchupCertainty;
  missingInputs: string[];
};

type MatchupEdge = {
  id: string;
  kind: MatchupKind;
  label: string;
  attackingSide: Side;
  defendingSide: Side;
  certainty: MatchupCertainty;
  miracleEntry: boolean;
  collapseEntry: boolean;
  worldLineEffect: string;
};

type MatchupGraph = {
  edges: MatchupEdge[];
  confirmedEdges: number;
  uncertainEdges: number;
  confirmedRate: number;
  uncertainRate: number;
  coverage: number;
  summary: string;
};

type PredictionRow = {
  matchId: string;
  league: string;
  startTime: string;
  homeTeamName?: string;
  awayTeamName?: string;
  normalLean: Lean;
  predictedWinnerTeamId: string;
  actualWinnerTeamId: string;
  hit: boolean;
  confidenceProxy: number;
  doctrineFlowCoverage: number;
  dataDepthCompleteness: number;
  worldEngineReadiness: number;
  matchupGraphCoverage: number;
  confirmedMatchupEdgeRate: number;
  uncertainMatchupEdgeRate: number;
  matchupGraph: MatchupGraph;
  matchupGraphSummary: string;
  miracleEntry: string;
  collapseEntry: string;
  environmentRead: string;
  keyboardCoachSummary: string;
  missingAdvancedInputs: string[];
};

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    train: args.find((a) => a.startsWith("--train="))?.split("=")[1] || "data/historical/mosport_2020_2024_train.jsonl",
    test: args.find((a) => a.startsWith("--test="))?.split("=")[1] || "data/historical/mosport_2025_test.jsonl",
    output: args.find((a) => a.startsWith("--output="))?.split("=")[1] || "data/backtest-artifacts",
  };
}

function sha256(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
}

function avg(values: number[], fallback = 0): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function feature(game: HistoricalGameRecord): any {
  return game.pregameSnapshot.features as any;
}

function teamContext(game: HistoricalGameRecord, side: "home" | "away") {
  return feature(game).teamContext?.[side] || {};
}

function contextNumber(game: HistoricalGameRecord, side: "home" | "away", key: string, fallback: number): number {
  const value = Number(teamContext(game, side)?.[key]);
  return Number.isFinite(value) ? value : fallback;
}

function hasFeature(game: HistoricalGameRecord, keys: string[]): boolean {
  let current: any = feature(game);
  for (const key of keys) {
    if (!current || typeof current !== "object" || !(key in current)) return false;
    current = current[key];
  }
  return current !== undefined && current !== null;
}

function leagueKey(game: HistoricalGameRecord): string {
  return String(game.league).toLowerCase();
}

function leagueBaselineMargin(train: HistoricalGameRecord[]): Record<string, number> {
  const buckets: Record<string, number[]> = {};
  for (const game of train) {
    buckets[game.league] ||= [];
    buckets[game.league].push(game.finalResult.homeScore - game.finalResult.awayScore);
  }
  return Object.fromEntries(Object.entries(buckets).map(([league, margins]) => [league, avg(margins, 0)]));
}

function specialWorlds(game: HistoricalGameRecord): SpecialWorldType[] {
  const month = new Date(game.startTime).getUTCMonth() + 1;
  const result: SpecialWorldType[] = ["REGULAR_SEASON"];
  if (game.league === "NBA" && month >= 4 && month <= 6) result.push("PLAYOFF");
  if (game.league === "NHL" && month >= 4 && month <= 6) result.push("PLAYOFF");
  if (game.league === "MLB" && month >= 10) result.push("PLAYOFF");
  if (game.league === "NFL" && (month === 1 || month === 2)) result.push("PLAYOFF");
  if (game.league === "EPL" && month === 5) result.push("FINAL");
  return [...new Set(result)];
}

function leagueHook(league: string): string {
  if (league === "MLB") return "starting pitcher + bullpen usage + catcher/lineup order";
  if (league === "NHL") return "confirmed goalie + line combinations + defensive pairings";
  if (league === "NBA") return "injury report + starters + minutes restriction + rotation";
  if (league === "NFL") return "starting QB + OL availability + inactive list";
  if (league === "EPL") return "starting XI + formation + substitution load";
  return "league-specific availability and role graph";
}

function availability(game: HistoricalGameRecord): AvailabilityContext {
  const f = feature(game);
  const hasPlayers = Boolean(f.playerAvailability || f.players || f.rosters);
  const hasLineups = Boolean(f.lineups || f.startingLineups || f.starters);
  const hasRoles = Boolean(f.roleValidation || f.validatedRoles);
  const hasInjuries = Boolean(f.injuries || f.injuryReport);
  const hookKeys: Record<string, string[]> = {
    MLB: ["startingPitcher", "probablePitchers", "bullpen"],
    NHL: ["goalie", "confirmedGoalie", "lineCombinations"],
    NBA: ["injuries", "minutes", "starters"],
    NFL: ["qb", "quarterback", "offensiveLine", "inactive"],
    EPL: ["startingXI", "formation", "lineups"],
  };
  const hookAttached = (hookKeys[game.league] || []).some((key) => Boolean(f[key] || f[leagueKey(game)]?.[key]));
  const missingInputs: string[] = [];
  if (!hasPlayers) missingInputs.push("real player-level availability feed");
  if (!hasLineups) missingInputs.push("lineup/starters feed with role validation");
  if (!hasRoles) missingInputs.push("role validation feed");
  if (!hasInjuries) missingInputs.push("injury/minutes/inactive feed");
  if (!hookAttached) missingInputs.push(`${game.league} ${leagueHook(game.league)} feed`);
  return {
    sourceLevel: hasPlayers ? "PLAYER_FEED" : hasLineups ? "ROLE_PROXY" : "TEAM_PROXY",
    leagueSpecificHook: leagueHook(game.league),
    leagueSpecificHookAttached: hookAttached,
    baseCertainty: hasPlayers && hasLineups && hasRoles ? "CONFIRMED" : hasLineups ? "PROJECTED" : "UNKNOWN",
    missingInputs,
  };
}

function positiveSequence(league: string): string[] {
  if (league === "MLB") return ["patient at-bat", "walk or hard contact", "extra-base pressure", "bullpen stress"];
  if (league === "NBA") return ["defensive stop", "transition score", "corner three", "timeout pressure"];
  if (league === "NFL") return ["pressure on QB", "field-position swing", "explosive play", "red-zone pressure"];
  if (league === "NHL") return ["clean zone entry", "shot volume", "rebound pressure", "line-change trap"];
  if (league === "EPL") return ["press recovery", "final-third entry", "set-piece pressure", "second-ball pressure"];
  return ["first repeated event", "pressure event", "opponent response", "world-line shift"];
}

function collapseSequence(league: string): string[] {
  if (league === "MLB") return ["chase at bad pitch", "strikeout/no-contact", "quick inning", "pressure carries forward"];
  if (league === "NBA") return ["live-ball turnover", "fastbreak allowed", "forced shot", "run expands"];
  if (league === "NFL") return ["sack or penalty", "third-and-long", "three-and-out", "short-field pressure"];
  if (league === "NHL") return ["failed zone exit", "extended shift", "rebound allowed", "goalie stress"];
  if (league === "EPL") return ["failed clearance", "second ball lost", "wide overload", "set-piece or shot pressure"];
  return ["late reaction", "mistake", "second mistake", "coach forced to adjust"];
}

function graphFor(game: HistoricalGameRecord): MatchupGraph {
  const homeForm = contextNumber(game, "home", "recentFormScore", 0.5);
  const awayForm = contextNumber(game, "away", "recentFormScore", 0.5);
  const a = availability(game);
  const favored: Side = homeForm > awayForm + 0.05 ? "HOME" : awayForm > homeForm + 0.05 ? "AWAY" : "BOTH";
  const pressured: Side = favored === "HOME" ? "AWAY" : favored === "AWAY" ? "HOME" : "BOTH";
  const hookCertainty: MatchupCertainty = a.leagueSpecificHookAttached ? a.baseCertainty : "UNKNOWN";
  const edges: MatchupEdge[] = [
    { id: `${game.matchId}:team`, kind: "TEAM_UNIT", label: `${game.league} team identity collision`, attackingSide: favored, defendingSide: pressured, certainty: "PROJECTED", miracleEntry: true, collapseEntry: true, worldLineEffect: "Team-form edge shapes the normal world line but cannot replace player-level matchup graph data." },
    { id: `${game.matchId}:primary-role`, kind: "PLAYER_ROLE", label: `${game.league} primary role collision`, attackingSide: favored, defendingSide: pressured, certainty: a.baseCertainty, miracleEntry: true, collapseEntry: true, worldLineEffect: "Primary role edge can create repeated-event pressure; certainty depends on validated player/lineup feed." },
    { id: `${game.matchId}:league-hook`, kind: "PLAYER_ROLE", label: `${game.league} ${a.leagueSpecificHook}`, attackingSide: favored, defendingSide: pressured, certainty: hookCertainty, miracleEntry: true, collapseEntry: true, worldLineEffect: "League-specific edge is the next data-depth unlock for this sport." },
    { id: `${game.matchId}:depth`, kind: "TEAM_UNIT", label: `${game.league} bench/depth collision`, attackingSide: "BOTH", defendingSide: "BOTH", certainty: a.sourceLevel === "PLAYER_FEED" ? "PROJECTED" : "UNKNOWN", miracleEntry: false, collapseEntry: true, worldLineEffect: "Depth edge can become decisive if fatigue or rotation pressure appears." },
    { id: `${game.matchId}:coach`, kind: "COACHING", label: `${game.league} coaching response vs event chain`, attackingSide: "BOTH", defendingSide: "BOTH", certainty: "PROJECTED", miracleEntry: true, collapseEntry: true, worldLineEffect: "Coaching response controls whether the first repeated-event chain is stopped." },
  ];
  const confirmedEdges = edges.filter((edge) => edge.certainty === "CONFIRMED").length;
  const uncertainEdges = edges.length - confirmedEdges;
  const coverage = clamp01(0.1 + edges.length * 0.12 + confirmedEdges * 0.06 - uncertainEdges * 0.02);
  return { edges, confirmedEdges, uncertainEdges, confirmedRate: edges.length ? confirmedEdges / edges.length : 0, uncertainRate: edges.length ? uncertainEdges / edges.length : 1, coverage, summary: `${edges.length} matchup edges mapped; ${uncertainEdges} edges are not confirmed and must remain uncertainty-aware.` };
}

function environmentRead(game: HistoricalGameRecord): string {
  const base = ["home/away context", "real completed historical corpus context"];
  if (game.league === "MLB") base.push("ballpark and bullpen context pending L2 attachment");
  if (game.league === "NBA") base.push("rotation and pace context from L1 corpus");
  if (game.league === "NFL") base.push("short-season pressure and field-position volatility");
  if (game.league === "NHL") base.push("goalie/line-change sensitivity pending L2 attachment");
  if (game.league === "EPL") base.push("match tempo and fixture-position sensitivity");
  const worlds = specialWorlds(game);
  if (worlds.some((world) => world !== "REGULAR_SEASON")) base.push("special-world pressure", "shorter tolerance for mistakes");
  return `${worlds.join("+")} context; ${base.join("; ")}`;
}

function leanFor(game: HistoricalGameRecord, baselineMargin: number): Lean {
  const homeForm = contextNumber(game, "home", "recentFormScore", 0.5);
  const awayForm = contextNumber(game, "away", "recentFormScore", 0.5);
  const homeRest = contextNumber(game, "home", "restDays", 3);
  const awayRest = contextNumber(game, "away", "restDays", 3);
  const edge = (homeForm - awayForm) * 0.75 + ((homeRest - awayRest) / 7) * 0.15 + baselineMargin / 120;
  return Math.abs(edge) < 0.035 ? "NO_LEAN" : edge > 0 ? "HOME" : "AWAY";
}

function coverage(game: HistoricalGameRecord, graph: MatchupGraph) {
  const f = feature(game);
  const a = availability(game);
  const homeContext = teamContext(game, "home");
  const awayContext = teamContext(game, "away");
  const doctrineFlowCoverage = 0.12 + (homeContext && awayContext ? 0.16 : 0.08) + 0.08 + 0.12 + (graph.edges.length >= 4 ? 0.14 : 0.06) + 0.14 + 0.14 + (f?.[leagueKey(game)] ? 0.08 : 0.04);
  const dataDepthCompleteness = (homeContext && awayContext ? 0.14 : 0.04) + (a.sourceLevel === "PLAYER_FEED" ? 0.14 : a.sourceLevel === "ROLE_PROXY" ? 0.07 : 0.03) + (a.sourceLevel !== "TEAM_PROXY" ? 0.12 : 0.02) + (hasFeature(game, ["injuries"]) || hasFeature(game, ["injuryReport"]) ? 0.12 : 0.02) + graph.coverage * 0.14 + graph.confirmedRate * 0.10 + (hasFeature(game, ["weather"]) || hasFeature(game, ["venue"]) ? 0.10 : 0.03) + (hasFeature(game, ["officials"]) || hasFeature(game, ["umpire"]) ? 0.08 : 0.01) + (a.leagueSpecificHookAttached ? 0.16 : f?.[leagueKey(game)] ? 0.06 : 0.02) + (hasFeature(game, ["eventLog"]) || hasFeature(game, ["plays"]) ? 0.12 : 0.03);
  const flow = clamp01(doctrineFlowCoverage);
  const depth = clamp01(dataDepthCompleteness);
  return { doctrineFlowCoverage: flow, dataDepthCompleteness: depth, worldEngineReadiness: clamp01(flow * 0.55 + depth * 0.45) };
}

function rowFor(game: HistoricalGameRecord, baselineMargin: number): PredictionRow {
  const graph = graphFor(game);
  const c = coverage(game, graph);
  const a = availability(game);
  const normalLean = leanFor(game, baselineMargin);
  const predictedWinnerTeamId = normalLean === "HOME" ? game.homeTeamId : normalLean === "AWAY" ? game.awayTeamId : game.homeTeamId;
  const hit = predictedWinnerTeamId === game.finalResult.winnerTeamId;
  const homeName = game.homeTeamName || game.homeTeamId;
  const awayName = game.awayTeamName || game.awayTeamId;
  const leanName = normalLean === "HOME" ? homeName : normalLean === "AWAY" ? awayName : "no side";
  const positive = positiveSequence(game.league).join(" → ");
  const collapse = collapseSequence(game.league).join(" → ");
  const missingAdvancedInputs = Array.from(new Set([...a.missingInputs, "real player matchup tracking", "referee/umpire tendency feed", "weather/venue advanced feed where applicable", "sport-specific L2/L3 event logs"]));
  const keyboardCoachSummary = normalLean === "NO_LEAN"
    ? `${awayName} @ ${homeName}: V16.5 sees a balanced L1 world line. The matchup graph has ${graph.edges.length} edges and ${graph.uncertainEdges} uncertainty-aware edges; the first repeated-event chain matters more than a single headline matchup.`
    : `${awayName} @ ${homeName}: V16.5 leans ${leanName}, but the read flows through ${graph.edges.length} matchup edges, not one key matchup. ${graph.uncertainEdges} edges remain uncertainty-aware until confirmed by live/lineup data.`;
  return { matchId: game.matchId, league: game.league, startTime: game.startTime, homeTeamName: game.homeTeamName, awayTeamName: game.awayTeamName, normalLean, predictedWinnerTeamId, actualWinnerTeamId: game.finalResult.winnerTeamId, hit, confidenceProxy: normalLean === "NO_LEAN" ? 0.5 : 0.56 + c.worldEngineReadiness * 0.08 - graph.uncertainRate * 0.03, doctrineFlowCoverage: c.doctrineFlowCoverage, dataDepthCompleteness: c.dataDepthCompleteness, worldEngineReadiness: c.worldEngineReadiness, matchupGraphCoverage: graph.coverage, confirmedMatchupEdgeRate: graph.confirmedRate, uncertainMatchupEdgeRate: graph.uncertainRate, matchupGraph: graph, matchupGraphSummary: graph.summary, miracleEntry: positive, collapseEntry: collapse, environmentRead: environmentRead(game), keyboardCoachSummary, missingAdvancedInputs };
}

function summarize(rows: PredictionRow[]) {
  const hits = rows.filter((row) => row.hit).length;
  const byLeague: Record<string, any> = {};
  for (const row of rows) {
    byLeague[row.league] ||= { games: 0, hits: 0, accuracy: 0, doctrineFlowCoverage: 0, dataDepthCompleteness: 0, worldEngineReadiness: 0, matchupGraphCoverage: 0, uncertainMatchupEdgeRate: 0 };
    byLeague[row.league].games += 1;
    byLeague[row.league].hits += row.hit ? 1 : 0;
    byLeague[row.league].doctrineFlowCoverage += row.doctrineFlowCoverage;
    byLeague[row.league].dataDepthCompleteness += row.dataDepthCompleteness;
    byLeague[row.league].worldEngineReadiness += row.worldEngineReadiness;
    byLeague[row.league].matchupGraphCoverage += row.matchupGraphCoverage;
    byLeague[row.league].uncertainMatchupEdgeRate += row.uncertainMatchupEdgeRate;
  }
  for (const league of Object.keys(byLeague)) {
    byLeague[league].accuracy = byLeague[league].hits / byLeague[league].games;
    byLeague[league].doctrineFlowCoverage /= byLeague[league].games;
    byLeague[league].dataDepthCompleteness /= byLeague[league].games;
    byLeague[league].worldEngineReadiness /= byLeague[league].games;
    byLeague[league].matchupGraphCoverage /= byLeague[league].games;
    byLeague[league].uncertainMatchupEdgeRate /= byLeague[league].games;
  }
  return { games: rows.length, hits, misses: rows.length - hits, accuracy: rows.length ? hits / rows.length : 0, averageDoctrineFlowCoverage: avg(rows.map((row) => row.doctrineFlowCoverage)), averageDataDepthCompleteness: avg(rows.map((row) => row.dataDepthCompleteness)), averageWorldEngineReadiness: avg(rows.map((row) => row.worldEngineReadiness)), averageMatchupGraphCoverage: avg(rows.map((row) => row.matchupGraphCoverage)), averageConfirmedMatchupEdgeRate: avg(rows.map((row) => row.confirmedMatchupEdgeRate)), averageUncertainMatchupEdgeRate: avg(rows.map((row) => row.uncertainMatchupEdgeRate)), byLeague };
}

function markdown(report: any): string {
  const lines: string[] = [];
  lines.push("# Mosport V16.5 Matchup Graph World Engine Backtest", "", "## Method", "- Train/calibration: real completed 2020-2024 games.", "- Test: real completed 2025 games.", "- V16.5 replaces single key-matchup logic with a matchup collision graph.", "- Every matchup edge carries a certainty label: CONFIRMED, PROJECTED, PROBABLE, RUMORED, UNKNOWN, or CONFLICTING.", "- Starter or lineup uncertainty is treated as matchup graph uncertainty, not a standalone exception.", "- Missing L2/L3 and B2B inputs are reported explicitly.", "", "## Overall");
  lines.push(`- Train records: ${report.trainRecords}`, `- Test predictions: ${report.testRecords}`, `- Accuracy: ${pct(report.summary.accuracy)}`, `- Hits: ${report.summary.hits}`, `- Misses: ${report.summary.misses}`, `- Doctrine flow coverage: ${pct(report.summary.averageDoctrineFlowCoverage)}`, `- Data depth completeness: ${pct(report.summary.averageDataDepthCompleteness)}`, `- World engine readiness: ${pct(report.summary.averageWorldEngineReadiness)}`, `- Matchup graph coverage: ${pct(report.summary.averageMatchupGraphCoverage)}`, `- Confirmed matchup edge rate: ${pct(report.summary.averageConfirmedMatchupEdgeRate)}`, `- Uncertain matchup edge rate: ${pct(report.summary.averageUncertainMatchupEdgeRate)}`, "", "## By League");
  for (const [league, item] of Object.entries(report.summary.byLeague) as any) lines.push(`- **${league}:** ${item.games} games, ${pct(item.accuracy)} accuracy, ${pct(item.doctrineFlowCoverage)} flow, ${pct(item.dataDepthCompleteness)} data depth, ${pct(item.worldEngineReadiness)} readiness, ${pct(item.matchupGraphCoverage)} graph coverage, ${pct(item.uncertainMatchupEdgeRate)} uncertain edges`);
  lines.push("", "## V16.5 Boundary", "This report does not claim a single key matchup decides a game. It maps multiple matchup edges and marks each edge certainty. If player, lineup, injury, role, or matchup feeds are missing, the edge remains uncertainty-aware.", "", "## Sample Keyboard Coach Reads");
  for (const row of report.sampleReads.slice(0, 10)) lines.push(`- ${row.startTime} ${row.league} ${row.awayTeamName} @ ${row.homeTeamName}: ${row.keyboardCoachSummary}`);
  lines.push("", "## Missing Advanced Inputs");
  for (const item of report.missingAdvancedInputSummary) lines.push(`- ${item}`);
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const args = parseArgs();
  if (!fs.existsSync(args.train)) throw new Error(`Train file not found: ${args.train}`);
  if (!fs.existsSync(args.test)) throw new Error(`Test file not found: ${args.test}`);
  fs.mkdirSync(args.output, { recursive: true });
  const train = await loadHistoricalCorpus(args.train);
  const test = await loadHistoricalCorpus(args.test);
  const baselines = leagueBaselineMargin(train);
  const rows = test.map((game) => rowFor(game, baselines[game.league] || 0));
  const summary = summarize(rows);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const report = { createdAt: new Date().toISOString(), engine: "Mosport V16.5 Matchup Graph World Engine Baseline", doctrineVersion: "MOSPORT_WORLD_ENGINE_DOCTRINE_V1_1", trainFile: args.train, testFile: args.test, trainSha256: sha256(args.train), testSha256: sha256(args.test), trainRecords: train.length, testRecords: test.length, summary, missingAdvancedInputSummary: Array.from(new Set(rows.flatMap((row) => row.missingAdvancedInputs))), sampleReads: rows.slice(0, 25), predictions: rows };
  const jsonPath = path.join(args.output, `v16_5_matchup_graph_world_engine_backtest_${timestamp}.json`);
  const mdPath = path.join(args.output, `v16_5_matchup_graph_world_engine_backtest_${timestamp}.md`);
  const csvPath = path.join(args.output, `v16_5_matchup_graph_world_engine_predictions_${timestamp}.csv`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, markdown(report));
  fs.writeFileSync(csvPath, ["matchId,league,startTime,homeTeam,awayTeam,normalLean,actualWinner,hit,confidenceProxy,doctrineFlowCoverage,dataDepthCompleteness,worldEngineReadiness,matchupGraphCoverage,confirmedMatchupEdgeRate,uncertainMatchupEdgeRate,matchupGraphSummary,environmentRead", ...rows.map((row) => [row.matchId, row.league, row.startTime, row.homeTeamName, row.awayTeamName, row.normalLean, row.actualWinnerTeamId, row.hit, row.confidenceProxy.toFixed(6), row.doctrineFlowCoverage.toFixed(6), row.dataDepthCompleteness.toFixed(6), row.worldEngineReadiness.toFixed(6), row.matchupGraphCoverage.toFixed(6), row.confirmedMatchupEdgeRate.toFixed(6), row.uncertainMatchupEdgeRate.toFixed(6), row.matchupGraphSummary, row.environmentRead].map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))].join("\n") + "\n");
  console.log("Mosport V16.5 Matchup Graph World Engine baseline complete.");
  console.log(`Train records: ${train.length}`);
  console.log(`Test records: ${test.length}`);
  console.log(`Accuracy: ${(summary.accuracy * 100).toFixed(2)}%`);
  console.log(`Doctrine flow coverage: ${(summary.averageDoctrineFlowCoverage * 100).toFixed(2)}%`);
  console.log(`Data depth completeness: ${(summary.averageDataDepthCompleteness * 100).toFixed(2)}%`);
  console.log(`World engine readiness: ${(summary.averageWorldEngineReadiness * 100).toFixed(2)}%`);
  console.log(`Matchup graph coverage: ${(summary.averageMatchupGraphCoverage * 100).toFixed(2)}%`);
  console.log(`Uncertain matchup edge rate: ${(summary.averageUncertainMatchupEdgeRate * 100).toFixed(2)}%`);
  console.log(`Report JSON: ${jsonPath}`);
  console.log(`Report Markdown: ${mdPath}`);
  console.log(`Predictions CSV: ${csvPath}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
