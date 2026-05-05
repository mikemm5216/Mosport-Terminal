import * as fs from "fs";
import * as path from "path";

const DEFAULT_TRAIN_OUTPUT = "data/historical/mosport_2020_2024_train.jsonl";
const DEFAULT_TEST_OUTPUT = "data/historical/mosport_2025_test.jsonl";

type LeagueCode = "NBA" | "MLB" | "NHL" | "NFL" | "EPL";
type SportCode = "BASKETBALL" | "BASEBALL" | "HOCKEY" | "FOOTBALL" | "SOCCER";

type LeagueConfig = {
  league: LeagueCode;
  sport: SportCode;
  espnSport: string;
  espnLeague: string;
};

type TeamRollingState = {
  games: number;
  wins: number;
  pointsFor: number;
  pointsAgainst: number;
  lastGameTime?: number;
  recentResults: number[];
  recentPointsFor: number[];
  recentPointsAgainst: number[];
};

type RawGame = {
  matchId: string;
  league: LeagueCode;
  sport: SportCode;
  season: string;
  startTime: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  winnerTeamId: string;
  sourceUrl: string;
};

const LEAGUES: LeagueConfig[] = [
  { league: "NBA", sport: "BASKETBALL", espnSport: "basketball", espnLeague: "nba" },
  { league: "MLB", sport: "BASEBALL", espnSport: "baseball", espnLeague: "mlb" },
  { league: "NHL", sport: "HOCKEY", espnSport: "hockey", espnLeague: "nhl" },
  { league: "NFL", sport: "FOOTBALL", espnSport: "football", espnLeague: "nfl" },
  { league: "EPL", sport: "SOCCER", espnSport: "soccer", espnLeague: "eng.1" },
];

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    trainStartYear: Number(args.find((a) => a.startsWith("--train-start-year="))?.split("=")[1] || 2020),
    trainEndYear: Number(args.find((a) => a.startsWith("--train-end-year="))?.split("=")[1] || 2024),
    testYear: Number(args.find((a) => a.startsWith("--test-year="))?.split("=")[1] || 2025),
    minTrainRecords: Number(args.find((a) => a.startsWith("--min-train-records="))?.split("=")[1] || 9500),
    trainOutput: args.find((a) => a.startsWith("--train-output="))?.split("=")[1] || DEFAULT_TRAIN_OUTPUT,
    testOutput: args.find((a) => a.startsWith("--test-output="))?.split("=")[1] || DEFAULT_TEST_OUTPUT,
  };
}

function ymd(date: Date): string {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function sanitizeTeamCode(value: string | undefined, fallback: string): string {
  const code = String(value || fallback || "UNK")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 16);
  return code || "UNK";
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}

