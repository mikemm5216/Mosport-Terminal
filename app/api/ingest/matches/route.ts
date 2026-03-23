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
  home_score: number | null;
  away_score: number | null;
  home_logo: string | null;
  away_logo: string | null;
  players?: UnifiedPlayerData[];
}

interface UnifiedPlayerData {
  player_id: string;
  name: string;
  number: string;
  positions: string[]; // Multi-role support
  stats: Record<string, any>; // Categorized by role
}

// === PROFESSIONAL POSITION DICTIONARY ===
const POSITIONS_BASEBALL = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];
const POSITIONS_BASKETBALL = ["PG", "SG", "SF", "PF", "C", "G", "F", "G-F", "F-C"];
const POSITIONS_SOCCER = ["GK", "CB", "LB", "RB", "LWB", "RWB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "ST", "CF"];

/**
 * Resolves positions from API strings, validates against dictionary,
 * and falls back to DB if API is missing.
 */
async function resolveProfessionalPositions(sport: string, apiPositions: string[], name: string): Promise<string[]> {
  const s = (sport || "").toLowerCase();
  const dictionary = s === "baseball" ? POSITIONS_BASEBALL : 
                    s === "basketball" ? POSITIONS_BASKETBALL : 
                    s === "soccer" ? POSITIONS_SOCCER : [];
  
  let validated = (apiPositions || []).filter(p => dictionary.includes(p));

  // FALLBACK: If API has no valid positions, check our internal DB
  if (validated.length === 0) {
    const existing = await prisma.players.findFirst({
      where: { player_name: name }
    });
    if (existing && existing.positions.length > 0) {
      validated = existing.positions;
    }
  }

  // LAST RESORT: Ensure array is NOT empty
  if (validated.length === 0) {
    if (s === "soccer") validated = ["ST"];
    else if (s === "basketball") validated = ["PF"];
    else if (s === "baseball") validated = ["DH"];
    else validated = ["ST"];
  }
  
  return validated;
}

/**
 * Maps metrics based on sport and position.
 */
function getProfessionalStats(sport: string, positions: string[]): Record<string, any> {
  const stats: Record<string, any> = {};
  const s = (sport || "").toLowerCase();
  
  if (s === "soccer") {
    if (positions.includes("GK")) {
      return { "CS": "0", "SV": "0", "PAS%": "75%" };
    }
    return { "G": "0", "A": "0", "SPG": "0.0", "PAS%": "0%", "TCK": "0.0" };
  } else if (s === "basketball") {
    return { "PPG": "0.0", "RPG": "0.0", "APG": "0.0", "FG%": "0.0%", "3P%": "0.0%" };
  } else if (s === "baseball") {
    if (positions.includes("P")) {
      return { "ERA": "0.00", "K": "0", "WHIP": "0.00", "BAA": ".000" };
    }
    return { "AVG": ".000", "HR": "0", "RBI": "0", "OPS": ".000" };
  }
  
  return stats;
}

// League Normalization for the Vault Filter
const normalizeLeagueTag = (leagueName: string, sport: string): string => {
  const l = (leagueName || "").toLowerCase();
  const s = (sport || "").toLowerCase();
  
  if (l.includes("nba") || s.includes("nba") || s.includes("basketball")) return "NBA";
  if (l.includes("mlb") || s.includes("mlb") || s.includes("baseball")) return "MLB";
  if (l.includes("premier") || l.includes("epl") || s.includes("epl") || (s.includes("soccer") && (l.includes("premier") || !l.includes("champions")))) return "EPL";
  if (l.includes("champions") || l.includes("ucl") || l.includes("uefa")) return "UCL";
  
  return "NBA"; 
};

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
      const rawId = event.idEvent;
      if (!rawId || String(rawId).trim() === "" || String(rawId) === "null" || String(rawId) === "undefined") {
        console.warn("[INGEST WARNING] 跳過無效 ID 賽事:", event.strEvent);
        continue;
      }

      const dateObj = new Date(`${event.dateEvent}T${event.strTime || "00:00:00"}Z`);
      if (isNaN(dateObj.getTime())) continue;

      unifiedData.push({
        match_id: String(event.idEvent),
        league_id: normalizeLeagueTag(event.strLeague || "", event.strSport || ""),
        league_name: event.strLeague || "Unknown League",
        sport: event.strSport || "Soccer",
        home_team_id: String(event.idHomeTeam || event.strHomeTeam),
        home_team_name: event.strHomeTeam,
        away_team_id: String(event.idAwayTeam || event.strAwayTeam),
        away_team_name: event.strAwayTeam,
        match_date: dateObj,
        home_score: event.intHomeScore ? parseInt(event.intHomeScore) : null,
        away_score: event.intAwayScore ? parseInt(event.intAwayScore) : null,
        home_logo: event.strHomeTeamBadge || null,
        away_logo: event.strAwayTeamBadge || null,
        players: [
          {
            player_id: `p_${event.idHomeTeam}_star`,
            name: event.strSport === "Baseball" ? "S. Ohtani" : event.strSport === "Basketball" ? "L. James" : "H. Kane",
            number: event.strSport === "Baseball" ? "17" : event.strSport === "Basketball" ? "23" : "9",
            positions: event.strSport === "Baseball" ? ["P", "DH"] : event.strSport === "Basketball" ? ["PF", "SF"] : ["ST", "CF"],
            stats: {} // Will be populated professionally during sync
          },
          {
            player_id: `p_${event.idAwayTeam}_star`,
            name: "Tactical Variable",
            number: "99",
            positions: event.strSport === "Soccer" ? ["CDM", "CM"] : event.strSport === "Basketball" ? ["PG", "SG"] : ["SS", "2B"],
            stats: {}
          }
        ]
      });
    }

    // 延長呼吸時間 (尊重的延遲)：每次排程只會打 5 次 API，耗時約 12 秒，既不會被封鎖，也不會 Timeout
    await sleep(2500); 
  }
  
  return unifiedData;
}

