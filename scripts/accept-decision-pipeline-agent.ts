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

function assertIncludes(label: string, actual: string, expectedSubstring: string) {
  if (actual.includes(expectedSubstring)) ok(label, expectedSubstring);
  else ng(label, `"${expectedSubstring}" not found in "${actual}"`);
}

const agent = new DecisionPipelineAgent();
const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

console.log("DecisionPipelineAgent coach-mode acceptance\n");

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
  assertEqual("C1: decisionMode", report.decisionMode, "ATTACK");
  assertEqual("C1: teamState", report.teamState, "ADVANTAGE");
  assertEqual("C1: lineupAction", report.lineupAction, "ATTACK_MISMATCH");
  assertEqual("C1: worldState.teamState", report.worldState.teamState, "ADVANTAGE");
  assertEqual("C1: first player state", report.playerDecisions[0]?.state, "HOT");
  assertNotNull("C1: reason", report.reason);
  assertNotNull("C1: coachInsight", report.coachInsight);
  assertIncludes("C1: coachInsight mentions attack mismatch", report.coachInsight, "attack the mismatch");
}

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
  assertEqual("C2: decisionMode", report.decisionMode, "ADJUST");
  assertEqual("C2: teamState", report.teamState, "UNDER_PRESSURE");
  assertEqual("C2: lineupAction", report.lineupAction, "ADJUST_ROTATION");
  assertEqual("C2: worldState.teamState", report.worldState.teamState, "UNDER_PRESSURE");
  assertEqual("C2: first player coachAction", report.playerDecisions[0]?.coachAction, "REDUCE_MINUTES");
}

{
  const input: DecisionPipelineInput = {
    match: {
      league: "MLB",
      homeTeam: "NYY",
      awayTeam: "BOS",
      status: "live",
      homeScore: 4,
      awayScore: 1,
      startsAt: twoHoursAgo,
      marketHomeProb: 0.6,
    },
    validationContext: {
      overallAccuracy: 0.1,
      upsetLift: null,
      decisionCoverage: 0.6,
      calibrationScore: null,
    },
  };

  const report = agent.run(input);
  assertEqual("C2b: label", report.decision.label, "STRONG");
  assertEqual("C2b: decisionMode", report.decisionMode, "BENCH");
  assertEqual("C2b: teamState", report.teamState, "COLLAPSING");
  assertEqual("C2b: lineupAction", report.lineupAction, "BENCH_PLAYER");
  assertEqual("C2b: worldState.teamState", report.worldState.teamState, "COLLAPSING");
  assertEqual("C2b: first player state", report.playerDecisions[0]?.state, "COLLAPSE_RISK");
}

{
  const input: DecisionPipelineInput = {
    match: {
      league: "MLB",
      homeTeam: "NYY",
      awayTeam: "BOS",
      status: "live",
      homeScore: 4,
      awayScore: 1,
      startsAt: twoHoursAgo,
      marketHomeProb: 0.6,
    },
    validationContext: {
      overallAccuracy: 0,
      upsetLift: null,
      decisionCoverage: 0.6,
      calibrationScore: null,
    },
  };

  const report = agent.run(input);
  assertEqual("C2b2: label", report.decision.label, "STRONG");
  assertGt("C2b2: finalConfidence > 0.50", report.finalConfidence, 0.5);
  assertLt("C2b2: finalConfidence < 0.60", report.finalConfidence, 0.6);
  assertEqual("C2b2: decisionMode", report.decisionMode, "BENCH");
}

{
  const input: DecisionPipelineInput = {
    match: {
      league: "MLB",
      homeTeam: "NYY",
      awayTeam: "BOS",
      status: "live",
      homeScore: 4,
      awayScore: 1,
      startsAt: twoHoursAgo,
      marketHomeProb: 0.6,
    },
    validationContext: {
      overallAccuracy: 0,
      upsetLift: null,
      decisionCoverage: 0.1,
      calibrationScore: 0,
    },
  };

  const report = agent.run(input);
  assertEqual("C2b3: label", report.decision.label, "STRONG");
  assertLt("C2b3: finalConfidence < 0.50", report.finalConfidence, 0.5);
  assertEqual("C2b3: decisionMode", report.decisionMode, "BENCH");
}

