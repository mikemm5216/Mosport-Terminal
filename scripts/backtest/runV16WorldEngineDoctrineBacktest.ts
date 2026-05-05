import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { loadHistoricalCorpus } from "./loadHistoricalCorpus";
import type { HistoricalGameRecord } from "../../types/historical";
import type {
  EnvironmentState,
  EventChainPotential,
  MatchupCollision,
  MosportReadV16,
  PlayerLivingState,
  SpecialWorldType,
  TeamLivingState,
  WorldLineSimulation,
} from "../../types/worldEngineDoctrine";

type V16PredictionRow = {
  matchId: string;
  league: string;
  startTime: string;
  homeTeamName?: string;
  awayTeamName?: string;
  normalLean: "HOME" | "AWAY" | "NO_LEAN";
  predictedWinnerTeamId: string;
  actualWinnerTeamId: string;
  hit: boolean;
  confidenceProxy: number;
  doctrineCompleteness: number;
  missingAdvancedInputs: string[];
  keyMatchup: string;
  miracleEntry?: string;
  collapseEntry?: string;
  environmentRead: string;
  keyboardCoachSummary: string;
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
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}

function avg(values: number[], fallback = 0): number {
  return values.length === 0 ? fallback : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function leagueBaselineMargin(train: HistoricalGameRecord[]): Record<string, number> {
  const buckets: Record<string, number[]> = {};
  for (const game of train) {
    buckets[game.league] ||= [];
    buckets[game.league].push(game.finalResult.homeScore - game.finalResult.awayScore);
  }
  return Object.fromEntries(Object.entries(buckets).map(([league, margins]) => [league, avg(margins, 0)]));
}

function getFeatureAny(game: HistoricalGameRecord): any {
  return game.pregameSnapshot.features as any;
}

function getTeamContext(game: HistoricalGameRecord, side: "home" | "away") {
  return getFeatureAny(game).teamContext?.[side] || {};
}

function contextNumber(game: HistoricalGameRecord, side: "home" | "away", key: string, fallback: number): number {
  const value = Number(getTeamContext(game, side)?.[key]);
  return Number.isFinite(value) ? value : fallback;
}

function detectSpecialWorld(game: HistoricalGameRecord): SpecialWorldType[] {
  const start = new Date(game.startTime);
  const month = start.getUTCMonth() + 1;
  const types: SpecialWorldType[] = ["REGULAR_SEASON"];

  if (game.league === "NBA" && month >= 4 && month <= 6) types.push("PLAYOFF");
  if (game.league === "NHL" && month >= 4 && month <= 6) types.push("PLAYOFF");
  if (game.league === "MLB" && month >= 10) types.push("PLAYOFF");
  if (game.league === "NFL" && (month === 1 || month === 2)) types.push("PLAYOFF");
  if (game.league === "EPL" && month === 5) types.push("FINAL");

  return [...new Set(types)];
}

function buildPlayerPlaceholder(game: HistoricalGameRecord, side: "home" | "away", role: string): PlayerLivingState {
  const teamId = side === "home" ? game.homeTeamId : game.awayTeamId;
  const recentForm = contextNumber(game, side, "recentFormScore", 0.5);
  const restDays = contextNumber(game, side, "restDays", 3);
  const specialWorldPressure = detectSpecialWorld(game);
  const fatigueLevel = restDays <= 1 ? "HIGH" : restDays <= 2 ? "MEDIUM" : "LOW";

  return {
    teamId,
    role,
    biologicalState: {
      fatigueLevel,
      restSignal: `${restDays} rest days from current public corpus`,
      workloadSignal: "L1 public/team-context only; player workload not yet attached",
      advancedBodySignals: {},
    },
    psychologicalState: {
      confidenceSignal: recentForm >= 0.6 ? "recent team context supports confidence" : recentForm <= 0.4 ? "recent team context suggests pressure" : "neutral confidence signal",
      pressureSignal: specialWorldPressure.length > 1 ? "special-world pressure detected" : "regular-season pressure proxy only",
      roleStability: "UNKNOWN",
      specialWorldPressure,
    },
    eventStreakMemory: [],
    dailyIdentity: `${role} placeholder: V16 requires player-level data attachment before naming real player state`,
  };
}

function buildEventChains(game: HistoricalGameRecord): EventChainPotential[] {
  const homeForm = contextNumber(game, "home", "recentFormScore", 0.5);
  const awayForm = contextNumber(game, "away", "recentFormScore", 0.5);
  const homeRest = contextNumber(game, "home", "restDays", 3);
  const awayRest = contextNumber(game, "away", "restDays", 3);
  const chains: EventChainPotential[] = [];

  const homeCanRun = homeForm - awayForm > 0.12;
  const awayCanRun = awayForm - homeForm > 0.12;
  const fatigueSide: "HOME" | "AWAY" | undefined = homeRest < awayRest - 1 ? "HOME" : awayRest < homeRest - 1 ? "AWAY" : undefined;

  if (homeCanRun || awayCanRun) {
    const side = homeCanRun ? "HOME" : "AWAY";
    const vulnerableSide = side === "HOME" ? "AWAY" : "HOME";
    chains.push({
      direction: "MIRACLE",
      label: `${game.league} positive repeated-event chain`,
      trigger: "recent form gap from real historical team context",
      sequence: game.league === "MLB" ? ["patient at-bat", "walk/hit", "extra-base pressure", "bullpen stress"] : ["stop", "quick score", "forced mistake", "run pressure"],
      triggeringSide: side,
      vulnerableSide,
      likelyStopper: "timeout / pitching change / tactical adjustment / line change depending on sport",
      worldLineEffect: `${side} can turn a normal read into a pressure or miracle world line if the first chain is not stopped`,
      liveConfirmationSignal: "two or more same-direction events occur before the opponent stabilizes",
    });
  }

  if (fatigueSide) {
    const vulnerableSide = fatigueSide;
    const triggeringSide = fatigueSide === "HOME" ? "AWAY" : "HOME";
    chains.push({
      direction: "COLLAPSE",
      label: `${game.league} fatigue collapse chain`,
      trigger: "rest-day disadvantage from public corpus",
      sequence: ["late reaction", "defensive/offensive mistake", "second same-direction event", "coach forced to adjust"],
      triggeringSide,
      vulnerableSide,
      likelyStopper: "rotation change / timeout / conservative possession / bullpen or goalie intervention",
      worldLineEffect: `${vulnerableSide} has a repeated-event collapse entry if fatigue shows up early`,
      liveConfirmationSignal: "same side loses consecutive high-leverage or tempo-setting events",
    });
  }

  if (chains.length === 0) {
    chains.push({
      direction: "MIRACLE",
      label: `${game.league} neutral chain watch`,
      trigger: "no dominant L1 streak edge detected",
      sequence: ["first repeated event", "opponent response", "stabilization check"],
      triggeringSide: "BOTH",
      vulnerableSide: "BOTH",
      likelyStopper: "first tactical response",
      worldLineEffect: "The game needs live confirmation before Mosport upgrades a miracle or collapse world line",
      liveConfirmationSignal: "one side strings together at least three same-direction events",
    });
  }

  return chains;
}

function buildTeamLivingState(game: HistoricalGameRecord, side: "home" | "away", chains: EventChainPotential[]): TeamLivingState {
  const teamId = side === "home" ? game.homeTeamId : game.awayTeamId;
  const teamName = side === "home" ? game.homeTeamName || game.homeTeamId : game.awayTeamName || game.awayTeamId;
  const recentForm = contextNumber(game, side, "recentFormScore", 0.5);
  const restDays = contextNumber(game, side, "restDays", 3);
  const travelFatigue = contextNumber(game, side, "travelFatigue", 0.35);
  const rosterStability = contextNumber(game, side, "rosterStability", 0.65);
  const specialWorldPressure = detectSpecialWorld(game);

  const sideTag = side === "home" ? "HOME" : "AWAY";
  const teamChains = chains.filter((chain) => chain.triggeringSide === sideTag || chain.vulnerableSide === sideTag || chain.triggeringSide === "BOTH");

  return {
    teamId,
    teamName,
    biologicalState: {
      scheduleFatigue: restDays <= 1 ? "high short-rest risk" : restDays <= 2 ? "medium rest pressure" : "normal public rest proxy",
      travelLoad: travelFatigue >= 0.6 ? "travel fatigue amplified" : "travel fatigue not dominant in L1 corpus",
      rotationStress: "requires player/lineup attachment in V16 full engine",
      depthStress: "requires player/bench attachment in V16 full engine",
    },
    psychologicalState: {
      urgency: specialWorldPressure.length > 1 ? "special-world urgency must be reweighted" : "regular-season urgency proxy only",
      pressure: recentForm <= 0.4 ? "pressure from poor recent form" : recentForm >= 0.6 ? "confidence from recent form" : "neutral pressure proxy",
      emotionalTone: recentForm >= 0.6 ? "stable/rising" : recentForm <= 0.4 ? "fragile/pressured" : "balanced",
      specialWorldPressure,
    },
    playerStates: [
      buildPlayerPlaceholder(game, side, "Primary Creator / Core Player"),
      buildPlayerPlaceholder(game, side, "Defensive Anchor / Key Stopper"),
    ],
    eventStreakMemory: teamChains,
    dailyIdentity: `${teamName}: ${recentForm >= 0.6 ? "rising" : recentForm <= 0.4 ? "fragile" : "balanced"} team identity from L1 public corpus; player-level identity pending`,
  };
}

function buildEnvironment(game: HistoricalGameRecord): EnvironmentState {
  const specialWorldTypes = detectSpecialWorld(game);
  const isSpecial = specialWorldTypes.some((type) => type !== "REGULAR_SEASON");
  return {
    specialWorldTypes,
    venue: game.homeTeamName ? `${game.homeTeamName} home context` : "home venue context",
    physicalEnvironment: {},
    refereeOrUmpireEnvironment: {},
    scheduleContext: isSpecial ? "special-world schedule context detected by date/league heuristic" : "regular-season public schedule context",
    crowdContext: isSpecial ? "crowd and pressure must be reweighted for special world" : "standard home/away crowd proxy",
    marketNarrativeContext: "not attached in V16 doctrine baseline",
    worldLineAmplifiers: isSpecial ? ["special-world pressure", "shorter tolerance for mistakes", "coach rotation decisions may change"] : ["home/away context"],
    worldLineSuppressors: ["L2/L3 weather/referee/market feeds not attached"],
  };
}

function buildCollision(game: HistoricalGameRecord): MatchupCollision {
  const homeForm = contextNumber(game, "home", "recentFormScore", 0.5);
  const awayForm = contextNumber(game, "away", "recentFormScore", 0.5);
  const favoredSide = homeForm > awayForm + 0.05 ? "HOME" : awayForm > homeForm + 0.05 ? "AWAY" : "EVEN";
  return {
    playerMatchups: [
      {
        label: "Primary creator vs key stopper placeholder matchup",
        attackerSide: favoredSide === "AWAY" ? "AWAY" : "HOME",
        defenderSide: favoredSide === "AWAY" ? "HOME" : "AWAY",
        repeatedTargetRisk: "requires player-level matchup feed for full V16",
        worldLineEffect: "placeholder matchup identifies where V16 must attach player-on-player data before public claims",
      },
    ],
    teamMatchups: [
      {
        label: "Recent-form team collision from real historical corpus",
        favoredSide,
        worldLineEffect: favoredSide === "EVEN" ? "normal world line remains balanced without live chain confirmation" : `${favoredSide} has L1 momentum edge before environment and event chains`,
      },
    ],
  };
}

function buildWorldLines(game: HistoricalGameRecord, chains: EventChainPotential[], environment: EnvironmentState): WorldLineSimulation[] {
  const homeForm = contextNumber(game, "home", "recentFormScore", 0.5);
  const awayForm = contextNumber(game, "away", "recentFormScore", 0.5);
  const normalSide = homeForm >= awayForm ? "home" : "away";
  const opponentSide = normalSide === "home" ? "away" : "home";
  const normalName = normalSide === "home" ? game.homeTeamName || game.homeTeamId : game.awayTeamName || game.awayTeamId;
  const opponentName = opponentSide === "home" ? game.homeTeamName || game.homeTeamId : game.awayTeamName || game.awayTeamId;

  return [
    {
      type: "NORMAL",
      summary: `${normalName} owns the L1 normal world line through stronger public recent-form context.`,
      requiredConditions: ["tempo does not break", "no early repeated-event chain flips the game", "special-world pressure does not distort rotation or decision making"],
      eventChains: chains.filter((chain) => chain.direction === "MIRACLE"),
      environmentFactors: environment.worldLineAmplifiers,
      liveConfirmationSignals: ["normal side wins first repeated-event exchange", "opponent fails to string together consecutive pressure events"],
      liveInvalidationSignals: [`${opponentName} creates the first sustained repeated-event chain`, "fatigue or special-world pressure appears earlier than expected"],
    },
    {
      type: "MIRACLE",
      summary: "A miracle world line requires a positive repeated-event chain, not a random upset call.",
      requiredConditions: ["trigger side strings together same-direction events", "opponent response is late", "environment amplifies the chain"],
      eventChains: chains.filter((chain) => chain.direction === "MIRACLE"),
      environmentFactors: environment.worldLineAmplifiers,
      liveConfirmationSignals: chains.map((chain) => chain.liveConfirmationSignal),
      liveInvalidationSignals: ["first chain is stopped immediately", "opponent stabilizes through timeout/substitution/tactical change"],
    },
    {
      type: "COLLAPSE",
      summary: "A collapse world line requires negative repeated events that break one team's identity.",
      requiredConditions: ["vulnerable side loses consecutive events", "coach response does not stop the chain", "fatigue/pressure/environment compounds the mistake"],
      eventChains: chains.filter((chain) => chain.direction === "COLLAPSE"),
      environmentFactors: environment.worldLineAmplifiers,
      liveConfirmationSignals: ["same side suffers two or more connected mistakes", "rotation or tactical response arrives late"],
      liveInvalidationSignals: ["vulnerable side stops the first chain", "key player stabilizes the possession/inning/drive/shift"],
    },
  ];
}

function createRead(game: HistoricalGameRecord, baselineMargin: number): MosportReadV16 {
  const chains = buildEventChains(game);
  const home = buildTeamLivingState(game, "home", chains);
  const away = buildTeamLivingState(game, "away", chains);
  const environment = buildEnvironment(game);
  const collision = buildCollision(game);
  const worldLines = buildWorldLines(game, chains, environment);
  const homeForm = contextNumber(game, "home", "recentFormScore", 0.5);
  const awayForm = contextNumber(game, "away", "recentFormScore", 0.5);
  const homeEdge = (homeForm - awayForm) + baselineMargin / 100;
  const normalLean = Math.abs(homeEdge) < 0.03 ? "NO_LEAN" : homeEdge > 0 ? "HOME" : "AWAY";
  const keyMatchup = collision.teamMatchups[0]?.label || "Team collision pending";
  const miracleEntry = chains.find((chain) => chain.direction === "MIRACLE")?.worldLineEffect;
  const collapseEntry = chains.find((chain) => chain.direction === "COLLAPSE")?.worldLineEffect;
  const homeName = game.homeTeamName || game.homeTeamId;
  const awayName = game.awayTeamName || game.awayTeamId;
  const leanName = normalLean === "HOME" ? homeName : normalLean === "AWAY" ? awayName : "no side";

  return {
    matchId: game.matchId,
    isPregameOnly: true,
    generatedBeforeStart: true,
    doctrineVersion: "MOSPORT_WORLD_ENGINE_DOCTRINE_V1",
    normalLean,
    keyboardCoachSummary: normalLean === "NO_LEAN"
      ? `${awayName} @ ${homeName}: V16 doctrine baseline sees a balanced normal world line. The read depends on who creates the first repeated-event chain.`
      : `${awayName} @ ${homeName}: V16 doctrine baseline leans ${leanName}, but the read is only valid through the stated world-line, event-chain, and environment conditions.`,
    worldLines,
    keyMatchup,
    miracleEntry,
    collapseEntry,
    environmentRead: `${environment.specialWorldTypes.join("+")} context; ${environment.worldLineAmplifiers.join("; ")}`,
    liveConfirmationSignal: worldLines[0].liveConfirmationSignals[0] || "normal world line confirmation pending",
    liveInvalidationSignal: worldLines[0].liveInvalidationSignals[0] || "normal world line invalidation pending",
  };
}

function scoreRead(game: HistoricalGameRecord, read: MosportReadV16): V16PredictionRow {
  const predictedWinnerTeamId = read.normalLean === "HOME" ? game.homeTeamId : read.normalLean === "AWAY" ? game.awayTeamId : game.homeTeamId;
  const hit = predictedWinnerTeamId === game.finalResult.winnerTeamId;
  const missingAdvancedInputs = [
    "player-level availability feed",
    "player matchup tracking",
    "referee/umpire tendency feed",
    "weather/venue advanced feed where applicable",
    "sport-specific L2/L3 event logs",
  ];
  const doctrineCompleteness = 0.42;
  return {
    matchId: game.matchId,
    league: game.league,
    startTime: game.startTime,
    homeTeamName: game.homeTeamName,
    awayTeamName: game.awayTeamName,
    normalLean: read.normalLean,
    predictedWinnerTeamId,
    actualWinnerTeamId: game.finalResult.winnerTeamId,
    hit,
    confidenceProxy: read.normalLean === "NO_LEAN" ? 0.5 : 0.58,
    doctrineCompleteness,
    missingAdvancedInputs,
    keyMatchup: read.keyMatchup,
    miracleEntry: read.miracleEntry,
    collapseEntry: read.collapseEntry,
    environmentRead: read.environmentRead,
    keyboardCoachSummary: read.keyboardCoachSummary,
  };
}

function summarize(rows: V16PredictionRow[]) {
  const hits = rows.filter((row) => row.hit).length;
  const byLeague: Record<string, { games: number; hits: number; accuracy: number }> = {};
  for (const row of rows) {
    byLeague[row.league] ||= { games: 0, hits: 0, accuracy: 0 };
    byLeague[row.league].games += 1;
    byLeague[row.league].hits += row.hit ? 1 : 0;
  }
  for (const league of Object.keys(byLeague)) {
    byLeague[league].accuracy = byLeague[league].hits / byLeague[league].games;
  }
  return {
    games: rows.length,
    hits,
    misses: rows.length - hits,
    accuracy: rows.length ? hits / rows.length : 0,
    averageDoctrineCompleteness: avg(rows.map((row) => row.doctrineCompleteness), 0),
    byLeague,
  };
}

function toMarkdown(report: any): string {
  const pct = (value: number) => `${(value * 100).toFixed(2)}%`;
  const lines: string[] = [];
  lines.push("# Mosport V16 World Engine Doctrine Baseline Backtest");
  lines.push("");
  lines.push("## Method");
  lines.push("- Train/calibration: real completed 2020-2024 games.");
  lines.push("- Test: real completed 2025 games.");
  lines.push("- V16 doctrine shape: Player Living State + Team Living State + Environment + Collision + Event Chains + World Lines.");
  lines.push("- This is a doctrine baseline: it does not claim full player tracking, full L2/L3 data, or complete B2B data attachment.");
  lines.push("- Actual 2025 results are used only after the pregame read for scoring.");
  lines.push("");
  lines.push("## Overall");
  lines.push(`- Train records: ${report.trainRecords}`);
  lines.push(`- Test predictions: ${report.testRecords}`);
  lines.push(`- Accuracy: ${pct(report.summary.accuracy)}`);
  lines.push(`- Hits: ${report.summary.hits}`);
  lines.push(`- Misses: ${report.summary.misses}`);
  lines.push(`- Average doctrine completeness: ${pct(report.summary.averageDoctrineCompleteness)}`);
  lines.push("");
  lines.push("## By League");
  for (const [league, item] of Object.entries(report.summary.byLeague) as any) {
    lines.push(`- **${league}:** ${item.games} games, ${pct(item.accuracy)} accuracy`);
  }
  lines.push("");
  lines.push("## V16 Doctrine Boundary");
  lines.push("This report is not the final Mosport World Engine. It is the first reproducible V16-shaped baseline that forces every read through the doctrine contract.");
  lines.push("");
  lines.push("## Sample Keyboard Coach Reads");
  for (const row of report.sampleReads.slice(0, 10)) {
    lines.push(`- ${row.startTime} ${row.league} ${row.awayTeamName} @ ${row.homeTeamName}: ${row.keyboardCoachSummary}`);
  }
  lines.push("");
  lines.push("## Missing Advanced Inputs");
  for (const item of report.missingAdvancedInputSummary) {
    lines.push(`- ${item}`);
  }
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
  const reads = test.map((game) => createRead(game, baselines[game.league] || 0));
  const rows = test.map((game, index) => scoreRead(game, reads[index]));
  const summary = summarize(rows);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const missingAdvancedInputSummary = Array.from(new Set(rows.flatMap((row) => row.missingAdvancedInputs)));

  const report = {
    createdAt: new Date().toISOString(),
    engine: "Mosport V16 World Engine Doctrine Baseline",
    doctrineVersion: "MOSPORT_WORLD_ENGINE_DOCTRINE_V1",
    trainFile: args.train,
    testFile: args.test,
    trainSha256: sha256(args.train),
    testSha256: sha256(args.test),
    trainRecords: train.length,
    testRecords: test.length,
    summary,
    missingAdvancedInputSummary,
    sampleReads: rows.slice(0, 25),
    predictions: rows,
  };

  const jsonPath = path.join(args.output, `v16_world_engine_doctrine_backtest_${timestamp}.json`);
  const mdPath = path.join(args.output, `v16_world_engine_doctrine_backtest_${timestamp}.md`);
  const csvPath = path.join(args.output, `v16_world_engine_predictions_${timestamp}.csv`);

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, toMarkdown(report));
  fs.writeFileSync(
    csvPath,
    [
      "matchId,league,startTime,homeTeam,awayTeam,normalLean,actualWinner,hit,confidenceProxy,doctrineCompleteness,keyMatchup,environmentRead",
      ...rows.map((row) => [
        row.matchId,
        row.league,
        row.startTime,
        row.homeTeamName,
        row.awayTeamName,
        row.normalLean,
        row.actualWinnerTeamId,
        row.hit,
        row.confidenceProxy.toFixed(6),
        row.doctrineCompleteness.toFixed(6),
        row.keyMatchup,
        row.environmentRead,
      ].map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n") + "\n"
  );

  console.log("Mosport V16 World Engine doctrine baseline complete.");
  console.log(`Train records: ${train.length}`);
  console.log(`Test records: ${test.length}`);
  console.log(`Accuracy: ${(summary.accuracy * 100).toFixed(2)}%`);
  console.log(`Average doctrine completeness: ${(summary.averageDoctrineCompleteness * 100).toFixed(2)}%`);
  console.log(`Report JSON: ${jsonPath}`);
  console.log(`Report Markdown: ${mdPath}`);
  console.log(`Predictions CSV: ${csvPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
