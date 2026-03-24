import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const GENESIS_PAYLOAD = {
      teams: [
        { team_id: "T_LAD_GENESIS", full_name: "Los Angeles Dodgers", short_name: "LAD", league_type: "MLB", city: "Los Angeles", logo_url: "https://b.fssta.com/wp-content/uploads/espanol/2016/04/dodgers.png" },
        { team_id: "T_SDP_GENESIS", full_name: "San Diego Padres", short_name: "SDP", league_type: "MLB", city: "San Diego", logo_url: "https://b.fssta.com/wp-content/uploads/espanol/2016/04/padres.png" },
        { team_id: "T_BKN_GENESIS", full_name: "Brooklyn Nets", short_name: "BKN", league_type: "NBA", city: "Brooklyn", logo_url: "https://b.fssta.com/wp-content/uploads/espanol/2016/04/nets.png" },
        { team_id: "T_NYK_GENESIS", full_name: "New York Knicks", short_name: "NYK", league_type: "NBA", city: "New York", logo_url: "https://b.fssta.com/wp-content/uploads/espanol/2016/04/knicks.png" }
      ],
      matches: [
        {
          match_id: "M_GENESIS_MLB_001",
          league_id: "MLB",
          home_team_id: "T_LAD_GENESIS",
          away_team_id: "T_SDP_GENESIS",
          match_date: new Date("2026-03-25T19:00:00Z"),
          status: "SCHEDULED"
        },
        {
          match_id: "M_GENESIS_NBA_001",
          league_id: "NBA",
          home_team_id: "T_BKN_GENESIS",
          away_team_id: "T_NYK_GENESIS",
          match_date: new Date("2026-03-25T20:30:00Z"),
          status: "SCHEDULED"
        }
      ],
      history: [
        { team_id: "T_LAD_GENESIS", result: "W", date: new Date("2026-03-20T00:00:00Z") },
        { team_id: "T_LAD_GENESIS", result: "W", date: new Date("2026-03-18T00:00:00Z") },
        { team_id: "T_SDP_GENESIS", result: "L", date: new Date("2026-03-20T00:00:00Z") },
        { team_id: "T_BKN_GENESIS", result: "L", date: new Date("2026-03-21T00:00:00Z") },
        { team_id: "T_NYK_GENESIS", result: "W", date: new Date("2026-03-21T00:00:00Z") }
      ]
    };

    // 1. Inject Teams
    for (const team of GENESIS_PAYLOAD.teams) {
      await prisma.teams.upsert({
        where: { team_id: team.team_id },
        update: team,
        create: team as any
      });
    }

    // 2. Inject Matches
    for (const match of GENESIS_PAYLOAD.matches) {
      await prisma.matches.upsert({
        where: { match_id: match.match_id },
        update: { status: match.status },
        create: {
          match_id: match.match_id,
          home_team_id: match.home_team_id,
          away_team_id: match.away_team_id,
          match_date: match.match_date,
          status: match.status,
        } as any
      });
    }

    // 3. Inject History
    for (const h of GENESIS_PAYLOAD.history) {
      await prisma.matchHistory.create({
        data: h
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Genesis Data Injected Successfully",
      teams_count: GENESIS_PAYLOAD.teams.length,
      matches_count: GENESIS_PAYLOAD.matches.length,
      history_count: GENESIS_PAYLOAD.history.length
    });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
