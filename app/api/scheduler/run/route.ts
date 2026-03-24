import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TYPE_TO_MS = {
  "T-24h": 24 * 60 * 60 * 1000,
  "T-6h": 6 * 60 * 60 * 1000,
  "T-1h": 1 * 60 * 60 * 1000,
  "T-10min": 10 * 60 * 1000,
} as const;

const BATCH_SIZE = 5;

export async function POST(request: Request) {
  try {
    // 🛡️ SECURITY AUDIT: Robust Authorization Check
    const authHeader = (request.headers.get('authorization') || '').trim();
    const secret = (process.env.CRON_SECRET || '').trim();
    const expected = `Bearer ${secret}`;
    
    console.log("ExpectedLen:", expected.length, "ReceivedLen:", authHeader.length);

    // Case-insensitive and whitespace-robust check
    if (authHeader.replace(/\s/g, '') !== expected.replace(/\s/g, '')) {
      console.error(`[AUTH_FAIL] Received len: ${authHeader.length}, Expected len: ${expected.length}`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 1. 保? prisma ?詢 (?入了使?者?求? take: 100 + orderBy)
    const upcomingMatches = await prisma.matches.findMany({
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

    // 2. 將�??��?步改?��??�次併發 (BATCH_SIZE = 5)
    for (let i = 0; i < upcomingMatches.length; i += BATCH_SIZE) {
      const batch = upcomingMatches.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (match) => {
          for (const [snapshotType, offsetMs] of Object.entries(TYPE_TO_MS)) {
            const targetSnapshotTime = new Date(match.match_date.getTime() - offsetMs);

            // snapshot 觸發條件
            if (now.getTime() >= targetSnapshotTime.getTime()) {
              
              // 3. 節流�??��??��??��? burst ?��? API
              await new Promise((res) => setTimeout(res, 100));

              // 4. ??fetch ?�入 timeout (?�止?�死)
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 5000);

              try {
                const res = await fetch(`${baseUrl}/api/snapshot/generate`, {
                  method: "POST",
                  headers: { 
                    "Content-Type": "application/json",
                    "authorization": `Bearer ${process.env.CRON_SECRET}` 
                  },
                  body: JSON.stringify({
                    match_id: match.match_id,
                    snapshot_type: snapshotType,
                  }),
                  signal: controller.signal,
                });

                // 記�?結�?
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
      success: true,
      message: "Scheduler run completed",
      processed_count: upcomingMatches.length,
      triggers: results
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Scheduler run failed" });
  }
}
