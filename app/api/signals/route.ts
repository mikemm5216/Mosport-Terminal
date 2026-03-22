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

    // Extract all team names we need to lookup in the new 'Team' cold database
    const teamNames = new Set<string>();
    matches.forEach(m => {
      if (m.home_team?.team_name) teamNames.add(m.home_team.team_name);
      if (m.away_team?.team_name) teamNames.add(m.away_team.team_name);
    });

    const teamsDb = await prisma.team.findMany({
      where: { team_name: { in: Array.from(teamNames) } }
    });

    const teamMap = new Map(teamsDb.map(t => [t.team_name, t]));

    const mappedMatches = matches.map(m => {
      const homeDbTeam = m.home_team ? teamMap.get(m.home_team.team_name) : null;
      const awayDbTeam = m.away_team ? teamMap.get(m.away_team.team_name) : null;

      return {
        ...m,
        home_logo: homeDbTeam?.logo_url || null,
        away_logo: awayDbTeam?.logo_url || null,
        home_short_name: homeDbTeam?.short_name || null,
        away_short_name: awayDbTeam?.short_name || null,
      };
    });

    return NextResponse.json({ success: true, count: mappedMatches.length, data: mappedMatches });
  } catch (error: any) {
    console.error("[SIGNALS API ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