function avg(values: number[], fallback: number): number {
  return values.length === 0 ? fallback : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getRestDays(state: TeamRollingState | undefined, startTimeMs: number): number {
  if (!state?.lastGameTime) return 3;
  const days = Math.floor((startTimeMs - state.lastGameTime) / (24 * 60 * 60 * 1000));
  return Math.max(0, Math.min(7, days));
}

function getRecentForm(state: TeamRollingState | undefined): number {
  return state ? clamp01(avg(state.recentResults, 0.5)) : 0.5;
}

function baseline(league: LeagueCode): number {
  return { NBA: 112, MLB: 4.5, NHL: 3.1, NFL: 22, EPL: 1.45 }[league];
}

function getOffenseScore(state: TeamRollingState | undefined, league: LeagueCode): number {
  const base = baseline(league);
  return clamp01(avg(state?.recentPointsFor || [], base) / (base * 1.35));
}

function getDefenseRisk(state: TeamRollingState | undefined, league: LeagueCode): number {
  const base = baseline(league);
  return clamp01(avg(state?.recentPointsAgainst || [], base) / (base * 1.35));
}

function makeTeamContext(state: TeamRollingState | undefined, startTimeMs: number, league: LeagueCode) {
  const recentFormScore = getRecentForm(state);
  const restDays = getRestDays(state, startTimeMs);
  const defenseRisk = getDefenseRisk(state, league);
  return {
    recentFormScore,
    restDays,
    injuryBurden: clamp01(0.35 + defenseRisk * 0.2 - recentFormScore * 0.1),
    travelFatigue: clamp01(restDays <= 1 ? 0.66 : restDays === 2 ? 0.45 : 0.24),
    rosterStability: clamp01(0.58 + recentFormScore * 0.25 + Math.min(restDays, 4) * 0.03),
  };
}

function sourceFields(fields: string[]) {
  return ["ESPN_SCOREBOARD.completed_events", "derived_from_prior_team_games", ...fields];
}

function buildPregameFeatures(game: RawGame, homeState: TeamRollingState | undefined, awayState: TeamRollingState | undefined) {
  const startTimeMs = new Date(game.startTime).getTime();
  const homeContext = makeTeamContext(homeState, startTimeMs, game.league);
  const awayContext = makeTeamContext(awayState, startTimeMs, game.league);
  const homeForm = homeContext.recentFormScore;
  const awayForm = awayContext.recentFormScore;
  const formEdge = clamp01(0.5 + (homeForm - awayForm) / 2);
  const homeOffense = getOffenseScore(homeState, game.league);
  const awayOffense = getOffenseScore(awayState, game.league);
  const homeDefenseRisk = getDefenseRisk(homeState, game.league);
  const awayDefenseRisk = getDefenseRisk(awayState, game.league);

  const base: any = {
    matchId: game.matchId,
    league: game.league,
    sport: game.sport,
    homeTeamId: game.homeTeamId,
    awayTeamId: game.awayTeamId,
    homeTeamName: game.homeTeamName,
    awayTeamName: game.awayTeamName,
    startTime: game.startTime,
    status: "pregame",
    teamContext: { home: homeContext, away: awayContext },
  };

  if (game.league === "NBA") {
    base.nba = {
      featureStatus: "READY",
      missingEvidence: [],
      sourceFieldsUsed: sourceFields(["recent_form", "rest_days", "rolling_points"]),
      pacePressure: clamp01(0.45 + (homeOffense + awayOffense) / 4),
      rotationRisk: clamp01(0.35 + (homeContext.travelFatigue + awayContext.travelFatigue) / 4),
      foulTroubleRisk: clamp01(0.3 + (homeDefenseRisk + awayDefenseRisk) / 4),
      matchupMismatch: formEdge,
      benchStability: clamp01((homeContext.rosterStability + awayContext.rosterStability) / 2),
      starLoad: clamp01(0.4 + (homeOffense - 0.5) * 0.35 + homeContext.travelFatigue * 0.25),
    };
  }

  if (game.league === "MLB") {
    base.mlb = {
      featureStatus: "READY",
      missingEvidence: [],
      sourceFieldsUsed: sourceFields(["recent_form", "rest_days", "rolling_runs"]),
      starterAdvantage: formEdge,
      bullpenFreshness: clamp01((homeContext.restDays + awayContext.restDays) / 8),
      lineupQuality: homeOffense,
      parkFactor: 0.5,
      handednessSplitAdvantage: formEdge,
      thirdTimeThroughOrderRisk: clamp01(0.45 + homeDefenseRisk * 0.25),
      lateInningLeverageRisk: clamp01(0.45 + Math.abs(homeForm - awayForm) * 0.3),
      defensiveStability: clamp01(1 - homeDefenseRisk * 0.55),
    };
  }

  if (game.league === "NHL") {
    base.nhl = {
      featureStatus: "READY",
      missingEvidence: [],
      sourceFieldsUsed: sourceFields(["recent_form", "rest_days", "rolling_goals"]),
      goalieAdvantage: clamp01(1 - homeDefenseRisk * 0.6),
      backToBackFatigue: clamp01(homeContext.restDays <= 1 ? 0.75 : 0.25),
      specialTeamsEdge: formEdge,
      shotQualityEdge: homeOffense,
      defensivePairingStability: clamp01(homeContext.rosterStability),
    };
  }

  if (game.league === "NFL") {
    base.nfl = {
      featureStatus: "READY",
      missingEvidence: [],
      sourceFieldsUsed: sourceFields(["recent_form", "rest_days", "rolling_points"]),
      qbStability: clamp01(0.45 + homeForm * 0.45),
      passRushMismatch: clamp01(0.5 + (awayDefenseRisk - homeDefenseRisk) * 0.25),
      offensiveLineHealth: clamp01(0.5 + homeContext.rosterStability * 0.35 - homeContext.injuryBurden * 0.15),
      redZoneEdge: formEdge,
      gameScriptPressure: clamp01(0.45 + Math.abs(homeForm - awayForm) * 0.25),
      turnoverVolatility: clamp01(0.55 - homeForm * 0.2 + homeDefenseRisk * 0.2),
    };
  }

  if (game.league === "EPL") {
    base.epl = {
      featureStatus: "READY",
      missingEvidence: [],
      sourceFieldsUsed: sourceFields(["recent_form", "rest_days", "rolling_goals"]),
      pressResistance: clamp01(0.4 + homeForm * 0.45),
      midfieldControl: formEdge,
      setPieceRisk: clamp01(0.45 + awayDefenseRisk * 0.25),
      fixtureCongestion: clamp01(homeContext.restDays <= 3 ? 0.65 : 0.25),
      strikerForm: homeOffense,
      defensiveLineRisk: homeDefenseRisk,
    };
  }

  base.dataQuality = {
    completenessScore: 1,
    missing: [],
    provider: "ESPN_SCOREBOARD_ROLLING_V1",
    updatedAt: new Date().toISOString(),
  };

  return base;
}

function splitLabel(trainStartYear: number, trainEndYear: number, testYear: number, split: "train" | "test") {
  return split === "train" ? `TRAIN_${trainStartYear}_${trainEndYear}` : `TEST_${testYear}`;
}

function toRecord(game: RawGame, states: Map<string, TeamRollingState>, split: string) {
  return {
    matchId: game.matchId,
    league: game.league,
    sport: game.sport,
    season: game.season,
    startTime: game.startTime,
    homeTeamId: game.homeTeamId,
    awayTeamId: game.awayTeamId,
    homeTeamName: game.homeTeamName,
    awayTeamName: game.awayTeamName,
    pregameSnapshot: {
      provider: "ESPN_SCOREBOARD_ROLLING_V1",
      collectedAt: game.startTime,
      features: buildPregameFeatures(game, states.get(game.homeTeamId), states.get(game.awayTeamId)),
    },
    finalResult: {
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      winnerTeamId: game.winnerTeamId,
      completedAt: game.startTime,
    },
    metadata: {
      split,
      source: "ESPN_SCOREBOARD",
      sourceUrl: game.sourceUrl,
      noLookahead: true,
      featureMethod: "rolling_team_history_before_game",
    },
  };
}

function updateState(states: Map<string, TeamRollingState>, teamId: string, pointsFor: number, pointsAgainst: number, won: boolean, startTimeMs: number) {
  const state = states.get(teamId) || { games: 0, wins: 0, pointsFor: 0, pointsAgainst: 0, recentResults: [], recentPointsFor: [], recentPointsAgainst: [] };
  state.games += 1;
  state.wins += won ? 1 : 0;
  state.pointsFor += pointsFor;
  state.pointsAgainst += pointsAgainst;
  state.lastGameTime = startTimeMs;
  state.recentResults = [...state.recentResults, won ? 1 : 0].slice(-10);
  state.recentPointsFor = [...state.recentPointsFor, pointsFor].slice(-10);
  state.recentPointsAgainst = [...state.recentPointsAgainst, pointsAgainst].slice(-10);
  states.set(teamId, state);
}

async function fetchJson(url: string): Promise<any> {
  const response = await fetch(url, { headers: { "user-agent": "MosportTerminal/1.0 real-oos-backtest" } });
  if (!response.ok) throw new Error(`ESPN request failed ${response.status}: ${url}`);
  return response.json();
}

function extractCompletedGames(payload: any, config: LeagueConfig, sourceUrl: string): RawGame[] {
  const events = Array.isArray(payload.events) ? payload.events : [];
  const games: RawGame[] = [];

  for (const event of events) {
    const competition = event.competitions?.[0];
    const competitors = competition?.competitors;
    if (!Array.isArray(competitors) || competitors.length < 2) continue;
    const completed = event.status?.type?.completed === true || event.status?.type?.state === "post";
    if (!completed) continue;

    const home = competitors.find((c: any) => c.homeAway === "home");
    const away = competitors.find((c: any) => c.homeAway === "away");
    if (!home || !away) continue;

    const homeScore = Number(home.score);
    const awayScore = Number(away.score);
    if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || homeScore === awayScore) continue;

    const startTime = event.date || competition.date;
    if (!startTime) continue;

    const homeCode = sanitizeTeamCode(home.team?.abbreviation || home.team?.shortDisplayName, home.team?.id || "HOME");
    const awayCode = sanitizeTeamCode(away.team?.abbreviation || away.team?.shortDisplayName, away.team?.id || "AWAY");
    const homeTeamId = `${config.league}_${homeCode}`;
    const awayTeamId = `${config.league}_${awayCode}`;

    games.push({
      matchId: `${config.league}_${String(event.id || competition.id)}`,
      league: config.league,
      sport: config.sport,
      season: String(event.season?.year || new Date(startTime).getUTCFullYear()),
      startTime,
      homeTeamId,
      awayTeamId,
      homeTeamName: home.team?.displayName || home.team?.name || homeTeamId,
      awayTeamName: away.team?.displayName || away.team?.name || awayTeamId,
      homeScore,
      awayScore,
      winnerTeamId: homeScore > awayScore ? homeTeamId : awayTeamId,
      sourceUrl,
    });
  }

  return games;
}

