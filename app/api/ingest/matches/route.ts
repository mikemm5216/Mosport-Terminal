export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShortName } from "@/lib/teams";
import { validateInternalApiKey } from "@/lib/security/validateInternalApiKey";
import { rateLimit } from "@/lib/security/rateLimit";
import { isSecurityKillSwitchEnabled } from "@/lib/security/killSwitch";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const RAW_ODDS_KEY = process.env.ODDS_API_KEY || process.env.THE_ODDS_API_KEY;
const ODDS_API_KEY = RAW_ODDS_KEY?.trim();

if (!ODDS_API_KEY) {
  console.warn('[ingest] ODDS_API_KEY_MISSING');
} else {
  console.info(`[ingest] ODDS_API_KEY present (len: ${ODDS_API_KEY.length})`);
}

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
  positions: string[];
  stats: Record<string, any>;
}

const POSITIONS_BASEBALL = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];
const POSITIONS_BASKETBALL = ["PG", "SG", "SF", "PF", "C", "G", "F", "G-F", "F-C"];
const POSITIONS_SOCCER = ["GK", "CB", "LB", "RB", "LWB", "RWB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "ST", "CF"];

async function resolveProfessionalPositions(sport: string, apiPositions: string[], name: string): Promise<string[]> {
  const s = (sport || "").toLowerCase();
  const dictionary = s === "baseball" ? POSITIONS_BASEBALL : 
                    s === "basketball" ? POSITIONS_BASKETBALL : 
                    s === "soccer" ? POSITIONS_SOCCER : [];
  
  let validated = (apiPositions || []).filter(p => dictionary.includes(p));

  if (validated.length === 0) {
    const existing = await prisma.player.findFirst({
      where: { fullName: name }
    });
    if (existing?.position) {
      validated = [existing.position];
    }
  }

  if (validated.length === 0) {
    if (s === "soccer") validated = ["ST"];
    else if (s === "basketball") validated = ["PF"];
    else if (s === "baseball") validated = ["DH"];
    else validated = ["ST"];
  }
  
  return validated;
}

function getProfessionalStats(sport: string, positions: string[]): Record<string, any> {
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
  
  return {};
}

const normalizeLeagueTag = (leagueName: string, sport: string): "NBA" | "MLB" | "SOCCER" | null => {
  const l = (leagueName || "").toUpperCase();
  const s = (sport || "").toUpperCase();
  
  if (l === "NBA" || s === "BASKETBALL_NBA" || l.includes("NATIONAL BASKETBALL ASSOCIATION")) return "NBA";
  if (l === "MLB" || s === "BASEBALL_MLB" || l.includes("MAJOR LEAGUE BASEBALL")) return "MLB";
  
  const isSoccer = s.includes("SOCCER");
  const isEliteSoccer = l.includes("PREMIER") || l.includes("EPL") || l.includes("CHAMPIONS") || l.includes("UCL") || l.includes("LALIGA");
  
  if (isSoccer && isEliteSoccer) return "SOCCER";
  
  return null; 
};

async function fetchTheSportsDB(dates: string[]): Promise<UnifiedMatchData[]> {
  const unifiedData: UnifiedMatchData[] = [];
  
  for (const dateStr of dates) {
    const targetUrl = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${dateStr}`;
    
    try {
      const res = await fetch(targetUrl);
      if (res.status === 429) throw new Error('429');
      if (!res.ok) continue;

      const data = await res.json();
      const events = data.events || [];

      for (const event of events) {
        if (!event.idEvent) continue;

        const dateObj = new Date(`${event.dateEvent}T${event.strTime || "00:00:00"}Z`);
        if (isNaN(dateObj.getTime())) continue;

        unifiedData.push({
          match_id: String(event.idEvent),
          league_id: normalizeLeagueTag(event.strLeague || "", event.strSport || "") || "OTHER",
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
              stats: {}
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
      await sleep(2500); 
    } catch (e) {
      // Silence
    }
  }
  return unifiedData;
}

async function fetchOddsApiFallback(): Promise<UnifiedMatchData[]> {
  const unifiedData: UnifiedMatchData[] = [];
  const sportKeys = ["soccer_epl", "basketball_nba", "baseball_mlb", "soccer_uefa_champs_league"];

  for (const key of sportKeys) {
    const targetUrl = `https://api.the-odds-api.com/v4/sports/${key}/scores/?daysFrom=3&apiKey=${ODDS_API_KEY}`;
    try {
      const res = await fetch(targetUrl);
      if (res.status === 401) {
        console.error('[ingest] ODDS_API_KEY_INVALID_401 - stopping provider cycle');
        break;
      }
      if (!res.ok) continue;
      
      const events = await res.json();
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
          league_id: normalizeLeagueTag(event.sport_title || "", event.sport_key || "") || "OTHER",
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
      await sleep(1000);
    } catch (e) {
      // Silence
    }
  }
  return unifiedData;
}

function isVercelCron(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  if (!rateLimit(ip, 30, 60_000)) {
    return Response.json({ error: "Too Many Requests" }, { status: 429 });
  }
  if (!isVercelCron(req) && !validateInternalApiKey(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isSecurityKillSwitchEnabled()) {
    return Response.json({ error: "Security kill switch enabled" }, { status: 503 });
  }
  try {
    const dates: string[] = [];
    for (let i = -1; i <= 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }

    const [sportsDbResult, oddsApiResult] = await Promise.allSettled([
      fetchTheSportsDB(dates),
      fetchOddsApiFallback()
    ]);

    let sportsDbMatches: UnifiedMatchData[] = [];
    if (sportsDbResult.status === "fulfilled") sportsDbMatches = sportsDbResult.value;

    let oddsApiMatches: UnifiedMatchData[] = [];
    if (oddsApiResult.status === "fulfilled") oddsApiMatches = oddsApiResult.value;

    const unifiedMatches = [...sportsDbMatches, ...oddsApiMatches];

    if (unifiedMatches.length === 0) {
      return NextResponse.json({ success: false, message: "No data available" });
    }

    const leaguesMap = new Map();
    const teamsMap = new Map();
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

    for (const t of teamsMap.values()) {
      if (!t.logo_url) {
        const existing = await prisma.team.findUnique({ where: { team_id: t.team_id } });
        if (existing?.logo_url) t.logo_url = existing.logo_url;
      }
    }

    await Promise.all(Array.from(leaguesMap.values()).map(l => prisma.league.upsert({ where: { league_id: l.league_id }, update: {}, create: l })));
    await Promise.all(Array.from(teamsMap.values()).map(t => prisma.team.upsert({ 
      where: { team_id: t.team_id }, 
      update: { logo_url: t.logo_url || undefined }, 
      create: { team_id: t.team_id, league_id: t.league_id, team_name: t.team_name, home_city: t.home_city, logo_url: t.logo_url } 
    })));

    for (const match of matchRows) {
      try {
        await prisma.match.upsert({
          where: { match_id: match.match_id },
          update: { home_score: match.home_score, away_score: match.away_score, status: match.status },
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

        for (const p of match.players) {
          await resolveProfessionalPositions(match.sport, p.positions, p.name);
          await prisma.player.upsert({
            where: { externalId: p.player_id },
            update: { fullName: p.name, teamId: match.home_team_id },
            create: { externalId: p.player_id, fullName: p.name, teamId: match.home_team_id },
          });
        }
      } catch (e) {
        // Skip match
      }
    }

    return NextResponse.json({ success: true, count: matchRows.length });
  } catch (error) {
    return NextResponse.json({ success: false });
  }
}
