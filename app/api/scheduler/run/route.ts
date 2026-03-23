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
    // ⚔️ SECURITY AUDIT: Explicit Authorization Check (Fixes 403 Forbidden)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error("[SCHEDULER 403] Unauthorized access attempt.");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 1. 保留 prisma 查詢 (加入了使用者要求的 take: 100 + orderBy)
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

    // 2. 將完全同步改為小批次併發 (BATCH_SIZE = 5)
    for (let i = 0; i < upcomingMatches.length; i += BATCH_SIZE) {
      const batch = upcomingMatches.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (match) => {
          for (const [snapshotType, offsetMs] of Object.entries(TYPE_TO_MS)) {
            const targetSnapshotTime = new Date(match.match_date.getTime() - offsetMs);

            // snapshot 觸發條件
            if (now.getTime() >= targetSnapshotTime.getTime()) {
              
              // 3. 節流機制：避免瞬間 burst 打爆 API
              await new Promise((res) => setTimeout(res, 100));

              // 4. 為 fetch 加入 timeout (防止卡死)
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

                // 記錄結果
                results.push({
                  match_id: match.match_id,
                  snapshot_type: snapshotType,
                  status: res.status,
                });
              } catch (fetchError: any) {
                console.error(`Failed to trigger API for ${match.match_id} / ${snapshotType}:`, fetchError.message);
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
    console.error("Scheduler Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
