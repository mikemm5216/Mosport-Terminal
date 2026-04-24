import { ValidationAgent } from "../lib/agents/validation/ValidationAgent";
import type { ValidationInput, ValidationReport } from "../lib/agents/validation/types";

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
  if (value !== null && value !== undefined) ok(label, String(value));
  else ng(label, "null");
}

const input: ValidationInput = {
  decisions: [
    { matchId: "m1", league: "NBA", label: "STRONG", action: "LEAN_HOME", confidence: 0.82 },
    { matchId: "m2", league: "NBA", label: "STRONG", action: "LEAN_AWAY", confidence: 0.77 },
    { matchId: "m3", league: "MLB", label: "UPSET", action: "UPSET_WATCH", confidence: 0.73 },
    { matchId: "m4", league: "MLB", label: "UPSET", action: "UPSET_WATCH", confidence: 0.68 },
    { matchId: "m5", league: "EPL", label: "CHAOS", action: "AVOID", confidence: 0.51 },
    { matchId: "m6", league: "UCL", label: "WEAK", action: "NO_ACTION", confidence: 0.34 },
  ],
  results: [
    { matchId: "m1", homeScore: 104, awayScore: 96, marketHomeProb: 0.58 },
    { matchId: "m2", homeScore: 110, awayScore: 102, marketHomeProb: 0.41 },
    { matchId: "m3", homeScore: 2, awayScore: 5, marketHomeProb: 0.7 },
    { matchId: "m4", homeScore: 4, awayScore: 1, marketHomeProb: 0.7 },
    { matchId: "m5", homeScore: 1, awayScore: 1, marketHomeProb: 0.52 },
    { matchId: "m6", homeScore: 3, awayScore: 0, marketHomeProb: 0.61 },
  ],
};

const agent = new ValidationAgent();
const report: ValidationReport = agent.run(input);

console.log("ValidationAgent v1 acceptance");

assertEqual("sampleSize", report.sampleSize, 6);
assertEqual("judgedSampleSize", report.judgedSampleSize, 4);
assertEqual("decisionCoverage", report.decisionCoverage, 0.6667);
assertEqual("overallAccuracy", report.overallAccuracy, 0.5);
assertEqual("strongAccuracy", report.strongAccuracy, 0.5);
assertEqual("upsetAccuracy", report.upsetAccuracy, 0.5);
assertEqual("upsetBaseRate", report.upsetBaseRate, 0.4);
assertEqual("upsetLift", report.upsetLift, 1.25);
assertEqual("chaos excluded", report.labelBreakdown.CHAOS.judgedCount, 0);
assertEqual("weak excluded", report.labelBreakdown.WEAK.judgedCount, 0);
assertNotNull("calibrationScore", report.calibrationScore);

assertEqual("STRONG count", report.labelBreakdown.STRONG.count, 2);
assertEqual("UPSET count", report.labelBreakdown.UPSET.count, 2);
assertEqual("CHAOS count", report.labelBreakdown.CHAOS.count, 1);
assertEqual("WEAK count", report.labelBreakdown.WEAK.count, 1);
assertEqual("NONE count", report.labelBreakdown.NONE.count, 0);

console.log(`\n${passCount} passed | ${failCount} failed`);
process.exit(failCount > 0 ? 1 : 0);
