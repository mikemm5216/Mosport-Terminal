import type { DataFreshnessAgentReport } from "../lib/agents/data-freshness/types";
import { DataFreshnessAgent } from "../lib/agents/data-freshness/DataFreshnessAgent";
import type { FreshnessIngestionSummary } from "../lib/agents/data-freshness/types";
import type { ProviderHealth } from "../lib/pipeline/types";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const API_KEY = process.env.MOSPORT_INTERNAL_API_KEY ?? "";
const USE_FIXTURE = process.argv.includes("--fixture");

const FIXTURE_NOW = new Date("2026-04-24T12:00:00.000Z");

const FIXTURE_PROVIDER_HEALTH: ProviderHealth[] = [
  {
    provider: "espn",
    league: "MLB",
    status: "healthy",
    lastSuccessAt: "2026-04-24T11:56:00.000Z",
    lastFailureAt: null,
    failureCount: 0,
    latencyMs: 220,
  },
  {
    provider: "sportradar",
    league: "MLB",
    status: "healthy",
    lastSuccessAt: "2026-04-24T11:54:00.000Z",
    lastFailureAt: null,
    failureCount: 1,
    latencyMs: 310,
  },
  {
    provider: "espn",
    league: "NBA",
    status: "degraded",
    lastSuccessAt: "2026-04-24T11:45:00.000Z",
    lastFailureAt: "2026-04-24T11:58:00.000Z",
    failureCount: 2,
    latencyMs: 420,
  },
  {
    provider: "sportradar",
    league: "NBA",
    status: "healthy",
    lastSuccessAt: "2026-04-24T11:46:00.000Z",
    lastFailureAt: null,
    failureCount: 0,
    latencyMs: 355,
  },
  {
    provider: "espn",
    league: "EPL",
    status: "down",
    lastSuccessAt: "2026-04-24T10:30:00.000Z",
    lastFailureAt: "2026-04-24T11:59:00.000Z",
    failureCount: 5,
    latencyMs: 900,
  },
  {
    provider: "sportradar",
    league: "EPL",
    status: "degraded",
    lastSuccessAt: "2026-04-24T11:10:00.000Z",
    lastFailureAt: "2026-04-24T11:57:00.000Z",
    failureCount: 2,
    latencyMs: 650,
  },
];

const FIXTURE_INGESTION_STATES: FreshnessIngestionSummary[] = [
  {
    provider: "HOT",
    sport: "baseball",
    league: "MLB",
    status: "success",
    currentPage: 1,
    retryCount: 0,
    lastRunAt: "2026-04-24T11:56:00.000Z",
  },
  {
    provider: "HOT",
    sport: "basketball",
    league: "NBA",
    status: "success",
    currentPage: 1,
    retryCount: 0,
    lastRunAt: "2026-04-24T11:45:00.000Z",
  },
  {
    provider: "HOT",
    sport: "football",
    league: "EPL",
    status: "failed",
    currentPage: 1,
    retryCount: 2,
    lastRunAt: "2026-04-24T10:50:00.000Z",
  },
];

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

function skip(label: string, reason: string) {
  console.log(`  SKIP ${label} :: ${reason}`);
}

function validateReport(report: DataFreshnessAgentReport) {
  if (report.agent === "DataFreshnessAgent") ok("report.agent");
  else ng("report.agent", String(report.agent));

  if (["live", "recent", "stale", "offline"].includes(report.freshness)) ok("report.freshness enum", report.freshness);
  else ng("report.freshness enum", report.freshness);

  if (typeof report.shouldTriggerIngest === "boolean") ok("report.shouldTriggerIngest boolean", String(report.shouldTriggerIngest));
  else ng("report.shouldTriggerIngest boolean");

  if (Array.isArray(report.providers)) ok("report.providers present", String(report.providers.length));
  else ng("report.providers present");

  if (Array.isArray(report.leagueReports) && report.leagueReports.length > 0) ok("report.leagueReports present", String(report.leagueReports.length));
  else ng("report.leagueReports present");

  for (const leagueReport of report.leagueReports) {
    if (["live", "recent", "stale", "offline"].includes(leagueReport.freshness)) ok(`${leagueReport.league} freshness`, leagueReport.freshness);
    else ng(`${leagueReport.league} freshness`, leagueReport.freshness);

    if (typeof leagueReport.shouldTriggerIngest === "boolean") ok(`${leagueReport.league} shouldTriggerIngest`);
    else ng(`${leagueReport.league} shouldTriggerIngest`);

    if (Array.isArray(leagueReport.providers)) ok(`${leagueReport.league} providers array`, String(leagueReport.providers.length));
    else ng(`${leagueReport.league} providers array`);

    if (Array.isArray(leagueReport.ingestionStates)) ok(`${leagueReport.league} ingestionStates array`, String(leagueReport.ingestionStates.length));
    else ng(`${leagueReport.league} ingestionStates array`);
  }
}

