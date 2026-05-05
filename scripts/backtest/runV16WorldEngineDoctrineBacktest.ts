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

type Side = "HOME" | "AWAY" | "BOTH";
type Lean = "HOME" | "AWAY" | "NO_LEAN";

type CoverageBreakdown = {
  doctrineFlowCoverage: number;
  dataDepthCompleteness: number;
  worldEngineReadiness: number;
  doctrineFlowBreakdown: Record<string, number>;
  dataDepthBreakdown: Record<string, number>;
};

type L1AvailabilityContext = {
  sourceLevel: "MISSING" | "TEAM_PROXY" | "ROLE_PROXY" | "PLAYER_FEED";
  homeAvailabilitySignal: string;
  awayAvailabilitySignal: string;
  validatedStartersAttached: boolean;
  validatedLineupsAttached: boolean;
  injuryFeedAttached: boolean;
  roleValidationAttached: boolean;
  leagueSpecificHook: string;
  leagueSpecificHookAttached: boolean;
  missingInputs: string[];
};

type V16PredictionRow = {
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
  doctrineCompleteness: number;
  doctrineFlowCoverage: number;
  dataDepthCompleteness: number;
  worldEngineReadiness: number;
  completenessBreakdown: Record<string, number>;
  doctrineFlowBreakdown: Record<string, number>;
  dataDepthBreakdown: Record<string, number>;
  availabilityContext: L1AvailabilityContext;
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

function sum(values: Record<string, number>): number {
  return Object.values(values).reduce((total, value) => total + value, 0);
}

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
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

function featureHas(game: HistoricalGameRecord, keys: string[]): boolean {
  let value: any = getFeatureAny(game);
  for (const key of keys) {
    if (!value || typeof value !== "object" || !(key in value)) return false;
    value = value[key];
  }
  return value !== undefined && value !== null;
}

function leagueKey(game: HistoricalGameRecord): string {
  return String(game.league).toLowerCase();
}

function detectSpecialWorld(game: HistoricalGameRecord): SpecialWorldType[] {
  const month = new Date(game.startTime).getUTCMonth() + 1;
  const types: SpecialWorldType[] = ["REGULAR_SEASON"];
  if (game.league === "NBA" && month >= 4 && month <= 6) types.push("PLAYOFF");
  if (game.league === "NHL" && month >= 4 && month <= 6) types.push("PLAYOFF");
  if (game.league === "MLB" && month >= 10) types.push("PLAYOFF");
  if (game.league === "NFL" && (month === 1 || month === 2)) types.push("PLAYOFF");
  if (game.league === "EPL" && month === 5) types.push("FINAL");
  return [...new Set(types)];
}

function leagueSpecificAvailabilityHook(league: string): string {
  if (league === "MLB") return "starting pitcher + bullpen usage + catcher/lineup order";
  if (league === "NHL") return "confirmed goalie + line combinations + defensive pairings";
  if (league === "NBA") return "injury report + starters + minutes restriction + rotation";
  if (league === "NFL") return "starting QB + OL availability + inactive list";
  if (league === "EPL") return "starting XI + formation + substitution load";
  return "league-specific starters and availability";
}

function buildAvailabilityContext(game: HistoricalGameRecord): L1AvailabilityContext {
  const features = getFeatureAny(game);
  const hasPlayerFeed = Boolean(features.playerAvailability || features.players || features.rosters);
  const hasLineups = Boolean(features.lineups || features.startingLineups || features.starters);
  const hasInjuries = Boolean(features.injuries || features.injuryReport);
  const hasRoleValidation = Boolean(features.roleValidation || features.validatedRoles);
  const leagueSpecificKeys: Record<string, string[]> = {
    MLB: ["startingPitcher", "probablePitchers", "bullpen"],
    NHL: ["goalie", "confirmedGoalie", "lineCombinations"],
    NBA: ["injuries", "minutes", "starters"],
    NFL: ["qb", "quarterback", "offensiveLine", "inactive"],
    EPL: ["startingXI", "formation", "lineups"],
  };
  const specificKeys = leagueSpecificKeys[game.league] || [];
  const leagueSpecificHookAttached = specificKeys.some((key) => Boolean(features[key] || features[leagueKey(game)]?.[key]));
  const sourceLevel: L1AvailabilityContext["sourceLevel"] = hasPlayerFeed ? "PLAYER_FEED" : hasLineups ? "ROLE_PROXY" : "TEAM_PROXY";
  const missingInputs: string[] = [];
  if (!hasPlayerFeed) missingInputs.push("real player-level availability feed");
  if (!hasLineups) missingInputs.push("lineup/starters feed with role validation");
  if (!hasInjuries) missingInputs.push("injury/minutes/inactive feed");
  if (!hasRoleValidation) missingInputs.push("role validation feed");
  if (!leagueSpecificHookAttached) missingInputs.push(`${game.league} ${leagueSpecificAvailabilityHook(game.league)} feed`);
  return {
    sourceLevel,
    homeAvailabilitySignal: hasPlayerFeed ? "player availability feed attached" : "team-level proxy only; do not name player state",
    awayAvailabilitySignal: hasPlayerFeed ? "player availability feed attached" : "team-level proxy only; do not name player state",
    validatedStartersAttached: hasLineups,
    validatedLineupsAttached: hasLineups,
    injuryFeedAttached: hasInjuries,
    roleValidationAttached: hasRoleValidation,
    leagueSpecificHook: leagueSpecificAvailabilityHook(game.league),
    leagueSpecificHookAttached,
    missingInputs,
  };
}

function sportPositiveSequence(league: string): string[] {
  if (league === "MLB") return ["patient at-bat", "walk or hard contact", "extra-base pressure", "bullpen stress"];
  if (league === "NBA") return ["defensive stop", "transition score", "corner three", "timeout pressure"];
  if (league === "NFL") return ["pressure on QB", "field-position swing", "explosive play", "red-zone pressure"];
  if (league === "NHL") return ["clean zone entry", "shot volume", "rebound pressure", "line-change trap"];
  if (league === "EPL") return ["press recovery", "final-third entry", "set-piece pressure", "second-ball pressure"];
  return ["first repeated event", "pressure event", "opponent response", "world-line shift"];
}

function sportCollapseSequence(league: string): string[] {
  if (league === "MLB") return ["chase at bad pitch", "strikeout/no-contact", "quick inning", "pressure carries forward"];
  if (league === "NBA") return ["live-ball turnover", "fastbreak allowed", "forced shot", "run expands"];
  if (league === "NFL") return ["sack or penalty", "third-and-long", "three-and-out", "short-field pressure"];
  if (league === "NHL") return ["failed zone exit", "extended shift", "rebound allowed", "goalie stress"];
  if (league === "EPL") return ["failed clearance", "second ball lost", "wide overload", "set-piece or shot pressure"];
  return ["late reaction", "mistake", "second mistake", "coach forced to adjust"];
}

function leagueEnvironmentAmplifiers(game: HistoricalGameRecord): string[] {
  const base = ["home/away context", "real completed historical corpus context"];
  if (game.league === "MLB") return [...base, "ballpark and bullpen context pending L2 attachment"];
  if (game.league === "NBA") return [...base, "rotation and pace context from L1 corpus"];
  if (game.league === "NFL") return [...base, "short-season pressure and field-position volatility"];
  if (game.league === "NHL") return [...base, "goalie/line-change sensitivity pending L2 attachment"];
  if (game.league === "EPL") return [...base, "match tempo and fixture-position sensitivity"];
  return base;
}

function buildPlayerPlaceholder(game: HistoricalGameRecord, side: "home" | "away", role: string): PlayerLivingState {
  const teamId = side === "home" ? game.homeTeamId : game.awayTeamId;
  const recentForm = contextNumber(game, side, "recentFormScore", 0.5);
  const restDays = contextNumber(game, side, "restDays", 3);
  const availability = buildAvailabilityContext(game);
  const specialWorldPressure = detectSpecialWorld(game);
  const fatigueLevel = restDays <= 1 ? "HIGH" : restDays <= 2 ? "MEDIUM" : "LOW";
  return {
    teamId,
    role,
    biologicalState: {
      fatigueLevel,
      restSignal: `${restDays} rest days from L1 public corpus`,
      workloadSignal: availability.validatedStartersAttached ? "lineup/starter feed attached" : "team-level role placeholder; player workload feed not attached yet",
      advancedBodySignals: {
        availabilitySource: availability.sourceLevel,
        validatedStartersAttached: availability.validatedStartersAttached,
        injuryFeedAttached: availability.injuryFeedAttached,
      },
    },
    psychologicalState: {
      confidenceSignal: recentForm >= 0.6 ? "team context supports confidence" : recentForm <= 0.4 ? "team context suggests pressure" : "neutral confidence signal",
      pressureSignal: specialWorldPressure.length > 1 ? "special-world pressure detected" : "regular-season pressure proxy only",
      roleStability: availability.roleValidationAttached ? "STABLE" : "UNKNOWN",
      specialWorldPressure,
    },
    eventStreakMemory: [],
    dailyIdentity: `${role}: ${availability.sourceLevel} identity; real player-specific claims require validated player feed`,
  };
}

function buildEventChains(game: HistoricalGameRecord): EventChainPotential[] {
  const homeForm = contextNumber(game, "home", "recentFormScore", 0.5);
  const awayForm = contextNumber(game, "away", "recentFormScore", 0.5);
  const homeRest = contextNumber(game, "home", "restDays", 3);
  const awayRest = contextNumber(game, "away", "restDays", 3);
  const chains: EventChainPotential[] = [];
  const formGap = homeForm - awayForm;
  const positiveSide: Side = Math.abs(formGap) > 0.08 ? (formGap > 0 ? "HOME" : "AWAY") : "BOTH";
  const vulnerableSide: Side = positiveSide === "HOME" ? "AWAY" : positiveSide === "AWAY" ? "HOME" : "BOTH";
  chains.push({
    direction: "MIRACLE",
    label: `${game.league} L1 positive event-chain entry`,
    trigger: Math.abs(formGap) > 0.08 ? "recent-form gap from real historical team context" : "balanced form; first live repeated event decides chain",
    sequence: sportPositiveSequence(game.league),
    triggeringSide: positiveSide,
    vulnerableSide,
    likelyStopper: "timeout / pitching change / tactical adjustment / line change depending on sport",
    worldLineEffect: `${positiveSide} can bend the normal world line if the first same-direction chain is not stopped`,
    liveConfirmationSignal: "two or more same-direction events occur before the opponent stabilizes",
  });
  const fatigueSide: Side | undefined = homeRest < awayRest - 1 ? "HOME" : awayRest < homeRest - 1 ? "AWAY" : undefined;
  chains.push({
    direction: "COLLAPSE",
    label: `${game.league} L1 collapse-chain watch`,
    trigger: fatigueSide ? "rest-day disadvantage from public corpus" : "no clear rest disadvantage; collapse requires live confirmation",
    sequence: sportCollapseSequence(game.league),
    triggeringSide: fatigueSide === "HOME" ? "AWAY" : fatigueSide === "AWAY" ? "HOME" : "BOTH",
    vulnerableSide: fatigueSide || "BOTH",
    likelyStopper: "rotation change / timeout / conservative possession / bullpen or goalie intervention",
    worldLineEffect: `${fatigueSide || "either side"} can break if repeated negative events stack before coaching response`,
    liveConfirmationSignal: "same side loses consecutive high-leverage or tempo-setting events",
  });
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
  const sideTag: Side = side === "home" ? "HOME" : "AWAY";
  const availability = buildAvailabilityContext(game);
  return {
    teamId,
    teamName,
    biologicalState: {
      scheduleFatigue: restDays <= 1 ? "high short-rest risk" : restDays <= 2 ? "medium rest pressure" : "normal public rest proxy",
      travelLoad: travelFatigue >= 0.6 ? "travel fatigue amplified" : "travel fatigue not dominant in L1 corpus",
      rotationStress: availability.validatedLineupsAttached ? "lineup/starter feed attached" : rosterStability < 0.6 ? "possible rotation instability from L1 proxy" : "rotation stable by L1 proxy; player feed pending",
      depthStress: availability.validatedLineupsAttached ? "depth can be derived from lineup feed" : "bench/depth details require lineup attachment in full V16",
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
      buildPlayerPlaceholder(game, side, availability.leagueSpecificHook),
    ],
    eventStreakMemory: chains.filter((chain) => chain.triggeringSide === sideTag || chain.vulnerableSide === sideTag || chain.triggeringSide === "BOTH" || chain.vulnerableSide === "BOTH"),
    dailyIdentity: `${teamName}: ${recentForm >= 0.6 ? "rising" : recentForm <= 0.4 ? "fragile" : "balanced"} L1 identity; availability=${availability.sourceLevel}; hook=${availability.leagueSpecificHook}`,
  };
}

function buildEnvironment(game: HistoricalGameRecord): EnvironmentState {
  const specialWorldTypes = detectSpecialWorld(game);
  const isSpecial = specialWorldTypes.some((type) => type !== "REGULAR_SEASON");
  return {
    specialWorldTypes,
    venue: game.homeTeamName ? `${game.homeTeamName} home context` : "home venue context",
    physicalEnvironment: { publicVenueKnown: Boolean(game.homeTeamName), advancedWeatherAttached: featureHas(game, ["weather"]) },
    refereeOrUmpireEnvironment: { attached: featureHas(game, ["officials"]) || featureHas(game, ["umpire"]) },
    scheduleContext: isSpecial ? "special-world date/league heuristic detected" : "regular-season public schedule context",
    crowdContext: isSpecial ? "crowd and pressure reweighted for special world" : "standard home/away crowd proxy",
    marketNarrativeContext: "not attached in V16.4 L1 data-depth baseline",
    worldLineAmplifiers: isSpecial ? [...leagueEnvironmentAmplifiers(game), "special-world pressure", "shorter tolerance for mistakes"] : leagueEnvironmentAmplifiers(game),
    worldLineSuppressors: ["L2/L3 weather/referee/market feeds not fully attached"],
  };
}

function buildCollision(game: HistoricalGameRecord): MatchupCollision {
  const homeForm = contextNumber(game, "home", "recentFormScore", 0.5);
  const awayForm = contextNumber(game, "away", "recentFormScore", 0.5);
  const availability = buildAvailabilityContext(game);
  const favoredSide: "HOME" | "AWAY" | "EVEN" = homeForm > awayForm + 0.05 ? "HOME" : awayForm > homeForm + 0.05 ? "AWAY" : "EVEN";
  const attackerSide = favoredSide === "AWAY" ? "AWAY" : "HOME";
  const defenderSide = attackerSide === "HOME" ? "AWAY" : "HOME";
  return {
    playerMatchups: [
      {
        label: `${game.league} ${availability.leagueSpecificHook} matchup hook`,
        attackerSide,
        defenderSide,
        repeatedTargetRisk: availability.leagueSpecificHookAttached ? "league-specific hook attached" : "real player-on-player tracking pending; L1 role matchup only",
        worldLineEffect: availability.leagueSpecificHookAttached ? "league-specific starter/role hook can influence collision layer" : "identifies where V16 must attach real player matchup data before public player-specific claims",
      },
    ],
    teamMatchups: [
      {
        label: `${game.league} team-form collision from real historical corpus`,
        favoredSide,
        worldLineEffect: favoredSide === "EVEN" ? "balanced normal world line until event chain confirms direction" : `${favoredSide} has L1 team-identity edge before event-chain and environment modifiers`,
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
      summary: `${normalName} owns the L1 normal world line through stronger public team-context memory.`,
      requiredConditions: ["tempo does not break", "first repeated-event chain does not flip the game", "special-world pressure does not distort rotation or decision making"],
      eventChains: chains.filter((chain) => chain.direction === "MIRACLE"),
      environmentFactors: environment.worldLineAmplifiers,
      liveConfirmationSignals: ["normal side wins first repeated-event exchange", "opponent fails to string together consecutive pressure events"],
      liveInvalidationSignals: [`${opponentName} creates the first sustained repeated-event chain`, "fatigue or special-world pressure appears earlier than expected"],
    },
    {
      type: "MIRACLE",
      summary: "Miracle world line means a positive repeated-event chain, not a random upset.",
      requiredConditions: ["trigger side strings together same-direction events", "opponent response is late", "environment amplifies the chain"],
      eventChains: chains.filter((chain) => chain.direction === "MIRACLE"),
      environmentFactors: environment.worldLineAmplifiers,
      liveConfirmationSignals: chains.filter((chain) => chain.direction === "MIRACLE").map((chain) => chain.liveConfirmationSignal),
      liveInvalidationSignals: ["first chain is stopped immediately", "opponent stabilizes through timeout/substitution/tactical change"],
    },
    {
      type: "COLLAPSE",
      summary: "Collapse world line means negative repeated events break one team's identity.",
      requiredConditions: ["vulnerable side loses consecutive events", "coach response does not stop the chain", "fatigue/pressure/environment compounds the mistake"],
      eventChains: chains.filter((chain) => chain.direction === "COLLAPSE"),
      environmentFactors: environment.worldLineAmplifiers,
      liveConfirmationSignals: chains.filter((chain) => chain.direction === "COLLAPSE").map((chain) => chain.liveConfirmationSignal),
      liveInvalidationSignals: ["vulnerable side stops the first chain", "key player stabilizes the possession/inning/drive/shift"],
    },
  ];
}

function calculateCoverage(game: HistoricalGameRecord, read: MosportReadV16, availability: L1AvailabilityContext): CoverageBreakdown {
  const feature = getFeatureAny(game);
  const homeContext = getTeamContext(game, "home");
  const awayContext = getTeamContext(game, "away");

  const doctrineFlowBreakdown: Record<string, number> = {
    historicalMemory: game.matchId && game.homeTeamId && game.awayTeamId && game.finalResult ? 0.12 : 0,
    teamLivingState: homeContext && awayContext && Object.keys(homeContext).length > 0 && Object.keys(awayContext).length > 0 ? 0.16 : 0.08,
    playerLivingStateL1: 0.08,
    environmentStateL1: read.environmentRead ? 0.12 : 0,
    matchupCollisionL1: read.keyMatchup ? 0.12 : 0,
    eventChainPotentialL1: read.miracleEntry || read.collapseEntry ? 0.14 : 0.07,
    worldLineSimulation: read.worldLines.length >= 3 ? 0.14 : 0.05,
    sportSpecificExtractor: feature?.[leagueKey(game)] ? 0.08 : 0.04,
  };

  const dataDepthBreakdown: Record<string, number> = {
    teamHistoryDepth: homeContext && awayContext && Object.keys(homeContext).length > 0 && Object.keys(awayContext).length > 0 ? 0.14 : 0.04,
    playerAvailabilityDepth: availability.sourceLevel === "PLAYER_FEED" ? 0.14 : availability.sourceLevel === "ROLE_PROXY" ? 0.07 : 0.03,
    lineupStarterDepth: availability.validatedStartersAttached ? 0.12 : 0.02,
    injuryMinutesInactiveDepth: availability.injuryFeedAttached ? 0.12 : 0.02,
    playerMatchupTrackingDepth: featureHas(game, ["matchups"]) || featureHas(game, ["playerMatchups"]) ? 0.12 : 0.02,
    environmentAdvancedDepth: featureHas(game, ["weather"]) || featureHas(game, ["venue"]) ? 0.10 : 0.03,
    refereeUmpireDepth: featureHas(game, ["officials"]) || featureHas(game, ["umpire"]) ? 0.08 : 0.01,
    sportSpecificL2Depth: availability.leagueSpecificHookAttached ? 0.16 : feature?.[leagueKey(game)] ? 0.06 : 0.02,
    eventLogDepth: featureHas(game, ["eventLog"]) || featureHas(game, ["plays"]) ? 0.12 : 0.03,
  };

  const doctrineFlowCoverage = clamp01(sum(doctrineFlowBreakdown));
  const dataDepthCompleteness = clamp01(sum(dataDepthBreakdown));
  const worldEngineReadiness = clamp01(doctrineFlowCoverage * 0.55 + dataDepthCompleteness * 0.45);

  return {
    doctrineFlowCoverage,
    dataDepthCompleteness,
    worldEngineReadiness,
    doctrineFlowBreakdown,
    dataDepthBreakdown,
  };
}

function createRead(game: HistoricalGameRecord, baselineMargin: number): MosportReadV16 {
  const chains = buildEventChains(game);
  buildTeamLivingState(game, "home", chains);
  buildTeamLivingState(game, "away", chains);
  const environment = buildEnvironment(game);
  const collision = buildCollision(game);
  const availability = buildAvailabilityContext(game);
  const worldLines = buildWorldLines(game, chains, environment);
  const homeForm = contextNumber(game, "home", "recentFormScore", 0.5);
  const awayForm = contextNumber(game, "away", "recentFormScore", 0.5);
  const homeRest = contextNumber(game, "home", "restDays", 3);
  const awayRest = contextNumber(game, "away", "restDays", 3);
  const homeEdge = (homeForm - awayForm) * 0.75 + ((homeRest - awayRest) / 7) * 0.15 + baselineMargin / 120;
  const normalLean: Lean = Math.abs(homeEdge) < 0.035 ? "NO_LEAN" : homeEdge > 0 ? "HOME" : "AWAY";
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
      ? `${awayName} @ ${homeName}: V16.4 sees a balanced L1 world line; ${availability.leagueSpecificHook} still needs deeper data before a player-specific read.`
      : `${awayName} @ ${homeName}: V16.4 leans ${leanName} through L1 team identity, event-chain, environment, and ${availability.leagueSpecificHook} hook; this is not a final player-tracking read.`,
    worldLines,
    keyMatchup: collision.playerMatchups[0]?.label || collision.teamMatchups[0]?.label || "Collision pending",
    miracleEntry: chains.find((chain) => chain.direction === "MIRACLE")?.worldLineEffect,
    collapseEntry: chains.find((chain) => chain.direction === "COLLAPSE")?.worldLineEffect,
    environmentRead: `${environment.specialWorldTypes.join("+")} context; ${environment.worldLineAmplifiers.join("; ")}`,
    liveConfirmationSignal: worldLines[0].liveConfirmationSignals[0] || "normal world line confirmation pending",
    liveInvalidationSignal: worldLines[0].liveInvalidationSignals[0] || "normal world line invalidation pending",
  };
}

function scoreRead(game: HistoricalGameRecord, read: MosportReadV16): V16PredictionRow {
  const predictedWinnerTeamId = read.normalLean === "HOME" ? game.homeTeamId : read.normalLean === "AWAY" ? game.awayTeamId : game.homeTeamId;
  const hit = predictedWinnerTeamId === game.finalResult.winnerTeamId;
  const availabilityContext = buildAvailabilityContext(game);
  const coverage = calculateCoverage(game, read, availabilityContext);
  const missingAdvancedInputs = Array.from(new Set([
    ...availabilityContext.missingInputs,
    "real player matchup tracking",
    "referee/umpire tendency feed",
    "weather/venue advanced feed where applicable",
    "sport-specific L2/L3 event logs",
  ]));
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
    confidenceProxy: read.normalLean === "NO_LEAN" ? 0.5 : 0.56 + coverage.worldEngineReadiness * 0.08,
    doctrineCompleteness: coverage.worldEngineReadiness,
    doctrineFlowCoverage: coverage.doctrineFlowCoverage,
    dataDepthCompleteness: coverage.dataDepthCompleteness,
    worldEngineReadiness: coverage.worldEngineReadiness,
    completenessBreakdown: coverage.doctrineFlowBreakdown,
    doctrineFlowBreakdown: coverage.doctrineFlowBreakdown,
    dataDepthBreakdown: coverage.dataDepthBreakdown,
    availabilityContext,
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
  const byLeague: Record<string, { games: number; hits: number; accuracy: number; doctrineFlowCoverage: number; dataDepthCompleteness: number; worldEngineReadiness: number }> = {};
  for (const row of rows) {
    byLeague[row.league] ||= { games: 0, hits: 0, accuracy: 0, doctrineFlowCoverage: 0, dataDepthCompleteness: 0, worldEngineReadiness: 0 };
    byLeague[row.league].games += 1;
    byLeague[row.league].hits += row.hit ? 1 : 0;
    byLeague[row.league].doctrineFlowCoverage += row.doctrineFlowCoverage;
    byLeague[row.league].dataDepthCompleteness += row.dataDepthCompleteness;
    byLeague[row.league].worldEngineReadiness += row.worldEngineReadiness;
  }
  for (const league of Object.keys(byLeague)) {
    byLeague[league].accuracy = byLeague[league].hits / byLeague[league].games;
    byLeague[league].doctrineFlowCoverage = byLeague[league].doctrineFlowCoverage / byLeague[league].games;
    byLeague[league].dataDepthCompleteness = byLeague[league].dataDepthCompleteness / byLeague[league].games;
    byLeague[league].worldEngineReadiness = byLeague[league].worldEngineReadiness / byLeague[league].games;
  }
  return {
    games: rows.length,
    hits,
    misses: rows.length - hits,
    accuracy: rows.length ? hits / rows.length : 0,
    averageDoctrineCompleteness: avg(rows.map((row) => row.worldEngineReadiness), 0),
    averageDoctrineFlowCoverage: avg(rows.map((row) => row.doctrineFlowCoverage), 0),
    averageDataDepthCompleteness: avg(rows.map((row) => row.dataDepthCompleteness), 0),
    averageWorldEngineReadiness: avg(rows.map((row) => row.worldEngineReadiness), 0),
    byLeague,
  };
}

function toMarkdown(report: any): string {
  const lines: string[] = [];
  lines.push("# Mosport V16.4 L1 Data Depth World Engine Backtest");
  lines.push("");
  lines.push("## Method");
  lines.push("- Train/calibration: real completed 2020-2024 games.");
  lines.push("- Test: real completed 2025 games.");
  lines.push("- V16.2 splits doctrine flow coverage from data depth completeness.");
  lines.push("- V16.3 adds L1 availability / lineup / starter attachment points without inventing missing data.");
  lines.push("- V16.4 adds league-specific starter/role hooks: MLB starting pitcher, NHL goalie, NBA injury/minutes/rotation, NFL QB/OL, EPL starting XI.");
  lines.push("- Missing L2/L3 and B2B inputs are reported explicitly.");
  lines.push("");
  lines.push("## Overall");
  lines.push(`- Train records: ${report.trainRecords}`);
  lines.push(`- Test predictions: ${report.testRecords}`);
  lines.push(`- Accuracy: ${pct(report.summary.accuracy)}`);
  lines.push(`- Hits: ${report.summary.hits}`);
  lines.push(`- Misses: ${report.summary.misses}`);
  lines.push(`- Doctrine flow coverage: ${pct(report.summary.averageDoctrineFlowCoverage)}`);
  lines.push(`- Data depth completeness: ${pct(report.summary.averageDataDepthCompleteness)}`);
  lines.push(`- World engine readiness: ${pct(report.summary.averageWorldEngineReadiness)}`);
  lines.push("");
  lines.push("## By League");
  for (const [league, item] of Object.entries(report.summary.byLeague) as any) {
    lines.push(`- **${league}:** ${item.games} games, ${pct(item.accuracy)} accuracy, ${pct(item.doctrineFlowCoverage)} flow coverage, ${pct(item.dataDepthCompleteness)} data depth, ${pct(item.worldEngineReadiness)} readiness`);
  }
  lines.push("");
  lines.push("## V16.2-V16.4 Boundary");
  lines.push("This report intentionally separates whether Mosport followed the constitutional analysis flow from whether Mosport has enough player-level, lineup, environment, referee, and sport-specific L2/L3 data. It does not invent missing feeds.");
  lines.push("");
  lines.push("## Sample Keyboard Coach Reads");
  for (const row of report.sampleReads.slice(0, 10)) {
    lines.push(`- ${row.startTime} ${row.league} ${row.awayTeamName} @ ${row.homeTeamName}: ${row.keyboardCoachSummary}`);
  }
  lines.push("");
  lines.push("## Missing Advanced Inputs");
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
  const reads = test.map((game) => createRead(game, baselines[game.league] || 0));
  const rows = test.map((game, index) => scoreRead(game, reads[index]));
  const summary = summarize(rows);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const missingAdvancedInputSummary = Array.from(new Set(rows.flatMap((row) => row.missingAdvancedInputs)));
  const report = {
    createdAt: new Date().toISOString(),
    engine: "Mosport V16.4 L1 Data Depth World Engine Baseline",
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

  const jsonPath = path.join(args.output, `v16_4_l1_data_depth_world_engine_backtest_${timestamp}.json`);
  const mdPath = path.join(args.output, `v16_4_l1_data_depth_world_engine_backtest_${timestamp}.md`);
  const csvPath = path.join(args.output, `v16_4_l1_data_depth_world_engine_predictions_${timestamp}.csv`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, toMarkdown(report));
  fs.writeFileSync(csvPath, [
    "matchId,league,startTime,homeTeam,awayTeam,normalLean,actualWinner,hit,confidenceProxy,doctrineFlowCoverage,dataDepthCompleteness,worldEngineReadiness,keyMatchup,environmentRead",
    ...rows.map((row) => [row.matchId, row.league, row.startTime, row.homeTeamName, row.awayTeamName, row.normalLean, row.actualWinnerTeamId, row.hit, row.confidenceProxy.toFixed(6), row.doctrineFlowCoverage.toFixed(6), row.dataDepthCompleteness.toFixed(6), row.worldEngineReadiness.toFixed(6), row.keyMatchup, row.environmentRead].map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n") + "\n");

  console.log("Mosport V16.4 L1 Data Depth World Engine baseline complete.");
  console.log(`Train records: ${train.length}`);
  console.log(`Test records: ${test.length}`);
  console.log(`Accuracy: ${(summary.accuracy * 100).toFixed(2)}%`);
  console.log(`Doctrine flow coverage: ${(summary.averageDoctrineFlowCoverage * 100).toFixed(2)}%`);
  console.log(`Data depth completeness: ${(summary.averageDataDepthCompleteness * 100).toFixed(2)}%`);
  console.log(`World engine readiness: ${(summary.averageWorldEngineReadiness * 100).toFixed(2)}%`);
  console.log(`Report JSON: ${jsonPath}`);
  console.log(`Report Markdown: ${mdPath}`);
  console.log(`Predictions CSV: ${csvPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
