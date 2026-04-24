import { DecisionPipelineAgent } from "../lib/agents/decision-pipeline/DecisionPipelineAgent";
import type {
  DecisionPipelineInput,
  DecisionPipelineReport,
} from "../lib/agents/decision-pipeline/types";

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

function assertGt(label: string, actual: number, than: number) {
  if (actual > than) ok(label, `${actual} > ${than}`);
  else ng(label, `${actual} is not > ${than}`);
}

function assertLt(label: string, actual: number, than: number) {
  if (actual < than) ok(label, `${actual} < ${than}`);
  else ng(label, `${actual} is not < ${than}`);
}

function assertNotNull(label: string, value: unknown) {
  if (value !== null && value !== undefined) ok(label, String(value));
  else ng(label, "null or undefined");
}

const agent = new DecisionPipelineAgent();

// ---------------------------------------------------------------------------
// Helpers — fixed timestamps so tests are deterministic
// ---------------------------------------------------------------------------
const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();

console.log("DecisionPipelineAgent v1 acceptance\n");

// ---------------------------------------------------------------------------
// Case 1 — STRONG + good validation → ACT
// NBA live, home leads 115-100 (gap=15 ≥ 10), score not showing fav trailing
// base confidence = clamp(0.75 + 15/100, 0,1) = 0.9
// trustMultiplier: (0.75+0.9*0.5) * (0.75+0.85*0.5) = 1.2 * 1.175 = 1.41 → clamped 1.25
// afterValidation = clamp(0.9 * 1.25, 0, 1) = 1.0
// finalConfidence = 1.0 >= 0.65 → ACT
// ---------------------------------------------------------------------------
{
  const input: DecisionPipelineInput = {
    match: {
      league: "NBA",
      homeTeam: "LAL",
      awayTeam: "DEN",
      status: "live",
      homeScore: 115,
      awayScore: 100,
      startsAt: twoHoursAgo,
      marketHomeProb: 0.6,
    },
    validationContext: {
      overallAccuracy: 0.9,
      upsetLift: null,
      decisionCoverage: 0.8,
      calibrationScore: 0.85,
    },
  };

  const report: DecisionPipelineReport = agent.run(input);

  assertEqual("C1: label", report.decision.label, "STRONG");
  assertGt("C1: finalConfidence >= 0.65", report.finalConfidence, 0.64);
  assertEqual("C1: recommendation", report.recommendation, "ACT");
  assertGt("C1: trustMultiplier > 1", report.validationContext.trustMultiplier, 1.0);
}

// ---------------------------------------------------------------------------
// Case 2 — UPSET + upsetLift high → WATCH
// NBA live, home is market favorite (0.7) but trailing 95-105 → UPSET
// base confidence = clamp(0.68 + |0.7-0.5|/2, 0,1) = clamp(0.78, 0,1) = 0.78
// trustMultiplier: upsetLift=1.5>1.2 → *1.08 → 1.08
// afterValidation = clamp(0.78 * 1.08, 0, 1) = 0.8424
// finalConfidence = 0.8424 >= 0.6 → WATCH
// ---------------------------------------------------------------------------
{
  const input: DecisionPipelineInput = {
    match: {
      league: "NBA",
      homeTeam: "LAL",
      awayTeam: "DEN",
      status: "live",
      homeScore: 95,
      awayScore: 105,
      startsAt: twoHoursAgo,
      marketHomeProb: 0.7,
    },
    validationContext: {
      overallAccuracy: null,
      upsetLift: 1.5,
      decisionCoverage: 0.5,
      calibrationScore: null,
    },
  };

  const report = agent.run(input);

  assertEqual("C2: label", report.decision.label, "UPSET");
  assertGt("C2: finalConfidence >= 0.6", report.finalConfidence, 0.59);
  assertEqual("C2: recommendation", report.recommendation, "WATCH");
  assertGt("C2: trustMultiplier > 1 (upsetLift boost)", report.validationContext.trustMultiplier, 1.0);
}

// ---------------------------------------------------------------------------
// Case 3 — CHAOS → AVOID
// NBA live, close score (gap≤3), started 3h ago (≥120min), no clear favorite
// marketHomeProb=0.5 → not clearly favoring either side, not isFavoriteTrailing
// → CHAOS, AVOID
// ---------------------------------------------------------------------------
{
  const input: DecisionPipelineInput = {
    match: {
      league: "NBA",
      homeTeam: "BOS",
      awayTeam: "MIA",
      status: "live",
      homeScore: 102,
      awayScore: 100,
      startsAt: threeHoursAgo,
      marketHomeProb: 0.5,
    },
  };

  const report = agent.run(input);

  assertEqual("C3: label", report.decision.label, "CHAOS");
  assertEqual("C3: recommendation", report.recommendation, "AVOID");
}

