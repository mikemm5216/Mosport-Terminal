export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const ODDS_API_KEY = process.env.ODDS_API_KEY || "demo_key"; // 將被真實環境變數取代

// 第一步：定義統一 Adapter 介面，讓所有來源的資料都長成這樣
interface UnifiedMatchData {
  match_id: string;
  league_id: string;
  league_name: string;
  sport: string;
  home_team_id: string;
  home_team_name: string;
  away_team_id: string;
  away_team_name: string;
  match_date: Date;
  home_score: number;
  away_score: number;
}

// ==============
// 引擎 1：TheSportsDB
// ==============
async function fetchTheSportsDB(dates: string[]): Promise<UnifiedMatchData[]> {
  const unifiedData: UnifiedMatchData[] = [];
  
  for (const dateStr of dates) {
    const targetUrl = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${dateStr}`;
    console.error(`[TheSportsDB FETCH START] URL: ${targetUrl}`);
    
    let res;
    try {
      res = await fetch(targetUrl);
    } catch (e: any) {
      throw new Error(`TheSportsDB Network Error: ${e.message}`);
    }

    console.error(`[TheSportsDB FETCH END] Status: ${res.status}`);
    
    // 煞車引擎：被 429 鎖住立刻拋出，交由 Fallback 處理
    if (res.status === 429) {
      throw new Error('TheSportsDB Rate Limited (429)');
    }
    
    if (!res.ok) {
      throw new Error(`TheSportsDB HTTP Error: ${res.status}`);
    }

    const data = await res.json();
    const events = data.events || [];

    for (const event of events) {
      if (!event.idEvent || String(event.idEvent).trim() === "" || event.idEvent === "null") continue;
      if (!event.intHomeScore || !event.intAwayScore || event.intHomeScore === "" || event.intAwayScore === "") continue;

      const dateObj = new Date(`${event.dateEvent}T${event.strTime || "00:00:00"}Z`);
      if (isNaN(dateObj.getTime())) continue;

      unifiedData.push({
        match_id: String(event.idEvent),
        league_id: String(event.idLeague || "MissingLeague"),
        league_name: event.strLeague || "Unknown League",
        sport: event.strSport || "Soccer",
        home_team_id: String(event.idHomeTeam || event.strHomeTeam),
        home_team_name: event.strHomeTeam,
        away_team_id: String(event.idAwayTeam || event.strAwayTeam),
        away_team_name: event.strAwayTeam,
        match_date: dateObj,
        home_score: parseInt(event.intHomeScore),
        away_score: parseInt(event.intAwayScore),
      });
    }

    // 絕對禁止 Promise.all，乖乖等 500ms
    await sleep(500); 
  }
  
  return unifiedData;
}

// ==============
// 引擎 2：Odds API Fallback (The Odds API - Scores)
// ==============
async function fetchOddsApiFallback(): Promise<UnifiedMatchData[]> {
  const unifiedData: UnifiedMatchData[] = [];
  
  // 過去 3 天完賽的 Soccer 賽程 (以 EPL 範例)
  // 實務上可根據需求迭代多個 sport_key
  const targetUrl = `https://api.the-odds-api.com/v4/sports/soccer_epl/scores/?daysFrom=3&apiKey=${ODDS_API_KEY}`;
  console.error(`[OddsAPI FETCH START] URL: ${targetUrl}`);
  
  const res = await fetch(targetUrl);
  if (!res.ok) {
    throw new Error(`Odds API HTTP Error: ${res.status}`);
  }
  
  const events = await res.json(); // Array
  
  for (const event of events) {
    if (!event.completed) continue;
    if (!event.scores || event.scores.length !== 2) continue; // 沒有分數跳過

    let homeScore = 0;
    let awayScore = 0;
    for (const scoreObj of event.scores) {
      if (scoreObj.name === event.home_team) homeScore = parseInt(scoreObj.score);
      if (scoreObj.name === event.away_team) awayScore = parseInt(scoreObj.score);
    }

    unifiedData.push({
      match_id: String(event.id),                           // Odds API 的 UUID
      league_id: String(event.sport_key),                   // "soccer_epl" 等
      league_name: event.sport_title || "Unknown League",
      sport: "Soccer",
      home_team_id: String(event.home_team).replace(/\s/g, "_"), // 將隊名化作 ID (因為 Odds API 沒給 ID)
      home_team_name: String(event.home_team),
      away_team_id: String(event.away_team).replace(/\s/g, "_"),
      away_team_name: String(event.away_team),
      match_date: new Date(event.commence_time),
      home_score: homeScore,
      away_score: awayScore,
    });
  }
  
  return unifiedData;
}

export async function GET() {
  try {
    const dates: string[] = [];
    for (let i = 1; i <= 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }

    let unifiedMatches: UnifiedMatchData[] = [];
    let active_engine = "TheSportsDB";

    // == 雙引擎容錯切換 ==
    try {
      console.error("[ENGINE 1] Starting TheSportsDB Ingestion...");
      unifiedMatches = await fetchTheSportsDB(dates);
      
      if (unifiedMatches.length === 0) {
        throw new Error("TheSportsDB returned 0 usable matches. Triggering API Fallback.");
      }
    } catch (e: any) {
      console.error(`[ENGINE 1 FAILED] ${e.message}. Switching to Odds API Fallback.`);
      active_engine = "OddsAPI";
      unifiedMatches = await fetchOddsApiFallback();
    }

    if (unifiedMatches.length === 0) {
      return NextResponse.json({ success: false, message: "Both engines failed or returned 0 matches." }, { status: 500 });
    }

    // == 關聯映射器 ==
    const leaguesMap = new Map<string, any>();
    const teamsMap = new Map<string, any>();
    const matchRows: any[] = [];

    for (const data of unifiedMatches) {
      leaguesMap.set(data.league_id, {
        league_id: data.league_id,
        league_name: data.league_name,
        sport: data.sport,
        country: "Global"
      });
      teamsMap.set(data.home_team_id, { team_id: data.home_team_id, league_id: data.league_id, team_name: data.home_team_name, home_city: "Unknown" });
      teamsMap.set(data.away_team_id, { team_id: data.away_team_id, league_id: data.league_id, team_name: data.away_team_name, home_city: "Unknown" });
      matchRows.push({
        match_id: data.match_id,
        league_id: data.league_id,
        home_team_id: data.home_team_id,
        away_team_id: data.away_team_id,
        match_date: data.match_date,
        home_score: data.home_score,
        away_score: data.away_score,
        status: "COMPLETED"
      });
    }

    // League / Team 可並發寫入
    await Promise.all(
      Array.from(leaguesMap.values()).map(l =>
        prisma.leagues.upsert({ where: { league_id: l.league_id }, update: {}, create: l })
      )
    );
    await Promise.all(
      Array.from(teamsMap.values()).map(t =>
        prisma.teams.upsert({ where: { team_id: t.team_id }, update: {}, create: t })
      )
    );

    // Matches 必須序列寫入
    let write_success = 0;
    let write_failed = 0;

    for (const match of matchRows) {
      try {
        await prisma.matches.upsert({
          where: { match_id: match.match_id },
          create: match,
          update: {
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
        console.error(`[DB UPSERT FAIL] match_id=${match.match_id}`, e.message);
        write_failed++;
      }
    }

    const total_matches_in_db = await prisma.matches.count();

    return NextResponse.json({
      success: true,
      active_engine,
      ingested_count: matchRows.length,
      write_success,
      write_failed,
      total_matches_in_db,
    });

  } catch (error: any) {
    console.error("[FATAL INGEST ERROR]", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