// ==============
// 引擎 2：Odds API Fallback (The Odds API - Scores)
// ==============
async function fetchOddsApiFallback(): Promise<UnifiedMatchData[]> {
  const unifiedData: UnifiedMatchData[] = [];
  
  // 擴展多運動：EPL, NBA, MLB, UCL
  const sportKeys = [
    "soccer_epl",
    "basketball_nba",
    "baseball_mlb",
    "soccer_uefa_champs_league"
  ];

  for (const key of sportKeys) {
    const targetUrl = `https://api.the-odds-api.com/v4/sports/${key}/scores/?daysFrom=3&apiKey=${ODDS_API_KEY}`;
    console.error(`[OddsAPI FETCH START] League: ${key} | URL: ${targetUrl}`);
    
    try {
      const res = await fetch(targetUrl);
      if (!res.ok) {
        console.error(`[OddsAPI ERROR] League: ${key} | Status: ${res.status}`);
        continue; // 跳過報錯的聯賽
      }
      
      const events = await res.json(); // Array
      
      for (const event of events) {
        let homeScore: number | null = null;
        let awayScore: number | null = null;
        
        if (event.scores && event.scores.length === 2) {
          for (const scoreObj of event.scores) {
            if (scoreObj.name === event.home_team) homeScore = parseInt(scoreObj.score);
            if (scoreObj.name === event.away_team) awayScore = parseInt(scoreObj.score);
          }
        }

        unifiedData.push({
          match_id: String(event.id),                           
          league_id: normalizeLeagueTag(event.sport_title || "", event.sport_key || ""),
          league_name: event.sport_title || "Unknown League",
          sport: event.sport_key.startsWith("basketball") ? "Basketball" : 
                 event.sport_key.startsWith("baseball") ? "Baseball" : "Soccer",
          home_team_id: String(event.home_team).replace(/\s/g, "_"), 
          home_team_name: String(event.home_team),
          away_team_id: String(event.away_team).replace(/\s/g, "_"),
          away_team_name: String(event.away_team),
          match_date: new Date(event.commence_time),
          home_score: homeScore,
          away_score: awayScore,
          home_logo: null,
          away_logo: null,
          players: [
            {
              player_id: `p_${event.id}_star`,
              name: "Odds Intelligence Hub",
              number: "55",
              positions: key.includes("baseball") ? ["LF", "RF"] : key.includes("basketball") ? ["SF", "PF"] : ["CB", "CDM"],
              stats: {}
            }
          ]
        });
      }
      
      // 尊重 Odds API 的 Rate Limit
      await sleep(1000);

    } catch (e: any) {
      console.error(`[OddsAPI FATAL] League: ${key} | Error: ${e.message}`);
    }
  }
  
  return unifiedData;
}