{
  const input: DecisionPipelineInput = {
    match: {
      league: "MLB",
      homeTeam: "NYY",
      awayTeam: "BOS",
      status: "live",
      homeScore: 4,
      awayScore: 1,
      startsAt: twoHoursAgo,
      marketHomeProb: 0.6,
    },
    validationContext: {
      overallAccuracy: 0.54,
      upsetLift: null,
      decisionCoverage: 0.72,
      calibrationScore: 0,
    },
  };

  const report = agent.run(input);
  assertEqual("C2b3b: label", report.decision.label, "STRONG");
  assertGt("C2b3b: finalConfidence > 0.59", report.finalConfidence, 0.59);
  assertLt("C2b3b: finalConfidence < 0.65", report.finalConfidence, 0.65);
  assertEqual("C2b3b: decisionMode", report.decisionMode, "BENCH");
}

{
  const input: DecisionPipelineInput = {
    match: {
      league: "NBA",
      homeTeam: "LAL",
      awayTeam: "DEN",
      status: "live",
      homeScore: 110,
      awayScore: 100,
      startsAt: twoHoursAgo,
      marketHomeProb: 0.6,
    },
    validationContext: {
      overallAccuracy: 0.8,
      upsetLift: null,
      decisionCoverage: 0.72,
      calibrationScore: 0.85,
    },
  };

  const report = agent.run(input);
  assertEqual("C2b3c: label", report.decision.label, "STRONG");
  assertGt("C2b3c: finalConfidence > 0.70", report.finalConfidence, 0.7);
  assertEqual("C2b3c: decisionMode", report.decisionMode, "ATTACK");
}

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
      upsetLift: 1.2,
      decisionCoverage: 0.5,
      calibrationScore: null,
    },
  };

  const report = agent.run(input);
  assertEqual("C2b4: label", report.decision.label, "UPSET");
  assertEqual("C2b4: decisionMode", report.decisionMode, "ADJUST");
}

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
      upsetLift: 1.1,
      decisionCoverage: 0.5,
      calibrationScore: null,
    },
  };

  const report = agent.run(input);
  assertEqual("C2c: label", report.decision.label, "UPSET");
  assertEqual("C2c: decisionMode", report.decisionMode, "BENCH");
}

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
  assertEqual("C3: decisionMode", report.decisionMode, "KEEP");
  assertEqual("C3: teamState", report.teamState, "STABLE");
  assertEqual("C3: lineupAction", report.lineupAction, "KEEP_LINEUP");
  assertEqual("C3: worldState.teamState", report.worldState.teamState, "STABLE");
}

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
  assertEqual("C4: decisionMode", report.decisionMode, "BENCH");
}

