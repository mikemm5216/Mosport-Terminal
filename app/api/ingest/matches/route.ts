import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // [4] 產生過去 7 天的日期字串陣列
    const dates: string[] = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]); // 輸出格式 YYYY-MM-DD
    }

    // 關鍵防護：併發 (Parallel) 發送這 7 天的 API 請求，避免 timeout
    const fetchPromises = dates.map(async (dateStr) => {
      try {
        const response = await fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${dateStr}`);
        if (!response.ok) return [];
        const data = await response.json();
        // TheSportsDB 有可能在沒資料日回傳 { events: null }
        return data.events || [];
      } catch (err) {
        // [5] 單一天的 API 請求失敗要 catch 並 return 空陣列，不中斷整體
        console.error(`Fetch failed for date ${dateStr}:`, err);
        return []; 
      }
    });

    const eventsArrays = await Promise.all(fetchPromises);
    const allEvents = eventsArrays.flat();

    const leaguesToUpsert = new Map();
    const teamsToUpsert = new Map();
    const matchesToUpsert = [];
    
    let skipped_count = 0;

    // [2] 資料 Transform
    for (const event of allEvents) {
      // ⚠️ 跳過沒有比分的資料
      if (
        event.intHomeScore === null || event.intAwayScore === null || 
        event.intHomeScore === undefined || event.intAwayScore === undefined ||
        event.intHomeScore === "" || event.intAwayScore === ""
      ) {
        skipped_count++;
        continue;
      }

      // ⚠️ 極度重要：字尾補上 'Z'，保證 JS Date() 以 UTC 基準解析
      const dateTimeString = `${event.dateEvent}T${event.strTime}Z`;
      const match_date = new Date(dateTimeString);

      if (isNaN(match_date.getTime())) {
        skipped_count++;
        continue;
      }

      // Mapping 至已存在的 Prisma Schema (使用 id 取代純體育名稱以滿足關聯庫外鍵特性)
      const match_id = event.idEvent;
      const league_id = event.idLeague || "MissingLeague";
      const home_team_id = event.idHomeTeam || event.strHomeTeam;
      const away_team_id = event.idAwayTeam || event.strAwayTeam;
      
      const home_score = parseInt(event.intHomeScore);
      const away_score = parseInt(event.intAwayScore);
      const status = "COMPLETED"; // 只要到這一步就是非 null 所以填 COMPLETED

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
        home_city: "Unknown"  // 未知暫代，可另外從冷資料庫對齊
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
        status
      });
    }

    // 提前處理防撞 (Upsert Dependencies)
    await Promise.all(
      Array.from(leaguesToUpsert.values()).map(league => 
        prisma.leagues.upsert({
          where: { league_id: league.league_id },
          update: {},
          create: league
        })
      )
    );

    await Promise.all(
      Array.from(teamsToUpsert.values()).map(team => 
        prisma.teams.upsert({
          where: { team_id: team.team_id },
          update: {}, // 如果有了不要覆蓋掉我們手動調整好的冷資料庫設定
          create: team
        })
      )
    );

    // [3] Idempotent Load，並利用 Promise.all 同時發出 Query 打入 DB
    await Promise.all(
      matchesToUpsert.map(match => 
        prisma.matches.upsert({
          where: { match_id: match.match_id },
          update: match,
          create: match
        })
      )
    );

    // [6] 回傳正確格式
    return NextResponse.json({
      success: true,
      ingested_count: matchesToUpsert.length,
      skipped_count,
      message: "Data ingestion completed successfully"
    });

  } catch (error: any) {
    console.error("[INGEST MATCHES ERROR]", error);
    return NextResponse.json({
      success: false,
      ingested_count: 0,
      skipped_count: 0,
      message: error.message
    }, { status: 500 });
  }
}
