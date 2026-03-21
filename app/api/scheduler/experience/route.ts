import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BATCH_SIZE = 5;

export async function POST(request: Request) {
  try {
    const now = new Date();
    // 找出過去 24 小時內剛結束的比賽
    const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const finishedMatches = await prisma.matches.findMany({
      where: {
        match_date: {
          gt: past24h,
          lt: now,
        },
        home_score: { not: null },
        away_score: { not: null },
      },
      select: { match_id: true },
      take: 100, // 安全上限
    });

    const results: any[] = [];
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) throw new Error("BASE_URL is not defined in environment variables.");

    for (let i = 0; i < finishedMatches.length; i += BATCH_SIZE) {
      const batch = finishedMatches.slice(i, i + BATCH_SIZE);
      
      await Promise.all(
        batch.map(async (m) => {
          // 節流
          await new Promise(r => setTimeout(r, 100)); 
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);

          try {
            const res = await fetch(`${baseUrl}/api/experience/generate`, {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "authorization": `Bearer ${process.env.CRON_SECRET}` 
              },
              body: JSON.stringify({ match_id: m.match_id }),
              signal: controller.signal
            });
            results.push({ match_id: m.match_id, status: res.status });
          } catch (e: any) {
            results.push({ match_id: m.match_id, error: e.name === 'AbortError' ? 'Timeout' : e.message });
          } finally {
            clearTimeout(timeout);
          }
        })
      );
    }

    return NextResponse.json({ success: true, processed: finishedMatches.length, results }, { status: 200 });

  } catch (error: any) {
    console.error("Experience Scheduler Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
