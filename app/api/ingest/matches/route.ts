import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function fetchDay(dateStr: string): Promise<any[]> {
  try {
    const res = await fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${dateStr}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    // 產生過去 30 天的日期字串
    const dates: string[] = [];
    for (let i = 1; i <= 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }

    // 切分成 3 個批次，每批 10 天，批次間延遲 500ms 避免被封鎖
    const BATCH_SIZE = 10;
    const BATCH_DELAY_MS = 500;
    let allEvents: any[] = [];

    for (let i = 0; i < dates.length; i += BATCH_SIZE) {
      const batch = dates.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(fetchDay));
      allEvents = allEvents.concat(results.flat());

      // 非最後一批才延遲
      if (i + BATCH_SIZE < dates.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    const leaguesToUpsert = new Map<string, any>();
    const teamsToUpsert = new Map<string, any>();
    const matchesToUpsert: any[] = [];
    let skipped_count = 0;

    for (const event of allEvents) {
      if (
        event.intHomeScore === null || event.intAwayScore === null ||
        event.intHomeScore === undefined || event.intAwayScore === undefined ||
        event.intHomeScore === "" || event.intAwayScore === ""
      ) {
        skipped_count++;
        continue;
      }

      const dateTimeString = `${event.dateEvent}T${event.strTime || "00:00:00"}Z`;
      const match_date = new Date(dateTimeString);
      if (isNaN(match_date.getTime())) { skipped_count++; continue; }

      // 強制全部 ID 為字串，避免 TheSportsDB 不時回傳數字型導致 Prisma @id 對不上
      const match_id = String(event.idEvent);
      const league_id = String(event.idLeague || "MissingLeague");
      const home_team_id = String(event.idHomeTeam || event.strHomeTeam);
      const away_team_id = String(event.idAwayTeam || event.strAwayTeam);
      const home_score = parseInt(event.intHomeScore);
      const away_score = parseInt(event.intAwayScore);

      leaguesToUpsert.set(league_id, {
        league_id,
        league_name: event.strLeague || "Unknown League",
        sport: event.strSport || "Soccer",
        country: "Global"
      });

      teamsToUpsert.set(home_team_id, {
        team_id: home_team_id,
        league_id,
        team_name: event.strHomeTeam,
        home_city: "Unknown"
      });

      teamsToUpsert.set(away_team_id, {
        team_id: away_team_id,
        league_id,
        team_name: event.strAwayTeam,
        home_city: "Unknown"
      });

      matchesToUpsert.push({
        match_id,
        league_id,
        home_team_id,
        away_team_id,
        match_date,
        home_score,
        away_score,
        status: "COMPLETED"
      });
    }

    await Promise.all(
      Array.from(leaguesToUpsert.values()).map(league =>
        prisma.leagues.upsert({ where: { league_id: league.league_id }, update: {}, create: league })
      )
    );

    await Promise.all(
      Array.from(teamsToUpsert.values()).map(team =>
        prisma.teams.upsert({ where: { team_id: team.team_id }, update: {}, create: team })
      )
    );

    await Promise.all(
      matchesToUpsert.map(match =>
        prisma.matches.upsert({ where: { match_id: match.match_id }, update: match, create: match })
      )
    );

    // 寫入後瞬間確認 DB 實際筆數
    const total_in_db = await prisma.matches.count();

    return NextResponse.json({
      success: true,
      ingested_count: matchesToUpsert.length,
      skipped_count,
      total_matches_in_db: total_in_db, // 這個數字意外低䏠就是寫入失敗的證據
      message: `30-day ingestion completed (3 batches × 10 days)`
    });

  } catch (error: any) {
    console.error("[INGEST ERROR]", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
