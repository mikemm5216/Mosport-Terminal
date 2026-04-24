import { BacktestEngine } from "../lib/backtest/BacktestEngine";
import { ESPNHistoricalLoader } from "../lib/backtest/ESPNHistoricalLoader";
import { FixtureHistoricalLoader } from "../lib/backtest/FixtureHistoricalLoader";
import { PregameSignalFixtureLayer, buildSyntheticSignalBacktest } from "../lib/backtest/PregameSignalFixtureLayer";
import type { HistoricalMatch } from "../lib/backtest/types";

const T = {
  live60: { startsAt: "2026-01-01T10:00:00Z", snapshotAt: "2026-01-01T11:00:00Z" },
  late150: { startsAt: "2026-01-01T10:00:00Z", snapshotAt: "2026-01-01T12:30:00Z" },
  pre: { startsAt: "2026-01-01T20:00:00Z", snapshotAt: "2026-01-01T19:00:00Z" },
};

const MATCHES: HistoricalMatch[] = [
  {
    matchId: "m1", league: "NBA", homeTeam: "LAL", awayTeam: "DEN",
    status: "live", homeScore: 115, awayScore: 100,
    ...T.live60, marketHomeProb: 0.6,
    finalHomeScore: 118, finalAwayScore: 103,
  },
  {
    matchId: "m2", league: "NBA", homeTeam: "GSW", awayTeam: "CLE",
    status: "live", homeScore: 114, awayScore: 99,
    ...T.live60, marketHomeProb: 0.62,
    finalHomeScore: 112, finalAwayScore: 118,
  },
  {
    matchId: "m3", league: "EPL", homeTeam: "MCI", awayTeam: "ARS",
    status: "live", homeScore: 3, awayScore: 0,
    ...T.live60, marketHomeProb: 0.6,
    finalHomeScore: 3, finalAwayScore: 1,
  },
  {
    matchId: "m4", league: "MLB", homeTeam: "NYY", awayTeam: "BOS",
    status: "live", homeScore: 1, awayScore: 5,
    ...T.live60, marketHomeProb: 0.35,
    finalHomeScore: 2, finalAwayScore: 5,
  },
  {
    matchId: "m5", league: "NBA", homeTeam: "MIA", awayTeam: "PHX",
    status: "live", homeScore: 90, awayScore: 100,
    ...T.live60, marketHomeProb: 0.7,
    finalHomeScore: 95, finalAwayScore: 112,
  },
  {
    matchId: "m6", league: "EPL", homeTeam: "CHE", awayTeam: "LIV",
    status: "live", homeScore: 0, awayScore: 1,
    ...T.live60, marketHomeProb: 0.65,
    finalHomeScore: 2, finalAwayScore: 1,
  },
  {
    matchId: "m7", league: "NBA", homeTeam: "BOS", awayTeam: "MIL",
    status: "live", homeScore: 102, awayScore: 100,
    ...T.late150, marketHomeProb: 0.5,
    finalHomeScore: 104, finalAwayScore: 103,
  },
  {
    matchId: "m8", league: "MLB", homeTeam: "LAD", awayTeam: "SF",
    status: "live", homeScore: 3, awayScore: 2,
    startsAt: "2026-01-01T10:00:00Z", snapshotAt: "2026-01-01T10:30:00Z",
    marketHomeProb: 0.52,
    finalHomeScore: 5, finalAwayScore: 4,
  },
  {
    matchId: "m9", league: "NBA", homeTeam: "PHI", awayTeam: "NYK",
    status: "scheduled",
    ...T.pre,
    finalHomeScore: 115, finalAwayScore: 108,
  },
  {
    matchId: "m10", league: "EPL", homeTeam: "TOT", awayTeam: "NEW",
    status: "scheduled",
    ...T.pre,
    finalHomeScore: 2, finalAwayScore: 1,
  },
];

let passCount = 0;
let failCount = 0;

function ok(label: string, detail?: string) {
  console.log(`OK ${label}${detail ? ` [${detail}]` : ""}`);
  passCount++;
}

function ng(label: string, reason?: string) {
  console.error(`NG ${label}${reason ? ` :: ${reason}` : ""}`);
  failCount++;
}