export async function GET() {
  try {
    // FORENSIC PURGE - Wipe dirty data first (Exhaustive cascading)
    await prisma.matchStats.deleteMany({});
    await prisma.marketProbabilities.deleteMany({});
    await prisma.signals.deleteMany({});
    await prisma.eventSnapshot.deleteMany({});
    await prisma.experience.deleteMany({});
    await prisma.matchesHistory.deleteMany({});
    await prisma.signalsHistory.deleteMany({});
    await prisma.players.deleteMany({});
    await prisma.matches.deleteMany({});
    console.error("[INGEST] Forensic Purge Executed (Exhaustive).");

    const dates: string[] = [];
    // 日常排程 (Daily Sync)：只抓昨天 (-1)、今天 (0) 及未來三天 (1~3)
    for (let i = -1; i <= 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }

    let unifiedMatches: UnifiedMatchData[] = [];
    let active_engine = "Parallel_Both";

    // == DATA PURGE: WIPE CONTAMINATION ==
    await prisma.players.deleteMany({});
    console.error("[DATA PURGE] Clear Players DB - Recovery Mode Active");

    // == 雙引擎併發抓取 (Parallel Sync) ==
    console.error("[DUAL ENGINE] Starting parallel ingestion: TheSportsDB + OddsAPI...");
    
    const [sportsDbResult, oddsApiResult] = await Promise.allSettled([
      fetchTheSportsDB(dates),
      fetchOddsApiFallback()
    ]);

    let sportsDbMatches: UnifiedMatchData[] = [];
    if (sportsDbResult.status === "fulfilled") {
      sportsDbMatches = sportsDbResult.value;
      console.error(`[ENGINE 1] TheSportsDB extracted: ${sportsDbMatches.length} matches`);
    } else {
      console.error(`[ENGINE 1 FAILED] TheSportsDB error:`, sportsDbResult.reason);
    }

    let oddsApiMatches: UnifiedMatchData[] = [];
    if (oddsApiResult.status === "fulfilled") {
      oddsApiMatches = oddsApiResult.value;
      console.error(`[ENGINE 2] Odds API extracted: ${oddsApiMatches.length} matches`);
    } else {
      console.error(`[ENGINE 2 FAILED] Odds API error:`, oddsApiResult.reason);
    }

    // 將兩邊抓取到的所有賽事合併
    // 雖然可能會有重複，但 Prisma 迴圈的 upsert 行為會以資料庫中的最新值覆蓋
    unifiedMatches = [...sportsDbMatches, ...oddsApiMatches];

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
      teamsMap.set(data.home_team_id, { team_id: data.home_team_id, league_id: data.league_id, team_name: data.home_team_name, home_city: "Unknown", logo_url: data.home_logo, sport: data.sport, league_name: data.league_name });
      teamsMap.set(data.away_team_id, { team_id: data.away_team_id, league_id: data.league_id, team_name: data.away_team_name, home_city: "Unknown", logo_url: data.away_logo, sport: data.sport, league_name: data.league_name });
      matchRows.push({
        match_id: data.match_id,
        league_id: data.league_id,
        home_team_id: data.home_team_id,
        away_team_id: data.away_team_id,
        home_team_name: data.home_team_name,
        away_team_name: data.away_team_name,
        sport: data.sport,
        match_date: data.match_date,
        home_score: data.home_score,
        away_score: data.away_score,
        status: (data.home_score !== null && data.away_score !== null) ? "COMPLETED" : "SCHEDULED",
        players: data.players || []
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
        prisma.teams.upsert({ 
          where: { team_id: t.team_id }, 
          update: { logo_url: t.logo_url }, 
          create: { team_id: t.team_id, league_id: t.league_id, team_name: t.team_name, home_city: t.home_city, logo_url: t.logo_url } 
        })
      )
    );

    // Sync to Vault Team (singular) table
    await Promise.all(
      Array.from(teamsMap.values()).map(t =>
        prisma.team.upsert({
          where: { team_name: t.team_name },
          update: {
            short_name: t.team_name.substring(0, 3).toUpperCase(),
            logo_url: t.logo_url,
            league: normalizeLeagueTag(t.league_name, t.sport)
          },
          create: {
            team_name: t.team_name,
            short_name: t.team_name.substring(0, 3).toUpperCase(),
            logo_url: t.logo_url,
            league: normalizeLeagueTag(t.league_name, t.sport)
          }
        })
      )
    );

    // Matches & Players 必須序列寫入
    let write_success = 0;
    let write_failed = 0;

    for (const match of matchRows) {
      try {
        if (!match.match_id || match.match_id === "undefined") continue;

        await prisma.matches.upsert({
          where: { match_id: match.match_id },
          update: {
            home_score: match.home_score,
            away_score: match.away_score,
            status: match.status,
            home_team_name: match.home_team_name,
            away_team_name: match.away_team_name,
          },
          create: {
            match_id: match.match_id,
            league_id: match.league_id,
            home_team_id: match.home_team_id,
            away_team_id: match.away_team_id,
            home_team_name: match.home_team_name,
            away_team_name: match.away_team_name,
            match_date: match.match_date,
            status: match.status,
          }
        });

        // Sync Players with Multi-Role Stats
        for (const p of match.players) {
          // RESOLVE POSITIONS PROFESSIONALLY
          const finalPositions = await resolveProfessionalPositions(match.sport, p.positions, p.name);
          const finalStats = getProfessionalStats(match.sport, finalPositions);

          await prisma.players.upsert({
            where: { player_id: p.player_id },
            update: {
              stats: finalStats,
              positions: finalPositions,
              number: p.number
            },
            create: {
              player_id: p.player_id,
              team_id: match.home_team_id,
              player_name: p.name,
              position: p.position,
              number: p.number,
              stats: p.stats
            }
          });
        }

        write_success++;
      } catch (e: any) {
        console.error(`[DB UPSERT FAIL] match_id=${match.match_id}`, e.message);
        write_failed++;
      }
    }

    const total_matches_in_db = await prisma.matches.count();

    // ==========================================
    // 📖 Story Engine Hook
    // 預留給 Story Engine v1 的自動化生成掛鉤
    // 當 Matches 寫入完畢後，可以並發觸發 narrative 生成
    // ==========================================
    /*
    setTimeout(async () => {
      for (const match of matchRows) {
        if (match.status !== "COMPLETED") continue;
        
        try {
          // 這裡可以撈出 fatigue_diff, news_tags，呼叫 /api/generate/narrative
          // const res = await fetch('http://localhost:3000/api/generate/narrative', { ... });
          // const { narrative, type } = await res.json();
          //
          // await prisma.matches.update({
          //   where: { match_id: match.match_id },
          //   data: { narrative, narrative_type: type }
          // });
        } catch (e) {
          console.error(`[STORY HOOK ERROR] match_id=${match.match_id}`, e);
        }
      }
    }, 1000);
    */

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
