import { NextResponse } from 'next/server';
import { getPrismaRead } from '@/lib/db/read';

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function getFreshness(lastUpdatedAt: string | null): "live" | "recent" | "stale" | "offline" {
  if (!lastUpdatedAt) return "offline";
  const ageMs = Date.now() - new Date(lastUpdatedAt).getTime();
  const ageMin = ageMs / 1000 / 60;
  if (ageMin <= 5) return "live";
  if (ageMin <= 30) return "recent";
  if (ageMin <= 180) return "stale";
  return "offline";
}

export async function GET(req: Request) {
  try {
    const prismaRead = getPrismaRead();
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    let whereClause: any = {
      match_date: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Default: past 24h
      },
    };

    if (dateParam) {
      const startOfDay = new Date(`${dateParam}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateParam}T23:59:59.999Z`);
      whereClause = {
        match_date: { gte: startOfDay, lte: endOfDay }
      };
    }

    const matches = await prismaRead.match.findMany({
      where: whereClause,
      take: limit,
      orderBy: { match_date: 'asc' },
      include: {
        predictions: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const latestUpdatedAt = matches
      .map((m) => m.sourceUpdatedAt || m.updatedAt)
      .filter(Boolean)
      .sort((a, b) => b!.getTime() - a!.getTime())[0] ?? null;

    // OBSERVE DATA FLOW IN LOGS
    console.log("[api/matches] processing request", { 
      queryDate: dateParam || "sliding-24h", 
      found: matches.length, 
      latestUpdate: latestUpdatedAt?.toISOString() || "N/A"
    });

    const freshness = getFreshness(latestUpdatedAt?.toISOString() ?? null);

    return NextResponse.json({
      success: true,
      status: "ok",
      data: matches,
      // Supporting legacy consumers
      upcoming: matches,
      matches: matches,
      meta: {
        lastUpdatedAt: latestUpdatedAt?.toISOString() ?? null,
        dataFreshness: freshness,
        sourceProvider: matches[0]?.sourceProvider || "unknown",
        fallbackUsed: matches.some(m => m.sourceProvider === "sportradar"),
        matchCount: matches.length
      }
    });

  } catch (error: any) {
    console.error("[api/matches] FATAL DATA PATH ERROR:", error);
    return NextResponse.json({
      success: false,
      status: "error",
      data: [],
      meta: { lastUpdatedAt: null, dataFreshness: "offline", sourceProvider: "unknown", fallbackUsed: false, matchCount: 0 }
    }, { status: 500 });
  }
}