// ---------------------------------------------------------------------------
// Case 4 — WEAK → NO_ACTION
// NBA live, gap=5 (< 10 threshold), started 30 min ago (< 120 min), no clear fav trailing
// marketHomeProb=0.52 → not >= 0.55, not <= 0.45 → not isFavoriteTrailing
// → WEAK, NO_ACTION
// ---------------------------------------------------------------------------
{
  const input: DecisionPipelineInput = {
    match: {
      league: "NBA",
      homeTeam: "GSW",
      awayTeam: "PHX",
      status: "live",
      homeScore: 55,
      awayScore: 50,
      startsAt: thirtyMinutesAgo,
      marketHomeProb: 0.52,
    },
  };

  const report = agent.run(input);

  assertEqual("C4: label", report.decision.label, "WEAK");
  assertEqual("C4: recommendation", report.recommendation, "NO_ACTION");
}

// ---------------------------------------------------------------------------
// Case 5 — Simulation supports action → confidence increases
// LEAN_HOME (LAL leading 115-100) + champion = LAL → simAdjustment *= 1.05
// confidenceAfterSimulation > confidenceAfterValidation
// ---------------------------------------------------------------------------
{
  const input: DecisionPipelineInput = {
    match: {
      league: "NBA",
      homeTeam: "LAL",
      awayTeam: "DEN",
      status: "live",
      homeScore: 115,
      awayScore: 100,
      startsAt: twoHoursAgo,
      marketHomeProb: 0.6,
    },
    simulationContext: {
      projectedChampion: { teamId: "t1", code: "LAL", name: "Lakers", probability: 0.68 },
      matchupResults: [
        {
          matchupId: "m1",
          homeCode: "LAL",
          awayCode: "DEN",
          homeWinProbability: 0.72,
          awayWinProbability: 0.28,
        },
      ],
      titleDistribution: [
        { teamId: "t1", code: "LAL", name: "Lakers", probability: 0.68 },
        { teamId: "t2", code: "DEN", name: "Nuggets", probability: 0.32 },
      ],
    },
  };

  const report = agent.run(input);

  assertEqual("C5: action", report.decision.action, "LEAN_HOME");
  assertEqual("C5: championCode matches home", report.simulationContext.projectedChampionCode, "LAL");
  assertGt(
    "C5: confidenceAfterSimulation > confidenceAfterValidation",
    report.diagnostics.confidenceAfterSimulation,
    report.diagnostics.confidenceAfterValidation,
  );
  assertNotNull("C5: matchupConfidence populated", report.simulationContext.matchupConfidence);
}

// ---------------------------------------------------------------------------
// Case 6 — Simulation conflicts action → confidence decreases
// LEAN_HOME (LAL leading) but champion = DEN (away) → simAdjustment *= 0.95
// confidenceAfterSimulation < confidenceAfterValidation
// ---------------------------------------------------------------------------
{
  const input: DecisionPipelineInput = {
    match: {
      league: "NBA",
      homeTeam: "LAL",
      awayTeam: "DEN",
      status: "live",
      homeScore: 115,
      awayScore: 100,
      startsAt: twoHoursAgo,
      marketHomeProb: 0.6,
    },
    simulationContext: {
      projectedChampion: { teamId: "t2", code: "DEN", name: "Nuggets", probability: 0.65 },
      matchupResults: [
        {
          matchupId: "m1",
          homeCode: "LAL",
          awayCode: "DEN",
          homeWinProbability: 0.45,
          awayWinProbability: 0.55,
        },
      ],
      titleDistribution: [
        { teamId: "t2", code: "DEN", name: "Nuggets", probability: 0.65 },
        { teamId: "t1", code: "LAL", name: "Lakers", probability: 0.35 },
      ],
    },
  };

  const report = agent.run(input);

  assertEqual("C6: action", report.decision.action, "LEAN_HOME");
  assertEqual("C6: championCode is away team", report.simulationContext.projectedChampionCode, "DEN");
  assertLt(
    "C6: confidenceAfterSimulation < confidenceAfterValidation",
    report.diagnostics.confidenceAfterSimulation,
    report.diagnostics.confidenceAfterValidation,
  );
}

// ---------------------------------------------------------------------------
// Diagnostics completeness check
// ---------------------------------------------------------------------------
{
  const input: DecisionPipelineInput = {
    match: {
      league: "NBA",
      homeTeam: "LAL",
      awayTeam: "DEN",
      status: "live",
      homeScore: 115,
      awayScore: 100,
      startsAt: twoHoursAgo,
      marketHomeProb: 0.6,
    },
    validationContext: {
      overallAccuracy: 0.8,
      upsetLift: 1.3,
      decisionCoverage: 0.6,
      calibrationScore: 0.7,
    },
  };

  const report = agent.run(input);
  const d = report.diagnostics;

  assertNotNull("D: confidenceBeforeAdjustment", d.confidenceBeforeAdjustment);
  assertNotNull("D: confidenceAfterValidation", d.confidenceAfterValidation);
  assertNotNull("D: confidenceAfterSimulation", d.confidenceAfterSimulation);
  assertNotNull("D: appliedAdjustments array", d.appliedAdjustments);
  assertNotNull("D: notes array", d.notes);
  assertEqual("D: agent field", report.agent, "DecisionPipelineAgent");
}

console.log(`\n${passCount} passed | ${failCount} failed`);
process.exit(failCount > 0 ? 1 : 0);
