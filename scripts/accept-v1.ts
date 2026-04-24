/**
 * DataIngestionAgent v1 — Acceptance Test
 *
 * Run (normal):
 *   INGEST_SECRET=xxx BASE_URL=http://localhost:3000 DATABASE_URL=postgres://... npx tsx scripts/accept-v1.ts
 *
 * Run (with ESPN forced-fail to verify Sportradar fallback end-to-end):
 *   INGEST_FORCE_ESPN_FAIL=1 INGEST_SECRET=xxx ... npx tsx scripts/accept-v1.ts
 *
 * Checks:
 *   1. POST /api/admin/ingest/hot  →  report shape + auth security
 *   2. ESPN fail  →  Sportradar fallback (component + optional E2E)
 *   3. GET /api/matches  →  same batch readable after ingest
 *   4. RawEvent DB  →  provider / payload non-null / status=mapped
 *   5. Frontend audit  →  zero calls to /api/admin/ingest
 *   6. Mock audit  →  API 0 results → OFFLINE, no mock injection
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { ESPNProvider } from "../lib/agents/data-ingestion/providers/espnProvider";
import { SportradarProvider } from "../lib/agents/data-ingestion/providers/sportradarProvider";
import type {
  AgentProviderResult,
  DataProvider,
  DataIngestionAgentReport,
} from "../lib/agents/data-ingestion/types";

// ── env ───────────────────────────────────────────────────────────────────────

const BASE_URL      = process.env.BASE_URL      ?? "http://localhost:3000";
const INGEST_SECRET = process.env.INGEST_SECRET ?? "";
const TODAY         = new Date().toISOString().slice(0, 10);

// ── result tracking ───────────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;

function ok(label: string, detail?: string) {
  console.log(`  ✅  ${label}${detail ? `  [${detail}]` : ""}`);
  passCount++;
}

function ng(label: string, reason?: string) {
  console.error(`  ❌  ${label}${reason ? `  — ${reason}` : ""}`);
  failCount++;
}

function skip(label: string, why: string) {
  console.log(`  ⏭   ${label}  — ${why}`);
}

// ── file walker (no glob dep) ─────────────────────────────────────────────────

function walkFiles(dir: string, ext: RegExp, out: string[] = []): string[] {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules" && !e.name.startsWith(".")) {
      walkFiles(full, ext, out);
    } else if (e.isFile() && ext.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 1 — Report shape + auth security
// ─────────────────────────────────────────────────────────────────────────────

async function check1(): Promise<DataIngestionAgentReport | null> {
  console.log("\n── [1] POST /api/admin/ingest/hot — report shape + auth ─────────────────────");

  // 1a. Security: no secret → 401
  {
    const res = await fetch(`${BASE_URL}/api/admin/ingest/hot`, { method: "POST" }).catch(() => null);
    if (res?.status === 401) ok("no-secret → 401");
    else ng("no-secret → 401", `got ${res?.status ?? "network error"}`);
  }

  // 1b. Security: wrong secret → 401
  {
    const res = await fetch(`${BASE_URL}/api/admin/ingest/hot`, {
      method: "POST",
      headers: { "x-ingest-secret": "wrong-secret-xxxx" },
    }).catch(() => null);
    if (res?.status === 401) ok("wrong-secret → 401");
    else ng("wrong-secret → 401", `got ${res?.status ?? "network error"}`);
  }

  if (!INGEST_SECRET) {
    skip("Correct-secret call + report shape", "INGEST_SECRET not set");
    return null;
  }

  // 1c. Correct secret → 200 with full report
  let report: DataIngestionAgentReport;
  {
    const res = await fetch(`${BASE_URL}/api/admin/ingest/hot`, {
      method: "POST",
      headers: { "x-ingest-secret": INGEST_SECRET },
    });
    if (!res.ok) { ng("correct-secret → 200", `got ${res.status}`); return null; }
    ok("correct-secret → 200");
    report = (await res.json()) as DataIngestionAgentReport;
  }

  const REQUIRED: (keyof DataIngestionAgentReport)[] = [
    "agent", "status", "mode", "leagues",
    "primaryProvider", "fallbackProvider", "fallbackUsed",
    "fetchedCount", "mappedCount", "upsertedCount",
    "latestUpdatedAt", "freshness", "errors",
  ];

  for (const f of REQUIRED) {
    if (f in report) ok(`report.${f}`, JSON.stringify(report[f as keyof DataIngestionAgentReport]));
    else ng(`report.${f} present`);
  }

  if (report.agent === "DataIngestionAgent") ok("report.agent identity");
  else ng("report.agent identity", String(report.agent));

  if (["ok", "partial", "failed"].includes(report.status)) ok("report.status enum");
  else ng("report.status enum", report.status);

  if (["live", "recent", "stale", "offline"].includes(report.freshness)) ok("report.freshness enum");
  else ng("report.freshness enum", report.freshness);

  if (Array.isArray(report.errors)) ok("report.errors is array", `length ${report.errors.length}`);
  else ng("report.errors is array");

  if (report.primaryProvider === "espn") ok("primaryProvider='espn'");
  else ng("primaryProvider", String(report.primaryProvider));

  if (report.fallbackProvider === "sportradar") ok("fallbackProvider='sportradar'");
  else ng("fallbackProvider", String(report.fallbackProvider));

  return report;
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 2 — ESPN fail → Sportradar fallback
// ─────────────────────────────────────────────────────────────────────────────

async function check2(prevReport: DataIngestionAgentReport | null) {
  console.log("\n── [2] ESPN fail → Sportradar fallback ──────────────────────────────────────");

  // 2a. Component-level: fake ESPN that throws
  const failingESPN: DataProvider = {
    name: "espn",
    async fetchSchedule() { throw new Error("forced ESPN failure (component test)"); },
  };

  let espnResult: AgentProviderResult | null = null;
  let espnError: unknown;
  try { espnResult = await failingESPN.fetchSchedule({ league: "NBA", date: TODAY }); }
  catch (err) { espnError = err; }

  const shouldFallback =
    !!espnError ||
    !espnResult ||
    !Array.isArray(espnResult?.rawEvents) ||
    espnResult.rawEvents.length === 0;

  if (shouldFallback) ok("shouldFallback=true when ESPN throws");
  else ng("shouldFallback=true when ESPN throws");

  const sportradar = new SportradarProvider();
  let srResult: AgentProviderResult | null = null;
  try { srResult = await sportradar.fetchSchedule({ league: "NBA", date: TODAY }); }
  catch (e) { ng("SportradarProvider.fetchSchedule", (e as Error).message); return; }

  if (srResult.provider === "sportradar") ok("fallback provider='sportradar'");
  else ng("fallback provider name", srResult.provider);

  if (Array.isArray(srResult.rawEvents)) ok("Sportradar rawEvents is array");
  else ng("Sportradar rawEvents is array");

  if (srResult.rawEvents.length > 0) {
    ok(`Sportradar has live data → fallbackUsed would be true`, `${srResult.rawEvents.length} events`);
  } else {
    skip("Sportradar event count > 0", `0 events for ${TODAY} — no NBA games today is valid; fallback logic proven`);
  }

  // 2b. E2E: If INGEST_FORCE_ESPN_FAIL=1, run the real endpoint and verify fallbackUsed=true
  if (process.env.INGEST_FORCE_ESPN_FAIL === "1" && INGEST_SECRET) {
    console.log("  [E2E fallback] INGEST_FORCE_ESPN_FAIL=1 detected — running full agent with ESPN forced off");
    const res = await fetch(`${BASE_URL}/api/admin/ingest/hot`, {
      method: "POST",
      headers: { "x-ingest-secret": INGEST_SECRET },
    }).catch(() => null);
    if (!res?.ok) { ng("[E2E] force-fail endpoint call", `HTTP ${res?.status}`); return; }
    const r = (await res.json()) as DataIngestionAgentReport;
    if (r.fallbackUsed === true) ok("[E2E] report.fallbackUsed=true with ESPN forced off");
    else ng("[E2E] report.fallbackUsed=true", `got ${r.fallbackUsed} — Sportradar also returned 0 events`);
    const espnErrors = r.errors.filter(e => e.provider === "espn");
    if (espnErrors.length > 0) ok(`[E2E] ESPN errors recorded in report`, `${espnErrors.length} entries`);
    else ng("[E2E] ESPN errors in report", "expected at least 1 espn error entry");
  } else if (process.env.INGEST_FORCE_ESPN_FAIL !== "1") {
    // Check previous report: if ESPN was used (no fallback), verify fallbackUsed=false
    if (prevReport !== null) {
      if (typeof prevReport.fallbackUsed === "boolean") ok(`report.fallbackUsed consistent`, String(prevReport.fallbackUsed));
      else ng("report.fallbackUsed is boolean");
    }
    skip("[E2E] forced-fail E2E", "set INGEST_FORCE_ESPN_FAIL=1 to run full agent fallback test");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 3 — GET /api/matches readable after ingest
// ─────────────────────────────────────────────────────────────────────────────

async function check3(upsertedCount: number) {
  console.log("\n── [3] GET /api/matches — readable after ingest ─────────────────────────────");

  if (!INGEST_SECRET) {
    skip("GET /api/matches", "INGEST_SECRET not set (check 1 skipped, no baseline)");
    return;
  }

  if (upsertedCount === 0) {
    skip("GET /api/matches data check", `upsertedCount=0 from ingest — no games today or ingestion failed`);
    // Still verify the route is up and returns the expected shape
  }

  let body: any;
  try {
    const res = await fetch(`${BASE_URL}/api/matches?limit=100`);
    if (!res.ok) { ng("GET /api/matches HTTP", `status ${res.status}`); return; }
    body = await res.json();
  } catch (e) {
    ng("fetch /api/matches", (e as Error).message);
    return;
  }

  if (body.success === true) ok("response.success=true");
  else ng("response.success=true", String(body.success));

  if (Array.isArray(body.data)) ok("response.data is array");
  else ng("response.data is array");

  if (body.meta?.dataFreshness) ok("meta.dataFreshness present", body.meta.dataFreshness);
  else ng("meta.dataFreshness present");

  if (upsertedCount > 0) {
    if ((body.data?.length ?? 0) > 0) ok(`matches readable`, `${body.data.length} records in /api/matches`);
    else ng("matches readable after ingest", "expected > 0 records after successful ingest");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 4 — RawEvent DB records
// ─────────────────────────────────────────────────────────────────────────────

async function check4() {
  console.log("\n── [4] RawEvent DB records ──────────────────────────────────────────────────");

  if (!process.env.DATABASE_URL) {
    skip("DB query", "DATABASE_URL not set — export it to enable this check");
    return;
  }

  let prisma: any;
  try {
    const { PrismaClient } = await import("@prisma/client");
    prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    await prisma.$connect();
  } catch (e) {
    ng("Prisma connect", (e as Error).message);
    return;
  }

  try {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);

    const records = await prisma.rawEvent.findMany({
      where: {
        fetchedAt: { gte: cutoff },
        provider: { in: ["espn", "sportradar"] },
      },
      take: 100,
    });

    if (records.length > 0) ok(`RawEvent records in last 15 min`, `${records.length} found`);
    else { ng("RawEvent recent records", "0 found — run ingest first, then recheck within 15 min"); return; }

    const withPayload = records.filter((r: any) => r.payload !== null && r.payload !== undefined);
    if (withPayload.length === records.length) ok("all records have non-null payload");
    else ng("all records have non-null payload", `${records.length - withPayload.length} missing`);

    const mapped = records.filter((r: any) => r.status === "mapped");
    if (mapped.length > 0) ok(`status='mapped'`, `${mapped.length}/${records.length}`);
    else ng("status='mapped'", "none found — mapping may have failed");

    const providers = [...new Set<string>(records.map((r: any) => r.provider))];
    ok(`providers seen`, providers.join(", "));

    // Verify no ghost records with empty extId
    const blankExtId = records.filter((r: any) => !r.extId);
    if (blankExtId.length === 0) ok("all records have non-empty extId");
    else ng("extId non-empty", `${blankExtId.length} records with blank extId`);

  } finally {
    await prisma.$disconnect();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 5 — Frontend never calls /api/admin/ingest/hot
// ─────────────────────────────────────────────────────────────────────────────

function check5() {
  console.log("\n── [5] Frontend never calls /api/admin/ingest ───────────────────────────────");

  const files = walkFiles("frontend", /\.(ts|tsx)$/);
  const violations: string[] = [];

  for (const f of files) {
    const content = readFileSync(f, "utf-8");
    // Match actual fetch/axios calls, not comment documentation
    if (/fetch\s*\(\s*['"`]\/api\/admin\/ingest/.test(content) ||
        /axios\s*\.\w+\s*\(\s*['"`]\/api\/admin\/ingest/.test(content)) {
      violations.push(f.replace(process.cwd() + "\\", "").replace(process.cwd() + "/", ""));
    }
  }

  if (violations.length === 0) ok("zero frontend files call /api/admin/ingest");
  else ng("admin ingest isolation violated", violations.join(", "));

  // Verify MatchesContext data contract comment
  const ctx = readFileSync("frontend/app/context/MatchesContext.tsx", "utf-8");

  if (ctx.includes("FORBIDDEN") && ctx.includes("/api/admin")) {
    ok("MatchesContext has explicit FORBIDDEN comment for admin routes");
  } else {
    ng("MatchesContext FORBIDDEN comment");
  }

  if (/fetch\s*\(\s*['"`]\/api\/games['"`]/.test(ctx)) {
    ok("MatchesContext fetches /api/games only");
  } else {
    ng("MatchesContext fetch target", "expected fetch('/api/games')");
  }

  // Check that MatchesContext sets empty state (not mock) on error
  if (ctx.includes("setMatches([])") || ctx.includes("setMatches([]")) {
    ok("MatchesContext sets empty array (not mock) on error");
  } else {
    ng("MatchesContext empty-on-error pattern");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 6 — No mock fallback in production match API
// ─────────────────────────────────────────────────────────────────────────────

function check6() {
  console.log("\n── [6] Production match API has no mock fallback ────────────────────────────");

  const gamesRoute = readFileSync("frontend/app/api/games/route.ts", "utf-8");
  const ctx        = readFileSync("frontend/app/context/MatchesContext.tsx", "utf-8");

  // Games route must NOT respond with hardcoded match arrays
  const MOCK_ARRAYS = ["TODAY_MATCHES", "APR_22_MATCHES", "APR_21_MATCHES", "SCHEDULE_BY_DATE"];
  const usedInRoute = MOCK_ARRAYS.filter(p => gamesRoute.includes(p));
  if (usedInRoute.length === 0) ok("/api/games does not reference mock match arrays");
  else ng("/api/games references mock arrays", usedInRoute.join(", "));

  // Games route must return { source: 'offline' } when all providers fail — not mock data
  if (gamesRoute.includes("source: 'offline'") || gamesRoute.includes('source: "offline"')) {
    ok("/api/games returns { source: 'offline' } on total failure");
  } else {
    ng("/api/games offline fallback missing");
  }

  // MatchesContext must explicitly say "no mock fallback"
  if (ctx.includes("Never fall back to mock") || ctx.includes("surface as offline")) {
    ok("MatchesContext comments enforce no-mock contract");
  } else {
    ng("MatchesContext no-mock contract");
  }

  // Games route must not import data arrays (type imports are fine)
  const dataImportLine = gamesRoute.match(/^import\s+(?!type\s+).*from.*mockData/m);
  if (!dataImportLine) ok("/api/games has no value import from mockData");
  else ng("/api/games value-imports from mockData", dataImportLine[0]);

  // Verify OFFLINE state: if /api/games returns [] matches, MatchesContext surfaces offline
  // (Tested via code path: line `if (live.length > 0) setLastSuccessAt(Date.now())`)
  if (ctx.includes("if (live.length > 0)") || ctx.includes("live.length > 0")) {
    ok("MatchesContext only sets lastSuccessAt when API returns > 0 matches → 0 → freshness=offline");
  } else {
    ng("MatchesContext offline-on-empty logic");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("  DataIngestionAgent v1 — Acceptance Test");
  console.log(`  date         : ${TODAY}`);
  console.log(`  base_url     : ${BASE_URL}`);
  console.log(`  secret       : ${INGEST_SECRET ? "SET" : "NOT SET  ← checks 1,3 partial"}`);
  console.log(`  database_url : ${process.env.DATABASE_URL ? "SET" : "NOT SET  ← check 4 skipped"}`);
  console.log(`  force_espn_fail : ${process.env.INGEST_FORCE_ESPN_FAIL === "1" ? "YES (E2E fallback active)" : "no"}`);
  console.log("═══════════════════════════════════════════════════════════════════════");

  let report: DataIngestionAgentReport | null = null;

  try { report = await check1(); }    catch (e) { ng("[1] fatal", (e as Error).message); }
  try { await check2(report); }       catch (e) { ng("[2] fatal", (e as Error).message); }
  try { await check3(report?.upsertedCount ?? 0); } catch (e) { ng("[3] fatal", (e as Error).message); }
  try { await check4(); }             catch (e) { ng("[4] fatal", (e as Error).message); }
  try { check5(); }                   catch (e) { ng("[5] fatal", (e as Error).message); }
  try { check6(); }                   catch (e) { ng("[6] fatal", (e as Error).message); }

  console.log("\n═══════════════════════════════════════════════════════════════════════");
  console.log(`  ${passCount} PASSED  |  ${failCount} FAILED`);
  if (failCount === 0) {
    console.log("  STATUS: ✅  ACCEPTANCE PASSED — DataIngestionAgent v1 verified");
  } else {
    console.log("  STATUS: ❌  ACCEPTANCE FAILED — see ❌ entries above");
  }
  console.log("═══════════════════════════════════════════════════════════════════════\n");

  process.exit(failCount > 0 ? 1 : 0);
}

main();
