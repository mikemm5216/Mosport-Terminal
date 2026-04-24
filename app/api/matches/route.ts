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
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const matches = await prismaRead.match.findMany({
      where: {
        match_date: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      take: limit,
      orderBy: { match_date: 'desc' },
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

    const freshness = getFreshness(latestUpdatedAt?.toISOString() ?? null);

    return NextResponse.json({
      success: true,
      status: "ok",
      data: matches,
      upcoming: matches, // Keep for legacy compatibility
      matches: matches,  // Keep for legacy compatibility
      meta: {
        lastUpdatedAt: latestUpdatedAt?.toISOString() ?? null,
        dataFreshness: freshness,
        sourceProvider: matches[0]?.sourceProvider || "unknown",
        fallbackUsed: matches.some(m => m.sourceProvider === "sportradar"),
        matchCount: matches.length
      }
    });

  } catch (error: any) {
    console.error("[api/matches] failed", error);

    return NextResponse.json({
      success: false,
      status: "error",
      message: "Failed to load matches",
      data: [],
      meta: {
          lastUpdatedAt: null,
          dataFreshness: "offline",
          sourceProvider: "unknown",
          fallbackUsed: false,
          matchCount: 0
      }
    }, { status: 500 });
  }
}
