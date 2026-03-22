import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET() {
  try {
    console.error("[TEAM INGEST] Starting Team Data Extraction...");
    
    // 1. Queries the Match table for all unique home_team and away_team names
    const matches = await prisma.matches.findMany({
      include: { home_team: true, away_team: true }
    });

    const uniqueTeamNames = new Set<string>();
    for (const m of matches) {
      if (m.home_team && m.home_team.team_name) {
        uniqueTeamNames.add(m.home_team.team_name);
      }
      if (m.away_team && m.away_team.team_name) {
        uniqueTeamNames.add(m.away_team.team_name);
      }
    }

    const teamNames = Array.from(uniqueTeamNames);
    console.error(`[TEAM INGEST] Found ${teamNames.length} unique teams. Commencing TheSportsDB extraction...`);

    const results = [];

    // 2. Iterates through the list and fetches data from TheSportsDB
    for (const teamName of teamNames) {
      const url = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`;
      console.error(`[TEAM INGEST] Fetching: ${teamName}`);
      
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        
        // 3. Extracts the high-res transparent logo and 3-letter abbreviation
        let logoUrl = null;
        let shortName = teamName.substring(0, 3).toUpperCase();
        let league = "Unknown";

        if (data.teams && data.teams.length > 0) {
          const teamDetails = data.teams[0];
          logoUrl = teamDetails.strTeamBadge || null;
          if (teamDetails.strTeamShort) {
            shortName = teamDetails.strTeamShort;
          }
          league = teamDetails.strLeague || league;
        }

        // 4. Upserts this data into our Prisma Team table
        const upsertedTeam = await prisma.team.upsert({
          where: { team_name: teamName },
          create: {
            team_name: teamName,
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

        results.push(upsertedTeam);
      } catch (err: any) {
        console.error(`[TEAM INGEST ERROR] Failed on ${teamName}:`, err.message);
      }

      // Add a brief await sleep(1500) to respect rate limits
      await sleep(1500);
    }

    return NextResponse.json({ success: true, count: results.length, data: results });
  } catch (error: any) {
    console.error("[TEAM INGEST FATAL ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