function validateFixtureExpectations(report: DataFreshnessAgentReport) {
  const byLeague = new Map(report.leagueReports.map((entry) => [entry.league, entry]));

  const mlb = byLeague.get("MLB");
  if (mlb?.freshness === "live") ok("fixture MLB freshness=live");
  else ng("fixture MLB freshness=live", mlb?.freshness);

  const nba = byLeague.get("NBA");
  if (nba?.freshness === "recent") ok("fixture NBA freshness=recent");
  else ng("fixture NBA freshness=recent", nba?.freshness);
  if (nba?.recommendedNextAction === "investigate_provider_health") ok("fixture NBA next action");
  else ng("fixture NBA next action", nba?.recommendedNextAction);

  const epl = byLeague.get("EPL");
  if (epl?.freshness === "offline") ok("fixture EPL freshness=offline");
  else ng("fixture EPL freshness=offline", epl?.freshness);
  if (epl?.recommendedNextAction === "investigate_provider_health") ok("fixture EPL next action");
  else ng("fixture EPL next action", epl?.recommendedNextAction);
}

function validateNoDbFallback(report: DataFreshnessAgentReport) {
  if (report.freshness === "offline") ok("no-db fallback freshness=offline");
  else ng("no-db fallback freshness=offline", report.freshness);

  if (report.shouldTriggerIngest === false) ok("no-db fallback shouldTriggerIngest=false");
  else ng("no-db fallback shouldTriggerIngest=false", String(report.shouldTriggerIngest));

  if (report.recommendedNextAction === "NO_DATA_SOURCE") ok("no-db fallback next action");
  else ng("no-db fallback next action", report.recommendedNextAction);

  if (Array.isArray(report.providers) && report.providers.length === 0) ok("no-db fallback providers empty");
  else ng("no-db fallback providers empty", String(report.providers.length));
}

async function checkDirectAgent() {
  console.log("\n[1] Direct agent run");
  const agent = USE_FIXTURE
    ? new DataFreshnessAgent({
        getProviderHealth: async () => FIXTURE_PROVIDER_HEALTH,
        getIngestionStates: async () => FIXTURE_INGESTION_STATES,
      })
    : new DataFreshnessAgent();

  const report = await agent.run({
    leagues: ["MLB", "NBA", "EPL"],
    now: USE_FIXTURE ? FIXTURE_NOW : undefined,
  });
  validateReport(report);
  if (USE_FIXTURE) {
    validateFixtureExpectations(report);
  } else if (!process.env.DATABASE_URL && !process.env.DATABASE_READ_URL) {
    validateNoDbFallback(report);
  }
}

async function checkRoute() {
  console.log("\n[2] Admin route");

  if (USE_FIXTURE) {
    skip("GET /api/admin/agents/freshness", "fixture mode only validates direct agent output");
    return;
  }

  if (!API_KEY) {
    skip("GET /api/admin/agents/freshness", "MOSPORT_INTERNAL_API_KEY not set");
    return;
  }

  const unauthorized = await fetch(`${BASE_URL}/api/admin/agents/freshness`).catch(() => null);
  if (unauthorized?.status === 401) ok("route unauthorized without key");
  else ng("route unauthorized without key", String(unauthorized?.status ?? "network error"));

  const res = await fetch(`${BASE_URL}/api/admin/agents/freshness?leagues=MLB,NBA,EPL`, {
    headers: { "x-api-key": API_KEY },
  }).catch(() => null);

  if (!res) {
    ng("route request", "network error");
    return;
  }

  if (res.ok) ok("route authorized request", String(res.status));
  else {
    ng("route authorized request", String(res.status));
    return;
  }

  const report = (await res.json()) as DataFreshnessAgentReport;
  validateReport(report);
}

async function main() {
  console.log(`DataFreshnessAgent v1 acceptance${USE_FIXTURE ? " [fixture]" : ""}`);
  try {
    await checkDirectAgent();
  } catch (err) {
    ng("direct agent fatal", err instanceof Error ? err.message : "unknown error");
  }

  try {
    await checkRoute();
  } catch (err) {
    ng("route fatal", err instanceof Error ? err.message : "unknown error");
  }

  console.log(`\n${passCount} passed | ${failCount} failed`);
  process.exit(failCount > 0 ? 1 : 0);
}

main();
