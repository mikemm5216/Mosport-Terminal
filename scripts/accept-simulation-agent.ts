import { SimulationAgent } from "../lib/agents/simulation/SimulationAgent";
import type { SimulationInput, SimulationReport } from "../lib/agents/simulation/types";

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
  else ng(label, `${String(actual)} != ${String(expected)}`);
}

function assertNotNull(label: string, value: unknown) {
  if (value !== null && value !== undefined) ok(label, JSON.stringify(value));
  else ng(label, "null or undefined");
}

function assertGt(label: string, actual: number, than: number) {
  if (actual > than) ok(label, `${actual} > ${than}`);
  else ng(label, `${actual} is not > ${than}`);
}

function assertArrayNotEmpty(label: string, arr: unknown[]) {
  if (arr.length > 0) ok(label, `length=${arr.length}`);
  else ng(label, "empty array");
}

const agent = new SimulationAgent();

const baseMatchups: SimulationInput["matchups"] = [
  {
    id: "m1",
    home: { id: "t1", code: "LAL", name: "Lakers", rating: 0.8, fatigue: 0.1 },
    away: { id: "t2", code: "GSW", name: "Warriors", rating: 0.5, fatigue: 0.2 },
  },
  {
    id: "m2",
    home: { id: "t3", code: "BOS", name: "Celtics", rating: 0.75 },
    away: { id: "t4", code: "MIA", name: "Heat", rating: 0.6 },
  },
];

console.log("SimulationAgent v1 acceptance\n");

// Test 1: runCount undefined → 10,000
{
  const report = agent.run({ league: "NBA", mode: "playoff", matchups: baseMatchups });
  assertEqual("1. runCount undefined → 10000", report.runCount, 10_000);
}

// Test 2: runCount 100 → 1,000
{
  const report = agent.run({ league: "NBA", mode: "playoff", runCount: 100, matchups: baseMatchups });
  assertEqual("2. runCount 100 → 1000", report.runCount, 1_000);
  assertEqual("2. runCountWasClamped true", report.diagnostics.runCountWasClamped, true);
}

// Test 3: runCount 10,000,000 → 100,000
{
  const report = agent.run({ league: "NBA", mode: "playoff", runCount: 10_000_000, matchups: baseMatchups });
  assertEqual("3. runCount 10000000 → 100000", report.runCount, 100_000);
  assertEqual("3. runCountWasClamped true", report.diagnostics.runCountWasClamped, true);
}

// Test 4: stronger home team → homeWinProbability > 0.5
{
  const report = agent.run({
    league: "NBA",
    mode: "single_matchup",
    matchups: [
      {
        id: "s1",
        home: { id: "h1", code: "STR", name: "Strong", rating: 0.9 },
        away: { id: "a1", code: "WEK", name: "Weak", rating: 0.3 },
      },
    ],
  });
  const result = report.matchupResults[0];
  assertGt("4. stronger home → homeWinProbability > 0.5", result!.homeWinProbability, 0.5);
}

// Test 5: titleDistribution exists and is non-empty
{
  const report = agent.run({ league: "NBA", mode: "playoff", seed: 42, matchups: baseMatchups });
  assertArrayNotEmpty("5. titleDistribution non-empty", report.titleDistribution);
}

// Test 6: projectedChampion exists
{
  const report = agent.run({ league: "NBA", mode: "playoff", seed: 42, matchups: baseMatchups });
  assertNotNull("6. projectedChampion exists", report.projectedChampion);
}

// Test 7: same seed gives same output
{
  const r1 = agent.run({ league: "NBA", mode: "playoff", seed: 7, matchups: baseMatchups });
  const r2 = agent.run({ league: "NBA", mode: "playoff", seed: 7, matchups: baseMatchups });
  const sameChampion = r1.projectedChampion?.teamId === r2.projectedChampion?.teamId;
  const sameTopProb =
    Math.abs((r1.titleDistribution[0]?.probability ?? 0) - (r2.titleDistribution[0]?.probability ?? 0)) < 1e-9;
  if (sameChampion && sameTopProb) ok("7. same seed → same output");
  else ng("7. same seed → same output", "results differed");
}

// Test 8: different seed can produce different distribution
{
  const matchups: SimulationInput["matchups"] = [
    {
      id: "x1",
      home: { id: "xa", code: "AAA", name: "TeamA", rating: 0.52 },
      away: { id: "xb", code: "BBB", name: "TeamB", rating: 0.48 },
    },
  ];
  const r1 = agent.run({ league: "EPL", mode: "season", seed: 1, runCount: 1_000, matchups });
  const r2 = agent.run({ league: "EPL", mode: "season", seed: 999999, runCount: 1_000, matchups });
  const probA1 = r1.titleDistribution.find((t) => t.teamId === "xa")?.probability ?? 0;
  const probA2 = r2.titleDistribution.find((t) => t.teamId === "xa")?.probability ?? 0;
  if (probA1 !== probA2) ok("8. different seed → can differ", `${probA1} vs ${probA2}`);
  else ng("8. different seed → can differ", `both produced same prob ${probA1}`);
}

// Test 9: diagnostics populated
{
  const report = agent.run({
    league: "UCL",
    mode: "playoff",
    seed: 42,
    matchups: baseMatchups,
  });
  const d = report.diagnostics;
  assertEqual("9. diagnostics.inputMatchupCount", d.inputMatchupCount, 2);
  assertEqual("9. diagnostics.uniqueTeamCount", d.uniqueTeamCount, 4);
  assertNotNull("9. diagnostics.notes array", d.notes);
  assertEqual("9. diagnostics.runCountWasClamped false", d.runCountWasClamped, false);
}

console.log(`\n${passCount} passed | ${failCount} failed`);
process.exit(failCount > 0 ? 1 : 0);
