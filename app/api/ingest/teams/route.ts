import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const leaguesToFetch = ["English Premier League", "NBA"]; // 示範：抓取 EPL 和 NBA 球隊
    const results = [];

    for (const league of leaguesToFetch) {
      const url = `https://www.thesportsdb.com/api/v1/json/3/search_all_teams.php?l=${encodeURIComponent(league)}`;
      console.error(`[Team Ingestion] Fetching: ${url}`);
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      
      if (!data.teams) continue;

      for (const t of data.teams) {
        if (!t.strTeam) continue;

        const teamRow = {
          team_name: t.strTeam,
          short_name: t.strTeamShort || t.strTeam.substring(0,3).toUpperCase(),
          logo_url: t.strTeamBadge || null,
          league: t.strLeague || league
        };

        await prisma.team.upsert({
          where: { team_name: teamRow.team_name },
          create: teamRow,
          update: {
            short_name: teamRow.short_name,
            logo_url: teamRow.logo_url,
            league: teamRow.league
          }
        });
        results.push(teamRow);
      }
      
      // Respectful delay
      await new Promise(r => setTimeout(r, 1500));
    }

    return NextResponse.json({ success: true, ingested: results.length, data: results });
  } catch (error: any) {
    console.error("[TEAM INGEST ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
