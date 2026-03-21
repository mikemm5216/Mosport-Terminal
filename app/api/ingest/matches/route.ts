import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function fetchDay(dateStr: string): Promise<any[]> {
  try {
    const res = await fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${dateStr}`);
    console.log(`[TheSportsDB] ${dateStr} - Status: ${res.status}`);
    
    if (!res.ok) {
      console.error(`[TheSportsDB HTTP ERROR] ${dateStr} - HTTP ${res.status}`);
      return [];
    }
    
    const data = await res.json();
    if (!data.events) {
      console.warn(`[TheSportsDB NO EVENTS] ${dateStr} - data.events is null/undefined. Raw response keys:`, Object.keys(data));
    }
    return data.events || [];
  } catch (err: any) {
    console.error(`[TheSportsDB EXCEPTION] ${dateStr} -`, err.message);
    return [];
  }
}

export async function GET() {
  try {
    const dates: string[] = [];
    for (let i = 1; i <= 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }

    // 分 3 批併發抓取，批次間 500ms
    const BATCH_SIZE = 10;
    let allEvents: any[] = [];
    for (let i = 0; i < dates.length; i += BATCH_SIZE) {
      const batch = dates.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(fetchDay));
      allEvents = allEvents.concat(results.flat());
      if (i + BATCH_SIZE < dates.length) await sleep(500);
    }

    // Transform
    const leaguesMap = new Map<string, any>();
    const teamsMap = new Map<string, any>();
    const matchRows: any[] = [];
    let skipped_count = 0;

    for (const event of allEvents) {
      if (!event.intHomeScore || !event.intAwayScore ||
        event.intHomeScore === "" || event.intAwayScore === "") {
        skipped_count++;
        continue;
      }
      
      // 關鍵修復：TheSportsDB 有時會吐出沒有 idEvent 的垃圾資料，這會導致全寫進 id: "undefined" 互相覆蓋
      if (!event.idEvent || String(event.idEvent).trim() === "" || event.idEvent === "null") {
        console.warn("[INGEST WARNING] 跳過無效 ID 賽事:", event.strEvent);
        skipped_count++;
        continue;
      }
      
      const dateTimeString = `${event.dateEvent}T${event.strTime || "00:00:00"}Z`;
      const match_date = new Date(dateTimeString);
      if (isNaN(match_date.getTime())) { skipped_count++; continue; }

      // 強制全部 ID 轉字串
      const match_id    = String(event.idEvent);
      const league_id   = String(event.idLeague || "MissingLeague");
      const home_team_id = String(event.idHomeTeam || event.strHomeTeam);
      const away_team_id = String(event.idAwayTeam || event.strAwayTeam);
      const home_score  = parseInt(event.intHomeScore);
      const away_score  = parseInt(event.intAwayScore);

      leaguesMap.set(league_id, {
        league_id,
        league_name: event.strLeague || "Unknown League",
        sport: event.strSport || "Soccer",
        country: "Global"
      });
      teamsMap.set(home_team_id, { team_id: home_team_id, league_id, team_name: event.strHomeTeam, home_city: "Unknown" });
      teamsMap.set(away_team_id, { team_id: away_team_id, league_id, team_name: event.strAwayTeam, home_city: "Unknown" });
      matchRows.push({ match_id, league_id, home_team_id, away_team_id, match_date, home_score, away_score, status: "COMPLETED" });
    }

    // League upsert — 不多，可以並發
    await Promise.all(
      Array.from(leaguesMap.values()).map(l =>
        prisma.leagues.upsert({ where: { league_id: l.league_id }, update: {}, create: l })
      )
    );

    // Team upsert — 不多，可以並發
    await Promise.all(
      Array.from(teamsMap.values()).map(t =>
        prisma.teams.upsert({ where: { team_id: t.team_id }, update: {}, create: t })
      )
    );

    // ★ 關鍵修正：改用序列 for...of，單筆 try-catch，確保每筆都入庫
    let write_success = 0;
    let write_failed = 0;

    for (const match of matchRows) {
      try {
        await prisma.matches.upsert({
          where: { match_id: match.match_id },
          create: match,
          update: {   // 完整 update，確保已存在的筆數也被刷新
            league_id:    match.league_id,
            home_team_id: match.home_team_id,
            away_team_id: match.away_team_id,
            match_date:   match.match_date,
            home_score:   match.home_score,
            away_score:   match.away_score,
            status:       match.status,
          }
        });
        write_success++;
      } catch (e: any) {
        console.error(`[INGEST FAIL] match_id=${match.match_id}`, e.message);
        write_failed++;
      }
    }

    // 寫入後確認庫存
    const total_matches_in_db = await prisma.matches.count();

    return NextResponse.json({
      success: true,
      fetched_count: allEvents.length,
      ingested_count: matchRows.length,
      write_success,
      write_failed,
      skipped_count,
      total_matches_in_db,  // 如果這個數字遠低於 write_success，有 constraint 問題
    });

  } catch (error: any) {
    console.error("[INGEST ERROR]", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