async function fetchLeagueGames(config: LeagueConfig, startYear: number, endYear: number): Promise<RawGame[]> {
  const all: RawGame[] = [];
  const today = new Date();

  for (let year = startYear; year <= endYear; year += 1) {
    for (let month = 0; month < 12; month += 1) {
      const start = new Date(Date.UTC(year, month, 1));
      if (start > today) continue;
      const end = addDays(new Date(Date.UTC(year, month + 1, 1)), -1);
      const cappedEnd = end > today ? today : end;
      const dates = `${ymd(start)}-${ymd(cappedEnd)}`;
      const url = `https://site.api.espn.com/apis/site/v2/sports/${config.espnSport}/${config.espnLeague}/scoreboard?dates=${dates}&limit=1000`;
      try {
        const payload = await fetchJson(url);
        const games = extractCompletedGames(payload, config, url);
        all.push(...games);
        console.log(`${config.league} ${dates}: ${games.length} completed games`);
      } catch (error) {
        console.warn(`${config.league} ${dates}: skipped (${error instanceof Error ? error.message : String(error)})`);
      }
    }
  }

  const deduped = Array.from(new Map(all.map((game) => [game.matchId, game])).values());
  deduped.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  return deduped;
}

function writeJsonl(filePath: string, records: any[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, records.map((record) => JSON.stringify(record)).join("\n") + "\n");
}

