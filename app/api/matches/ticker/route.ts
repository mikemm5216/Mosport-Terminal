import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();
    const past12h = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const future48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const matches = await prisma.match.findMany({
      where: {
        match_date: {
          gte: past12h,
          lte: future48h,
        },
      },
      include: {
        home_team: true,
        away_team: true,
      },
      orderBy: {
        match_date: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      count: matches.length,
      matches: matches.map((m: any) => ({
        ...m,
        match_id: m.id,
        match_date: m.date,
        home_team_name: m.home_team?.full_name || m.homeTeamName,
        away_team_name: m.away_team?.full_name || m.awayTeamName,
        home_score: m.homeScore,
        away_score: m.awayScore
      }))
    });
  } catch (error: any) {
    console.error("Ticker API Error:", error.message);
    return NextResponse.json({ success: false, matches: [], error: error.message });
  }
}