{
  const input: DecisionPipelineInput = {
    match: {
      league: "NBA",
      homeTeam: "GSW",
      awayTeam: "PHX",
      status: "scheduled",
      homeScore: null,
      awayScore: null,
      startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
  };

  const report = agent.run(input);
  assertEqual("C4b: label", report.decision.label, "NONE");
  assertEqual("C4b: decisionMode", report.decisionMode, "KEEP");
  assertEqual("C4b: teamState", report.teamState, "STABLE");
  assertEqual("C4b: lineupAction", report.lineupAction, "KEEP_LINEUP");
}

{
  const input: DecisionPipelineInput = {
    match: {
      league: "NBA",
      homeTeam: "LAL",
      awayTeam: "DEN",
      status: "live",
      homeScore: 101,
      awayScore: 99,
      startsAt: twoHoursAgo,
      marketHomeProb: 0.55,
    },
    playerContext: {
      players: [
        { playerId: "p1", playerName: "Player 1", teamCode: "LAL", momentum: 0.42, fatigue: 0.61, pressure: 0.56 },
        { playerId: "p2", playerName: "Player 2", teamCode: "LAL", momentum: 0.47, fatigue: 0.58, pressure: 0.53 },
        { playerId: "p3", playerName: "Player 3", teamCode: "LAL", momentum: 0.56, fatigue: 0.39, pressure: 0.41 },
      ],
    },
  };

  const report = agent.run(input);
  assertEqual("T1: 2 FATIGUED -> teamState", report.teamState, "UNDER_PRESSURE");
  assertEqual("T1: 2 FATIGUED -> lineupAction", report.lineupAction, "ADJUST_ROTATION");
  assertEqual("T1: player1 state", report.playerDecisions[0]?.state, "FATIGUED");
  assertEqual("T1: player2 state", report.playerDecisions[1]?.state, "FATIGUED");
}

{
  const input: DecisionPipelineInput = {
    match: {
      league: "NBA",
      homeTeam: "LAL",
      awayTeam: "DEN",
      status: "live",
      homeScore: 101,
      awayScore: 99,
      startsAt: twoHoursAgo,
      marketHomeProb: 0.55,
    },
    playerContext: {
      players: [
        { playerId: "p4", playerName: "Player 4", teamCode: "LAL", momentum: 0.26, fatigue: 0.82, pressure: 0.72 },
        { playerId: "p5", playerName: "Player 5", teamCode: "LAL", momentum: 0.57, fatigue: 0.38, pressure: 0.42 },
        { playerId: "p6", playerName: "Player 6", teamCode: "LAL", momentum: 0.52, fatigue: 0.41, pressure: 0.45 },
      ],
    },
  };

  const report = agent.run(input);
  assertEqual("T2: 1 COLLAPSE_RISK -> teamState", report.teamState, "UNDER_PRESSURE");
  assertEqual("T2: 1 COLLAPSE_RISK -> lineupAction", report.lineupAction, "ADJUST_ROTATION");
  assertEqual("T2: player1 state", report.playerDecisions[0]?.state, "COLLAPSE_RISK");
}

{
  const input: DecisionPipelineInput = {
    match: {
      league: "NBA",
      homeTeam: "LAL",
      awayTeam: "DEN",
      status: "live",
      homeScore: 101,
      awayScore: 99,
      startsAt: twoHoursAgo,
      marketHomeProb: 0.55,
    },
    playerContext: {
      players: [
        { playerId: "p7", playerName: "Player 7", teamCode: "LAL", momentum: 0.24, fatigue: 0.83, pressure: 0.73 },
        { playerId: "p8", playerName: "Player 8", teamCode: "LAL", momentum: 0.22, fatigue: 0.79, pressure: 0.75 },
        { playerId: "p9", playerName: "Player 9", teamCode: "LAL", momentum: 0.5, fatigue: 0.4, pressure: 0.44 },
      ],
    },
  };

  const report = agent.run(input);
  assertEqual("T3: 2 COLLAPSE_RISK -> teamState", report.teamState, "COLLAPSING");
  assertEqual("T3: 2 COLLAPSE_RISK -> lineupAction", report.lineupAction, "BENCH_PLAYER");
  assertEqual("T3: player1 state", report.playerDecisions[0]?.state, "COLLAPSE_RISK");
  assertEqual("T3: player2 state", report.playerDecisions[1]?.state, "COLLAPSE_RISK");
  assertIncludes("T3: coachInsight mentions bench", report.coachInsight, "bench");
}

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
}

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
  assertNotNull("D: reason array", report.reason);
  assertNotNull("D: coachInsight", report.coachInsight);
  assertEqual("D: agent field", report.agent, "DecisionPipelineAgent");
}

console.log(`\n${passCount} passed | ${failCount} failed`);
process.exit(failCount > 0 ? 1 : 0);
