import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { ENTITY_REGISTRY } from "@/src/config/entityRegistry";
import { getTeamLogo, normalizeTeamCode } from "@/src/config/teamLogos";

function getHashByCode(internalCode: string) {
  for (const [hash, entity] of Object.entries(ENTITY_REGISTRY)) {
    if (entity.internalCode === internalCode) {
      return hash;
    }
  }
  return "";
}

export const dynamic = 'force-dynamic';

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

  const results = await Promise.all(events.map(async (event: any) => {
    try {
      const matchId = `${leagueDef.prefix}-${event.id}`;
      const statusState = event.status?.type?.state;
      const statusMap: Record<string, string> = { pre: "SCHEDULED", in: "IN_PLAY", post: "COMPLETED" };
      const systemStatus = statusMap[statusState] || "SCHEDULED";

      const comp = event.competitions?.[0];
      const hComp = comp?.competitors?.find((c: any) => c.homeAway === "home");
      const aComp = comp?.competitors?.find((c: any) => c.homeAway === "away");

      const hRaw = normalizeTeamCode(leagueDef.prefix, hComp?.team?.abbreviation || "TBD");
      const aRaw = normalizeTeamCode(leagueDef.prefix, aComp?.team?.abbreviation || "TBD");
      const hTeamId = `${leagueDef.prefix}_${hRaw}`;
      const aTeamId = `${leagueDef.prefix}_${aRaw}`;

      if (!validTeamIds.has(hTeamId) || !validTeamIds.has(aTeamId)) return null;

      // In V2, we track signals via StatsLog attached to Context nodes.
      // We no longer upsert 'Matches' as a standalone model.
      const logEntry = await (prisma as any).statsLog.upsert({
        where: { id: `SIGNAL-${matchId}` }, // Using stable ID for signal persistence
        update: { value: 1.0, timestamp: new Date() },
        create: {
          id: `SIGNAL-${matchId}`,
          player_internal_code: 'SYSTEM_GEN',
          context_internal_code: hTeamId,
          metric_type: 'MATCH_ACTIVITY',
          value: 1.0,
          timestamp: new Date()
        }
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
        home_team: { short_name: hTeamId, logo_url: getTeamLogo(leagueDef.prefix, hRaw) },
        away_team: { short_name: aTeamId, logo_url: getTeamLogo(leagueDef.prefix, aRaw) },
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
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const contexts = await (prisma as any).context.findMany({
      include: {
        stats_logs: {
          take: 1,
          orderBy: { timestamp: 'desc' },
          where: {
            metric_type: 'EV',
            timestamp: { gte: twentyFourHoursAgo }
          }
        }
      }
    });

    const signals = contexts.map((c: any) => {
      const latestLog = c.stats_logs?.[0];
      const entityHash = getHashByCode(c.internal_code);

      return {
        match_id: `V2-${c.public_uuid}`,
        sport: c.sport_code,
        league: c.sport_code === 'NBA' ? 'NBA' : c.sport_code === 'MLB' ? 'MLB' : 'EPL',
        start_time: latestLog?.timestamp || new Date(),
        status: 'LIVE_FEED',
        home_team: { short_name: c.team_code, logo_url: getTeamLogo(c.sport_code, c.team_code) },
        away_team: { short_name: 'OPPONENT', logo_url: '' },
        home_team_hash: entityHash,
        away_team_hash: 'UNKNOWN',
        home_score: 0,
        away_score: 0,
        win_probabilities: { home_win_prob: latestLog?.value || 0.5, away_win_prob: 1 - (latestLog?.value || 0.5) },
        home_key_player: { player_name: "NODE_ALPHA", jersey_number: "00", physical_profile: "SECURE", season_stats: "N/A", role: "NODE" },
        away_key_player: { player_name: "NODE_BETA", jersey_number: "00", physical_profile: "SECURE", season_stats: "N/A", role: "NODE" },
        public_sentiment: { narrative: "V2 Stream Active", crowd_sentiment_index: 0.5 },
        momentum_index: 0.0,
        standard_analysis: ["SIGNAL_ACTIVE"],
        tactical_matchup: ["V2_ARCHITECTURE"],
        x_factors: ["ENCRYPTED"],
      };
    });

    return NextResponse.json({ success: true, data: signals, count: signals.length });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: "DB_FAIL", details: e.message }, { status: 500 });
  }
}