function assertEqual<T>(label: string, actual: T, expected: T) {
  if (actual === expected) ok(label, String(actual));
  else ng(label, `got ${String(actual)}, want ${String(expected)}`);
}

function assertApprox(label: string, actual: number | null, expected: number, tol = 0.001) {
  if (actual === null) return ng(label, "null");
  if (Math.abs(actual - expected) <= tol) ok(label, `${actual} ~= ${expected}`);
  else ng(label, `got ${actual}, want ${expected} ±${tol}`);
}

function assertLte(label: string, a: number, b: number) {
  if (a <= b) ok(label, `${a} <= ${b}`);
  else ng(label, `${a} is not <= ${b}`);
}

function assertGte(label: string, a: number, b: number) {
  if (a >= b) ok(label, `${a} >= ${b}`);
  else ng(label, `${a} is not >= ${b}`);
}

function assertLt(label: string, a: number, b: number) {
  if (a < b) ok(label, `${a} < ${b}`);
  else ng(label, `${a} is not < ${b}`);
}

function assertNotNull(label: string, value: unknown) {
  if (value !== null && value !== undefined) ok(label, String(value));
  else ng(label, "null");
}

async function main() {
  const engine = new BacktestEngine();
  const { rows, report } = engine.run(MATCHES, {
    dataSource: "fixture",
    dateRange: { startDate: "2026-01-01", endDate: "2026-01-01" },
  });

  const loader = new FixtureHistoricalLoader();
  const fixtureMatches = await loader.loadCompletedMatches({
    leagues: ["NBA", "MLB", "EPL", "UCL"],
    startDate: "2025-11-01",
    endDate: "2026-04-24",
  });
  const limitedMatches = await loader.loadCompletedMatches({
    leagues: ["NBA", "MLB", "EPL", "UCL"],
    startDate: "2025-11-01",
    endDate: "2026-04-24",
    limit: 25,
  });
  const nbaOnlyMatches = await loader.loadCompletedMatches({
    leagues: ["NBA"],
    startDate: "2025-11-01",
    endDate: "2026-04-24",
  });
  const dateFilteredMatches = await loader.loadCompletedMatches({
    leagues: ["NBA", "MLB", "EPL", "UCL"],
    startDate: "2026-04-01",
    endDate: "2026-04-24",
  });
  const fixtureReport = engine.run(fixtureMatches, {
    dataSource: "fixture",
    dateRange: { startDate: "2025-11-01", endDate: "2026-04-24" },
  }).report;
  const espnLoader = new ESPNHistoricalLoader();
  const syntheticLayer = new PregameSignalFixtureLayer();
  const espnMatch = (espnLoader as unknown as {
    parseEvent: (league: "NBA", ev: unknown) => HistoricalMatch | null;
  }).parseEvent("NBA", {
    id: "test-espn-1",
    date: "2026-02-01T20:00:00Z",
    status: { type: { state: "post" } },
    competitions: [
      {
        competitors: [
          {
            homeAway: "home",
            score: "110",
            team: { abbreviation: "LAL" },
          },
          {
            homeAway: "away",
            score: "99",
            team: { abbreviation: "DEN" },
          },
        ],
      },
    ],
  });
  const syntheticInput: HistoricalMatch[] = [
    {
      matchId: "syn-1",
      league: "NBA",
      homeTeam: "LAL",
      awayTeam: "DEN",
      status: "scheduled",
      homeScore: null,
      awayScore: null,
      startsAt: "2026-02-01T20:00:00Z",
      snapshotAt: "2026-02-01T19:00:00Z",
      finalHomeScore: 112,
      finalAwayScore: 104,
    },
    {
      matchId: "syn-2",
      league: "EPL",
      homeTeam: "MCI",
      awayTeam: "ARS",
      status: "scheduled",
      homeScore: null,
      awayScore: null,
      startsAt: "2026-02-02T20:00:00Z",
      snapshotAt: "2026-02-02T19:00:00Z",
      finalHomeScore: 0,
      finalAwayScore: 1,
    },
    {
      matchId: "syn-3",
      league: "MLB",
      homeTeam: "NYY",
      awayTeam: "BOS",
      status: "scheduled",
      homeScore: null,
      awayScore: null,
      startsAt: "2026-02-03T20:00:00Z",
      snapshotAt: "2026-02-03T19:00:00Z",
      finalHomeScore: 3,
      finalAwayScore: 5,
    },
  ];
  const syntheticMatchesA = syntheticLayer.enrich(syntheticInput);
  const syntheticMatchesB = syntheticLayer.enrich(syntheticInput);
  const syntheticReport = buildSyntheticSignalBacktest(syntheticMatchesA, {
    dataSource: "espn",
    dateRange: { startDate: "2026-02-01", endDate: "2026-02-03" },
  }).report;

  console.log("BacktestEngine v1.5 acceptance\n");

  assertEqual("1. sampleSize", report.sampleSize, 10);
  assertLte("2. judgedSampleSize <= sampleSize", report.judgedSampleSize, report.sampleSize);
  assertEqual("2. judgedSampleSize", report.judgedSampleSize, 6);
  assertApprox("3. STRONG accuracy = 0.75", report.liveDecision.strongAccuracy, 0.75);
  assertEqual("3. STRONG label count", report.labelBreakdown.STRONG.count, 4);
  assertApprox("4. UPSET accuracy = 0.5", report.liveDecision.upsetAccuracy, 0.5);
  assertEqual("4. UPSET label count", report.labelBreakdown.UPSET.count, 2);
  assertEqual("5. CHAOS count", report.labelBreakdown.CHAOS.count, 1);
  assertEqual("5. judgedSampleSize unaffected by CHAOS", report.judgedSampleSize, 6);
  assertApprox("6. decisionCoverage = 0.6", report.liveDecision.decisionCoverage, 0.6);
  assertApprox("7. upsetBaseRate = 0.3333", report.liveDecision.upsetBaseRate, 0.3333);
  assertApprox("8. upsetLift = 1.5", report.liveDecision.upsetLift, 1.5);
  assertNotNull("9. live.overallAccuracy", report.liveDecision.overallAccuracy);
  assertNotNull("9. pipeline.overallAccuracy", report.pipelineDecision.overallAccuracy);
  assertNotNull("9. live.upsetLift", report.liveDecision.upsetLift);
  assertNotNull("9. pipeline.upsetLift", report.pipelineDecision.upsetLift);
  assertApprox("10. overall accuracy = 0.6667", report.liveDecision.overallAccuracy, 0.6667);
  assertEqual("11. WEAK count", report.labelBreakdown.WEAK.count, 1);
  assertEqual("12. NONE count", report.labelBreakdown.NONE.count, 2);
  assertNotNull("13. byLeague.NBA", report.byLeague["NBA"]);
  assertNotNull("14. byLeague.EPL", report.byLeague["EPL"]);
  assertNotNull("15. byLeague.MLB", report.byLeague["MLB"]);
  assertEqual("16. row count", rows.length, 10);

  const m2row = rows.find((row) => row.matchId === "m2");
  if (!m2row) {
    ng("17. m2 row exists", "missing");
  } else {
    assertEqual("17. m2 live label is STRONG", m2row.liveDecision.label, "STRONG");
    assertEqual("18. m2 actual winner", m2row.result.actualWinner, "AWAY");
  }

  const m1row = rows.find((row) => row.matchId === "m1");
  if (!m1row) {
    ng("19. m1 row exists", "missing");
  } else {
    assertEqual("19. pipeline label = live label (m1)", m1row.pipelineDecision.label, m1row.liveDecision.label);
    assertLt("20. pipeline finalConfidence reflects rolling context", m1row.pipelineDecision.finalConfidence, m1row.liveDecision.confidence);
  }

  assertApprox(
    "21. pipeline upsetBaseRate = live upsetBaseRate",
    report.pipelineDecision.upsetBaseRate ?? 0,
    report.liveDecision.upsetBaseRate ?? 0,
  );
  assertEqual("22. report.dataSource exists", report.dataSource, "fixture");
  assertEqual("23. report.dateRange.startDate exists", report.dateRange.startDate, "2026-01-01");
  assertEqual("24. report.dateRange.endDate exists", report.dateRange.endDate, "2026-01-01");
  assertEqual("25. report.sampleConfidence exists", report.sampleConfidence, "exploratory");
  assertGte("26. fixture sampleSize >= 100", fixtureReport.sampleSize, 100);
  assertEqual(
    "27. LOW_SAMPLE_SIZE note only when sampleSize < 100",
    fixtureReport.notes.includes("LOW_SAMPLE_SIZE: results are not statistically reliable"),
    false,
  );
  assertEqual("28. fixture loader respects limit", limitedMatches.length, 25);
  assertEqual(
    "29. fixture loader respects league filter",
    nbaOnlyMatches.every((match) => match.league === "NBA"),
    true,
  );
  assertEqual(
    "30. fixture loader respects date range",
    dateFilteredMatches.every((match) => {
      const date = match.startsAt.slice(0, 10);
      return date >= "2026-04-01" && date <= "2026-04-24";
    }),
    true,
  );
  assertEqual(
    "31. fixture loader returns valid final scores",
    fixtureMatches.every(
      (match) =>
        typeof match.finalHomeScore === "number" &&
        Number.isFinite(match.finalHomeScore) &&
        typeof match.finalAwayScore === "number" &&
        Number.isFinite(match.finalAwayScore),
    ),
    true,
  );
  assertEqual(
    "32. fixture note includes structural warning",
    fixtureReport.notes.includes("FIXTURE_DATA: structural validation only, not real edge proof."),
    true,
  );
  if (!espnMatch) {
    ng("33. espn parseEvent returns a match", "null");
  } else {
    assertEqual("33. espn status is scheduled", espnMatch.status, "scheduled");
    assertEqual("34. espn homeScore is null", espnMatch.homeScore ?? null, null);
    assertEqual("35. espn awayScore is null", espnMatch.awayScore ?? null, null);
    assertEqual("36. espn finalHomeScore is numeric", Number.isFinite(espnMatch.finalHomeScore), true);
    assertEqual("37. espn finalAwayScore is numeric", Number.isFinite(espnMatch.finalAwayScore), true);
  }
  const espnReport = engine.run([espnMatch ?? MATCHES[0]], {
    dataSource: "espn",
    dateRange: { startDate: "2026-02-01", endDate: "2026-02-01" },
  }).report;
  assertEqual(
    "38. espn report includes pregame note",
    espnReport.notes.includes("ESPN_PREGAME_MODE: ESPN historical scores are used only as final outcomes, not decision inputs."),
    true,
  );
  assertEqual(
    "39. synthetic layer marks signalSource",
    syntheticMatchesA.every((match) => match.signalSource === "synthetic_fixture"),
    true,
  );
  assertEqual(
    "40. synthetic layer preserves scheduled status and null scores",
    syntheticMatchesA.every(
      (match) => match.status === "scheduled" && match.homeScore === null && match.awayScore === null,
    ),
    true,
  );
  assertEqual(
    "41. synthetic layer is deterministic",
    JSON.stringify(syntheticMatchesA.map((match) => match.syntheticDecision)) ===
      JSON.stringify(syntheticMatchesB.map((match) => match.syntheticDecision)),
    true,
  );
  assertGte("42. synthetic report judgedSampleSize > 0", syntheticReport.judgedSampleSize, 1);
  if (syntheticReport.liveDecision.decisionCoverage === null) {
    ng("43. synthetic report decisionCoverage > 0", "null");
  } else {
    assertGte("43. synthetic report decisionCoverage > 0", syntheticReport.liveDecision.decisionCoverage, 0.0001);
  }
  assertEqual(
    "44. synthetic report includes warning",
    syntheticReport.notes.includes("SYNTHETIC_SIGNALS: used for structural decision-path testing only, not real performance proof."),
    true,
  );
  assertGte("45. synthetic pipeline judgedSampleSize > 0", syntheticReport.pipelineDecision.decisionCoverage ?? 0, 0.0001);
  assertEqual(
    "46. synthetic report includes rolling validation note",
    syntheticReport.notes.includes("PIPELINE_CONTEXT_ROLLING: validationContext is recomputed from prior backtest matches only, with no fixed bootstrap."),
    true,
  );

  console.log(`\n${passCount} passed | ${failCount} failed`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown acceptance error");
  process.exit(1);
});
