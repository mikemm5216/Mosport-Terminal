import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// ─── Centralized Team ID Normalization ────────────────────────────────────────
const ESPN_TEAM_MAP: Record<string, string> = {
  NO: "NOP", GS: "GSW", NY: "NYK", SA: "SAS",
  WSH: "WAS", UTAH: "UTA", PHX: "PHX", CLE: "CLE",
  // MLB
  KC: "KC",
  // EPL normalization (ESPN full names to 3-letter)
};

function normalizeTeamId(raw: string): string {
  return ESPN_TEAM_MAP[raw] ?? raw;
}

// ─── League Definitions ───────────────────────────────────────────────────────
const LEAGUES = [
  {
    sport: "basketball",
    league: "nba",
    prefix: "NBA",
    espnUrl: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
  },
  {
    sport: "baseball",
    league: "mlb",
    prefix: "MLB",
    espnUrl: "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard",
  },
  {
    sport: "soccer",
    league: "epl",
    prefix: "EPL",
    espnUrl: "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard",
  },
  {
    sport: "soccer",
    league: "ucl",
    prefix: "UCL",
    espnUrl: "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard",
  },
];

async function processLeague(
  leagueDef: typeof LEAGUES[0],
  validTeamIds: Set<string>,
  engineUrl: string,
  engineKey: string
): Promise<any[]> {
  const res = await fetch(leagueDef.espnUrl, { next: { revalidate: 60 } });
  if (!res.ok) return [];

  const espnData = await res.json();
  const events: any[] = espnData.events || [];

  const results = await Promise.all(events.map(async (event: any) => {
    try {
      const matchId = `${leagueDef.prefix}-${event.id}`;
      const statusState = event.status?.type?.state;
      const statusMap: Record<string, string> = { pre: "SCHEDULED", in: "IN_PLAY", post: "COMPLETED" };
      const systemStatus = statusMap[statusState] || "SCHEDULED";

      const comp = event.competitions?.[0];
      const homeCompetitor = comp?.competitors?.find((c: any) => c.homeAway === "home");
      const awayCompetitor = comp?.competitors?.find((c: any) => c.homeAway === "away");

      const homeTeam = homeCompetitor?.team;
      const awayTeam = awayCompetitor?.team;

      const homeScore = parseInt(homeCompetitor?.score || "0", 10);
      const awayScore = parseInt(awayCompetitor?.score || "0", 10);

      // ── Fix 2: Namespace ID to prevent cross-league collisions (NBA_WAS vs MLB_WAS) ──
      const hRaw = normalizeTeamId(homeTeam?.abbreviation || "TBD");
      const aRaw = normalizeTeamId(awayTeam?.abbreviation || "TBD");
      const hTeamId = `${leagueDef.prefix}_${hRaw}`;
      const aTeamId = `${leagueDef.prefix}_${aRaw}`;

      // Skip if team not in our DB (avoids FK crash)
      if (!validTeamIds.has(hTeamId) || !validTeamIds.has(aTeamId)) {
        console.warn(`[SKIP] ${matchId}: ${hTeamId} vs ${aTeamId} not in DB`);
        return null;
      }

      // Upsert match
      // @ts-ignore
      const dbMatch = await (prisma as any).match.upsert({
        where: { extId: matchId },
        update: { status: systemStatus, date: new Date(event.date), homeScore, awayScore },
        create: {
          extId: matchId,
          date: new Date(event.date),
          sport: leagueDef.sport,
          homeTeamId: hTeamId,
          awayTeamId: aTeamId,
          homeTeamName: homeTeam?.name || "Unknown",
          awayTeamName: awayTeam?.name || "Unknown",
          homeScore,
          awayScore,
          status: systemStatus,
        },
      });

      // ── Neural Link: call FastAPI inference with 3000ms kill-switch ──
      let homeWinProb = 0.5;
      let standardAnalysis = [
        `INFERENCING XGBOOST VECTOR [${matchId}]`,
        "ESPN CDN TRACE OBTAINED",
        "ALPHA ALIGNMENT: 50.0%",
      ];
      let tacticalMatchup = [
        "COMPUTING SQUAD DEPTH...",
        "READING TRANSITION STATES...",
        "EDGE CALIBRATION NOMINAL",
      ];
      let xFactors = [
        "TACTICAL_DEADLOCK",
        "MOMENTUM CONSTRAINTS APPLIED",
        "OUTLIER IDENTIFICATION ACTIVE",
      ];

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const quantRes = await fetch(`${engineUrl}/api/v1/inference`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${engineKey}`,
          },
          body: JSON.stringify({
            model_id: "latest",
            home_team: hTeamId,
            away_team: aTeamId,
            feature_vector: [homeScore, awayScore, 0, 0, 0, 0],
            model_type: "T-10min",
            chaos_test: false,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (quantRes.ok) {
          const pjson = await quantRes.json();
          if (typeof pjson.probability === "number" && !isNaN(pjson.probability)) {
            homeWinProb = pjson.probability;
          }
          if (pjson.standard_analysis) standardAnalysis = pjson.standard_analysis;
          if (pjson.tactical_matchup) tacticalMatchup = pjson.tactical_matchup;
          if (pjson.x_factors) xFactors = pjson.x_factors;
        }
      } catch (e: any) {
        console.warn(`[NEURAL LINK:${leagueDef.prefix}] Severed: ${e.name}`);
        homeWinProb = 0.5;
        standardAnalysis = ["[ CALCULATING ALPHA... ]", "AWAITING ENGINE RESTORE", "FALLBACK 50%"];
        tacticalMatchup = ["[ CALCULATING TACTICS... ]", "SYSTEM OFFLINE", "NO EDGE DETECTED"];
        xFactors = ["[ CALCULATING X-FACTORS... ]", "NEURAL LINK SEVERED", "MONITORING RESTORE"];
      }

      const awayWinProb = 1.0 - homeWinProb;

      // Upsert prediction
      // @ts-ignore
      await (prisma as any).matchPrediction.upsert({
        where: { matchId: dbMatch.id },
        update: { homeWinProb, awayWinProb },
        create: { matchId: dbMatch.id, homeWinProb, awayWinProb },
      });

      const validate = (val: any) =>
        val === null || val === undefined || val === ""
          ? "[ INTELLIGENCE PENDING ]"
          : val;

      const homeLeader = homeCompetitor?.leaders?.[0]?.leaders?.[0]?.athlete;
      const awayLeader = awayCompetitor?.leaders?.[0]?.leaders?.[0]?.athlete;

      const mapPlayer = (athlete: any) => {
        if (!athlete) return {
          player_name: "[ INTELLIGENCE PENDING ]",
          jersey_number: "00",
          physical_profile: "[ CLASSIFIED PHYSICALS ]",
          season_stats: "AWAITING METRICS",
          role: "UNKNOWN",
        };

        const height = athlete.displayHeight || athlete.height || "--";
        const weight = athlete.displayWeight || athlete.weight || "--";
        const physicalProfile = (height !== "--" || weight !== "--")
          ? `${height}, ${weight}`
          : "[ DATA PENDING ]";

        return {
          player_name: validate(athlete.displayName),
          jersey_number: validate(athlete.jersey),
          physical_profile: physicalProfile,
          season_stats: validate(athlete.displayValue),
          role: athlete.position?.abbreviation || "STAR",
        };
      };

      return {
        match_id: matchId,
        sport: leagueDef.sport,
        league: leagueDef.prefix,
        start_time: event.date,
        status: systemStatus,
        // ── Fix 1: short_name now uses the CLEANED hTeamId/aTeamId ──
        home_team: {
          short_name: hTeamId,
          logo_url: `/logos/${leagueDef.league}_${hRaw.toLowerCase()}.png`,
        },
        away_team: {
          short_name: aTeamId,
          logo_url: `/logos/${leagueDef.league}_${aRaw.toLowerCase()}.png`,
        },
        home_score: homeScore,
        away_score: awayScore,
        win_probabilities: { home_win_prob: homeWinProb, away_win_prob: awayWinProb },
        home_key_player: mapPlayer(homeLeader),
        away_key_player: mapPlayer(awayLeader),
        public_sentiment: {
          narrative: `${leagueDef.prefix} Event Trace. Model: ${homeWinProb > 0.6 ? "ALPHA_ADVANTAGE" : "TACTICAL_DEADLOCK"}`,
          crowd_sentiment_index: 0.5,
        },
        momentum_index: parseFloat(Math.abs(homeWinProb - 0.5).toFixed(3)),
        standard_analysis: standardAnalysis,
        tactical_matchup: tacticalMatchup,
        x_factors: xFactors,
      };
    } catch (err: any) {
      console.error(`[EVENT ERR] ${leagueDef.prefix} event ${event?.id}: ${err.message}`);
      return null;
    }
  }));

  return results.filter(Boolean);
}

// ─── Main GET ─────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    // 1. Fetch all teams to build a lookup dictionary (CTO Requirement: Mask Namespace)
    const teams = await (prisma as any).teams.findMany({
      select: { team_id: true, short_name: true, logo_url: true }
    });

    const teamDict: Record<string, { short_name: string, logo_url: string }> = {};
    teams.forEach((t: any) => {
      teamDict[t.team_id] = {
        short_name: t.short_name,
        logo_url: t.logo_url
      };
    });

    // 2. Fetch matches from DB (CTO Requirement: DB is Single Source of Truth)
    // Range: Today - 1 day to catch yesterday's finals + future matches
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // @ts-ignore
    const dbMatches = await (prisma as any).match.findMany({
      where: {
        date: { gte: yesterday }
      },
      include: {
        predictions: true,
        signals: true,
        home_key_player: true,
        away_key_player: true
      },
      orderBy: { date: 'asc' }
    });

    const matches = dbMatches.map((m: any) => {
      const hInfo = teamDict[m.homeTeamId] || { short_name: m.homeTeamId, logo_url: "" };
      const aInfo = teamDict[m.awayTeamId] || { short_name: m.awayTeamId, logo_url: "" };

      return {
        match_id: m.extId,
        sport: m.sport,
        league: m.homeTeamId.split('_')[0] || "PRO",
        start_time: m.date,
        status: m.status,
        home_team: {
          short_name: hInfo.short_name,
          logo_url: hInfo.logo_url,
        },
        away_team: {
          short_name: aInfo.short_name,
          logo_url: aInfo.logo_url,
        },
        home_score: m.homeScore,
        away_score: m.awayScore,
        win_probabilities: {
          home_win_prob: m.predictions?.homeWinProb ?? 0.5,
          away_win_prob: m.predictions?.awayWinProb ?? 0.5
        },
        home_key_player: m.home_key_player || {
          player_name: "[ GATHERING INTEL ]",
          jersey_number: "00",
          physical_profile: "[ CLASSIFIED PHYSICALS ]",
          season_stats: "AWAITING METRICS",
          role: "STAR",
        },
        away_key_player: m.away_key_player || {
          player_name: "[ GATHERING INTEL ]",
          jersey_number: "00",
          physical_profile: "[ CLASSIFIED PHYSICALS ]",
          season_stats: "AWAITING METRICS",
          role: "STAR",
        },
        public_sentiment: {
          narrative: m.signals?.narrative || "System Trace Active.",
          crowd_sentiment_index: m.signals?.crowd_sentiment_index ?? 0.5,
        },
        momentum_index: m.signals?.momentum_index ?? 0.0,
        standard_analysis: m.signals?.standard_analysis || ["[ CALCULATING... ]"],
        tactical_matchup: m.signals?.tactical_matchup || ["[ CALCULATING... ]"],
        x_factors: m.signals?.x_factors || ["[ CALCULATING... ]"],
      };
    });

    return NextResponse.json({ success: true, data: matches, count: matches.length });
  } catch (e: any) {
    console.error("GET FAIL:", e);
    return NextResponse.json(
      { success: false, error: "DB_RETRIEVAL_FAILURE", details: e.message },
      { status: 500 }
    );
  }
}