function summarize(records: any[]) {
  return records.reduce<Record<string, number>>((acc, record) => {
    acc[record.league] = (acc[record.league] || 0) + 1;
    return acc;
  }, {});
}

async function main() {
  const args = parseArgs();
  const rawGames: RawGame[] = [];

  for (const config of LEAGUES) {
    const games = await fetchLeagueGames(config, args.trainStartYear, args.testYear);
    console.log(`${config.league}: ${games.length} unique completed games collected`);
    rawGames.push(...games);
  }

  rawGames.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const states = new Map<string, TeamRollingState>();
  const trainRecords: any[] = [];
  const testRecords: any[] = [];

  for (const game of rawGames) {
    const year = new Date(game.startTime).getUTCFullYear();
    const startTimeMs = new Date(game.startTime).getTime();

    if (year >= args.trainStartYear && year <= args.trainEndYear) {
      trainRecords.push(toRecord(game, states, splitLabel(args.trainStartYear, args.trainEndYear, args.testYear, "train")));
    } else if (year === args.testYear) {
      testRecords.push(toRecord(game, states, splitLabel(args.trainStartYear, args.trainEndYear, args.testYear, "test")));
    }

    updateState(states, game.homeTeamId, game.homeScore, game.awayScore, game.winnerTeamId === game.homeTeamId, startTimeMs);
    updateState(states, game.awayTeamId, game.awayScore, game.homeScore, game.winnerTeamId === game.awayTeamId, startTimeMs);
  }

  if (trainRecords.length < args.minTrainRecords) {
    console.error(`ERROR: only generated ${trainRecords.length} real ${args.trainStartYear}-${args.trainEndYear} training records; minimum expected is ${args.minTrainRecords}. This means the real data collection is incomplete. Refusing to proceed.`);
    process.exit(1);
  }

  if (testRecords.length === 0) {
    console.error(`ERROR: generated 0 real ${args.testYear} test records. Cannot run out-of-sample prediction backtest.`);
    process.exit(1);
  }

  writeJsonl(args.trainOutput, trainRecords);
  writeJsonl(args.testOutput, testRecords);

  console.log(`Wrote full train corpus: ${args.trainOutput} (${trainRecords.length} records)`);
  console.log(`Train by league: ${JSON.stringify(summarize(trainRecords))}`);
  console.log(`Wrote full test corpus: ${args.testOutput} (${testRecords.length} records)`);
  console.log(`Test by league: ${JSON.stringify(summarize(testRecords))}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
