import { LiveDecisionAgent } from "../lib/agents/live-decision/LiveDecisionAgent";
import type { LiveDecisionAgentInput, LiveDecisionAgentReport } from "../lib/agents/live-decision/types";

let passCount = 0;
let failCount = 0;

function ok(label: string, detail?: string) {
  console.log(`  OK ${label}${detail ? ` [${detail}]` : ""}`);
  passCount++;
}

function ng(label: string, reason?: string) {
  console.error(`  NG ${label}${reason ? ` :: ${reason}` : ""}`);
  failCount++;
}

function assertDecision(
  label: string,
  report: LiveDecisionAgentReport,
  expected: Partial<Pick<LiveDecisionAgentReport, "label" | "action">>,
) {
  if (expected.label && report.label === expected.label) ok(`${label} label`, report.label);
  else ng(`${label} label`, `${report.label} != ${expected.label}`);

  if (expected.action && report.action === expected.action) ok(`${label} action`, report.action);
  else ng(`${label} action`, `${report.action} != ${expected.action}`);

  if (Array.isArray(report.drivers) && report.drivers.length > 0) ok(`${label} drivers`, String(report.drivers.length));
  else ng(`${label} drivers`);

  if (typeof report.confidence === "number") ok(`${label} confidence`, String(report.confidence));
  else ng(`${label} confidence`);
}

const agent = new LiveDecisionAgent();

function runCase(label: string, input: LiveDecisionAgentInput, expected: Partial<Pick<LiveDecisionAgentReport, "label" | "action">>) {
  const report = agent.run(input, new Date("2026-04-24T12:00:00.000Z"));
  assertDecision(label, report, expected);
}

console.log("LiveDecisionAgent v1 acceptance");

runCase(
  "scheduled no signal",
  {
    league: "MLB",
    homeTeam: "LAD",
    awayTeam: "NYY",
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    startsAt: "2026-04-24T13:00:00.000Z",
  },
  { label: "NONE", action: "NO_ACTION" },
);

runCase(
  "home blowout",
  {
    league: "NBA",
    homeTeam: "BOS",
    awayTeam: "MIA",
    status: "live",
    homeScore: 112,
    awayScore: 91,
    startsAt: "2026-04-24T10:00:00.000Z",
  },
  { label: "STRONG", action: "LEAN_HOME" },
);

runCase(
  "away blowout",
  {
    league: "EPL",
    homeTeam: "CHE",
    awayTeam: "ARS",
    status: "closed",
    homeScore: 0,
    awayScore: 4,
    startsAt: "2026-04-24T09:30:00.000Z",
  },
  { label: "STRONG", action: "LEAN_AWAY" },
);

runCase(
  "favorite trailing",
  {
    league: "MLB",
    homeTeam: "ATL",
    awayTeam: "PHI",
    status: "live",
    homeScore: 1,
    awayScore: 4,
    startsAt: "2026-04-24T10:45:00.000Z",
    marketHomeProb: 0.64,
  },
  { label: "UPSET", action: "UPSET_WATCH" },
);

runCase(
  "close late game",
  {
    league: "NBA",
    homeTeam: "LAL",
    awayTeam: "DEN",
    status: "live",
    homeScore: 104,
    awayScore: 102,
    startsAt: "2026-04-24T09:00:00.000Z",
  },
  { label: "CHAOS", action: "AVOID" },
);

runCase(
  "unclear live game",
  {
    league: "UCL",
    homeTeam: "RMA",
    awayTeam: "MCI",
    status: "live",
    homeScore: 2,
    awayScore: 1,
    startsAt: "2026-04-24T11:20:00.000Z",
    signals: [{ label: "pressure", score: 0.4 }],
  },
  { label: "WEAK", action: "NO_ACTION" },
);

console.log(`\n${passCount} passed | ${failCount} failed`);
process.exit(failCount > 0 ? 1 : 0);
