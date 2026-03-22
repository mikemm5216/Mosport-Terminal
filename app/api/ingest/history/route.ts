import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET() {
  try {
    console.error("[HISTORY INGEST] Starting 30-Day Historical Data Extraction...");
    
    // We want the last 30 days
    const dates = [];
    for (let i = 1; i <= 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split("T")[0]); // YYYY-MM-DD
    }

    // Prepare a map of known teams to link team_name to team_id correctly
    const teams = await prisma.team.findMany();
    const teamNameMap = new Map(teams.map(t => [t.team_name, t.id]));

    // Known leagues to track
    const trackedLeagues = ["English Premier League", "NBA"];

    let ingestedCount = 0;

    for (const dateStr of dates) {
      const url = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${dateStr}`;
      console.error(`[HISTORY INGEST] Fetching date: ${dateStr}`);
      
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        const events = data.events || [];

        for (const evt of events) {
          // Filter out unwanted leagues
          if (!trackedLeagues.includes(evt.strLeague)) continue;
          if (evt.intHomeScore == null || evt.intAwayScore == null) continue;

          const homeTeam = evt.strHomeTeam;
          const awayTeam = evt.strAwayTeam;
          const homeScore = parseInt(evt.intHomeScore.toString());
          const awayScore = parseInt(evt.intAwayScore.toString());
          const eventDate = new Date(evt.dateEvent || evt.strTimestamp || dateStr);

          // Calculate Results
          let homeResult = "D";
          let awayResult = "D";
          if (homeScore > awayScore) {
            homeResult = "W";
            awayResult = "L";
          } else if (homeScore < awayScore) {
            homeResult = "L";
            awayResult = "W";
          }

          // Link to our new Team DB
          const homeTeamId = teamNameMap.get(homeTeam) || homeTeam;
          const awayTeamId = teamNameMap.get(awayTeam) || awayTeam;

          // Insert / Upsert for Home Team
          await prisma.matchHistory.create({
            data: {
              team_id: homeTeamId,
              opponent: awayTeam,
              result: homeResult,
              score_for: homeScore,
              score_against: awayScore,
              date: eventDate,
            }
          });

          // Insert for Away Team
          await prisma.matchHistory.create({
            data: {
              team_id: awayTeamId,
              opponent: homeTeam,
              result: awayResult,
              score_for: awayScore,
              score_against: homeScore,
              date: eventDate,
            }
          });

          ingestedCount += 2;
        }

      } catch (err: any) {
        console.error(`[HISTORY INGEST ERROR] Failed on ${dateStr}:`, err.message);
      }

      await sleep(1000); // Respect rate limits 
    }

    return NextResponse.json({ success: true, count: ingestedCount, message: "Last 30 days history ingested." });
  } catch (error: any) {
    console.error("[HISTORY INGEST FATAL ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
