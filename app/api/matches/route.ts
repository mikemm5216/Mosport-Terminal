import { NextResponse } from 'next/server';
import { getPrismaRead } from '@/lib/db/read';

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const prismaRead = getPrismaRead();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    // Fetch matches directly using the read-only client
    // We use raw query or findMany based on the actual schema requirements
    // For V2 decision flow, we prioritize recent matches (+/- 24h)
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

    return NextResponse.json({
      success: true,
      status: "ok",
      upcoming: matches || [],
      matches: matches || []
    });

  } catch (error: any) {
    console.error("[api/matches] build-time or runtime failure:", error);

    // Fallback response to prevent build crash
    return NextResponse.json({
      success: false,
      status: "error",
      message: "Failed to load matches",
      upcoming: [],
      matches: []
    }, { status: 500 });
  }
}
