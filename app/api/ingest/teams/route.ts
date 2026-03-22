import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Scans our Match table for all unique home_team and away_team names
    // (Since matches store team IDs, we fetch unique Teams associated with those matches or just all Teams)
    const existingTeams = await prisma.teams.findMany({
      select: { team_name: true },
      distinct: ['team_name']
    });

    const results = [];

    // 2. Fetch their data from TheSportsDB
    for (const t of existingTeams) {
      if (!t.team_name) continue;
      
      const url = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(t.team_name)}`;
      console.error(`[Team Ingestion] Fetching: ${url}`);
      
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      
      let logoUrl = null;
      let shortName = t.team_name.substring(0, 3).toUpperCase();
      let league = "Unknown";

      if (data.teams && data.teams.length > 0) {
        const teamData = data.teams[0];
        // 3. Save the high-res去背 logo (strBadge) into logo_url
        logoUrl = teamData.strTeamBadge || null;
        // 4. Save the official 3-letter abbreviation
        if (teamData.strTeamShort) {
          shortName = teamData.strTeamShort;
        }
        league = teamData.strLeague || league;
      }

      // 5. Upserts this into the Team database
      const upserted = await prisma.team.upsert({
        where: { team_name: t.team_name },
        create: {
          team_name: t.team_name,
          short_name: shortName,
          logo_url: logoUrl,
          league: league
        },
        update: {
          short_name: shortName,
          logo_url: logoUrl,
          league: league
        }
      });
      
      results.push(upserted);
      // Repectful delay
      await new Promise(r => setTimeout(r, 800));
    }

    return NextResponse.json({ success: true, count: results.length, data: results });
  } catch (error: any) {
    console.error("[TEAM INGEST ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
