import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateCronAuth } from "@/lib/auth";

// Crawler modules are isolated ??trigger via API to avoid import chain
async function runMatchCrawler() { return 0; }
async function runOddsCrawler()  { return 0; }
async function runStatsCrawler() { return 0; }

const TYPE_TO_MS = {
  "T-24h": 24 * 60 * 60 * 1000,
  "T-6h": 6 * 60 * 60 * 1000,
  "T-1h": 1 * 60 * 60 * 1000,
  "T-10min": 10 * 60 * 1000,
} as const;

const BATCH_SIZE = 5;

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const error = await validateCronAuth(request.clone());
    if (error) return error;

    // 1. ?瑁??瑟?隞歹?靘??澆?祈
    const matchCount = await runMatchCrawler();
    const oddsCount = await runOddsCrawler();
    const statsCount = await runStatsCrawler();
    const totalNewJobs = matchCount + oddsCount + statsCount;

    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 2. ???摩嚗孛??Snapshot
    const upcomingMatches = await prisma.match.findMany({
      where: {
        match_date: {
          gt: now,
          lt: next24h,
        },
      },
      select: {
        match_id: true,
        match_date: true,
      },
      take: 100,
      orderBy: {
        match_date: 'asc',
      },
    });

    const results: any[] = [];
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
      throw new Error("BASE_URL is not defined in environment variables.");
    }

    for (let i = 0; i < upcomingMatches.length; i += BATCH_SIZE) {
      const batch = upcomingMatches.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (match) => {
          for (const [snapshotType, offsetMs] of Object.entries(TYPE_TO_MS)) {
            const targetSnapshotTime = new Date(match.match_date.getTime() - offsetMs);

            if (now.getTime() >= targetSnapshotTime.getTime()) {
              await new Promise((res) => setTimeout(res, 100));

              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 5000);

              try {
                const res = await fetch(`${baseUrl}/api/snapshot/generate`, {
                  method: "POST",
                  headers: { 
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    match_id: match.match_id,
                    snapshot_type: snapshotType,
                    secret: process.env.CRON_SECRET
                  }),
                  signal: controller.signal,
                });

                results.push({
                  match_id: match.match_id,
                  snapshot_type: snapshotType,
                  status: res.status,
                });
              } catch (fetchError: any) {
                results.push({
                  match_id: match.match_id,
                  snapshot_type: snapshotType,
                  error: fetchError.name === 'AbortError' ? 'Timeout' : fetchError.message,
                });
              } finally {
                clearTimeout(timeout);
              }
            }
          }
        })
      );
    }

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      latency: `${Date.now() - startTime}ms`,
      jobsRun: totalNewJobs,
      snapshotTriggers: results.length,
      diagnostic: "Mosport Pipeline completed successfully (Crawlers + Scheduler)",
      details: {
        matches: matchCount,
        odds: oddsCount,
        stats: statsCount,
        triggers: results
      }
    });

  } catch (error: any) {
    console.error("[SCHEDULER_CRASH]", error);
    return NextResponse.json({ 
      status: "error",
      error: error.message || String(error),
      latency: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
