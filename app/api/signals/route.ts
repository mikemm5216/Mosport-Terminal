import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

function normalizeTeamId(raw: string, leaguePrefix: string): string {
  if (raw === "NY") return leaguePrefix === "NBA" ? "NYK" : "NYY";
  const map: Record<string, string> = {
    NO: "NOP", GS: "GSW", SA: "SAS",
    WSH: "WAS", UTAH: "UTA", PHX: "PHX", CLE: "CLE", KC: "KC",
  };
  return map[raw] ?? raw;
}

const LEAGUES = [
  { sport: "basketball", league: "nba", prefix: "NBA", espnUrl: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard" },
  { sport: "baseball", league: "mlb", prefix: "MLB", espnUrl: "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard" },
  { sport: "soccer", league: "epl", prefix: "EPL", espnUrl: "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard" },
  { sport: "soccer", league: "ucl", prefix: "UCL", espnUrl: "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard" },
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

  // Fetch teams to build a local lookup dictionary for logo stability
  const teams = await (prisma as any).teams.findMany({ select: { team_id: true, logo_url: true } });
  const localTeamDict: Record<string, string> = {};
  teams.forEach((t: any) => { localTeamDict[t.team_id] = t.logo_url; });

  const results = await Promise.all(events.map(async (event: any) => {
    try {
      const matchId = `${leagueDef.prefix}-${event.id}`;
      const statusState = event.status?.type?.state;
      const statusMap: Record<string, string> = { pre: "SCHEDULED", in: "IN_PLAY", post: "COMPLETED" };
      const systemStatus = statusMap[statusState] || "SCHEDULED";

      const comp = event.competitions?.[0];
      const hComp = comp?.competitors?.find((c: any) => c.homeAway === "home");
      const aComp = comp?.competitors?.find((c: any) => c.homeAway === "away");

      const hRaw = normalizeTeamId(hComp?.team?.abbreviation || "TBD", leagueDef.prefix);
      const aRaw = normalizeTeamId(aComp?.team?.abbreviation || "TBD", leagueDef.prefix);
      const hTeamId = `${leagueDef.prefix}_${hRaw}`;
      const aTeamId = `${leagueDef.prefix}_${aRaw}`;

      if (!validTeamIds.has(hTeamId) || !validTeamIds.has(aTeamId)) return null;

      const dbMatch = await (prisma as any).match.upsert({
        where: { extId: matchId },
        update: { status: systemStatus, date: new Date(event.date), homeScore: parseInt(hComp?.score || "0", 10), awayScore: parseInt(aComp?.score || "0", 10) },
        create: {
          extId: matchId, date: new Date(event.date), sport: leagueDef.sport,
          homeTeamId: hTeamId, awayTeamId: aTeamId,
          homeTeamName: hComp?.team?.name || "Unknown",
          awayTeamName: aComp?.team?.name || "Unknown",
          homeScore: parseInt(hComp?.score || "0", 10),
          awayScore: parseInt(aComp?.score || "0", 10),
          status: systemStatus,
        },
      });

      // Simple 50% fallback for sync during emergency patching
      const homeWinProb = 0.5;
      const awayWinProb = 1.0 - homeWinProb;

      const validate = (val: any) => val || "[ DATA PENDING ]";
      const hLeader = hComp?.leaders?.[0]?.leaders?.[0]?.athlete;
      const aLeader = aComp?.leaders?.[0]?.leaders?.[0]?.athlete;

      const mapPlayer = (athlete: any) => ({
        player_name: validate(athlete?.displayName),
        jersey_number: validate(athlete?.jersey),
        physical_profile: `${athlete?.displayHeight || "--"}, ${athlete?.displayWeight || "--"}`,
        season_stats: validate(athlete?.displayValue),
        role: athlete?.position?.abbreviation || "STAR",
      });

      return {
        match_id: matchId, sport: leagueDef.sport, league: leagueDef.prefix,
        start_time: event.date, status: systemStatus,
        home_team: { short_name: hTeamId, logo_url: localTeamDict[hTeamId] || `/logos/${leagueDef.league}_${hRaw.toLowerCase()}.png` },
        away_team: { short_name: aTeamId, logo_url: localTeamDict[aTeamId] || `/logos/${leagueDef.league}_${aRaw.toLowerCase()}.png` },
        home_score: parseInt(hComp?.score || "0", 10),
        away_score: parseInt(aComp?.score || "0", 10),
        win_probabilities: { home_win_prob: homeWinProb, away_win_prob: awayWinProb },
        home_key_player: mapPlayer(hLeader),
        away_key_player: mapPlayer(aLeader),
        public_sentiment: { narrative: "System Trace Active.", crowd_sentiment_index: 0.5 },
        momentum_index: 0.0,
        standard_analysis: ["[ CALCULATING... ]"],
        tactical_matchup: ["[ CALCULATING... ]"],
        x_factors: ["[ CALCULATING... ]"],
      };
    } catch (err) { return null; }
  }));

  return results.filter(Boolean);
}

export async function GET() {
  try {
    const teams = await (prisma as any).teams.findMany({ select: { team_id: true, short_name: true, logo_url: true } });
    const teamDict: Record<string, { short_name: string, logo_url: string }> = {};
    teams.forEach((t: any) => { teamDict[t.team_id] = { short_name: t.short_name, logo_url: t.logo_url }; });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const dbMatches = await (prisma as any).match.findMany({
      where: { date: { gte: yesterday } },
      include: { predictions: true, signals: true, home_key_player: true, away_key_player: true },
      orderBy: { date: 'asc' }
    });

    const matches = dbMatches.map((m: any) => {
      const hInfo = teamDict[m.homeTeamId] || { short_name: m.homeTeamId, logo_url: "" };
      const aInfo = teamDict[m.awayTeamId] || { short_name: m.awayTeamId, logo_url: "" };

      return {
        match_id: m.extId, sport: m.sport, league: m.homeTeamId.split('_')[0] || "PRO",
        start_time: m.date, status: m.status,
        home_team: { short_name: hInfo.short_name, logo_url: hInfo.logo_url },
        away_team: { short_name: aInfo.short_name, logo_url: aInfo.logo_url },
        home_score: m.homeScore, away_score: m.awayScore,
        win_probabilities: { home_win_prob: m.predictions?.homeWinProb ?? 0.5, away_win_prob: m.predictions?.awayWinProb ?? 0.5 },
        home_key_player: m.home_key_player || { player_name: "[ GATHERING INTEL ]", jersey_number: "00", physical_profile: "[ CLASSIFIED ]", season_stats: "N/A", role: "STAR" },
        away_key_player: m.away_key_player || { player_name: "[ GATHERING INTEL ]", jersey_number: "00", physical_profile: "[ CLASSIFIED ]", season_stats: "N/A", role: "STAR" },
        public_sentiment: { narrative: m.signals?.narrative || "Audit Mode.", crowd_sentiment_index: 0.5 },
        momentum_index: m.signals?.momentum_index ?? 0.0,
        standard_analysis: m.signals?.standard_analysis || ["[ AUDIT... ]"],
        tactical_matchup: m.signals?.tactical_matchup || ["[ AUDIT... ]"],
        x_factors: m.signals?.x_factors || ["[ AUDIT... ]"],
      };
    });

    return NextResponse.json({ success: true, data: matches, count: matches.length });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: "DB_FAIL", details: e.message }, { status: 500 });
  }
}
