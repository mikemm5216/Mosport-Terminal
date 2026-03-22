import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const matches = await prisma.matches.findMany({
      take: 50,
      orderBy: { match_date: 'desc' },
      include: {
        home_team: true,
        away_team: true,
        snapshots: {
          take: 1,
          orderBy: { snapshot_time: 'desc' }
        }
      }
    });

    const mappedMatches = matches.map(m => ({
      ...m,
      home_logo: m.home_team?.logo_url || null,
      away_logo: m.away_team?.logo_url || null
    }));

    return NextResponse.json({ success: true, count: mappedMatches.length, data: mappedMatches });
  } catch (error: any) {
    console.error("[SIGNALS API ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
