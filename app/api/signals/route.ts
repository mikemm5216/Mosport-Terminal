import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const matches = await (prisma as any).match.findMany({
      where: { status: 'live' },
      take: 200,
      include: {
        home_team: true,
        away_team: true,
        signals: true,
        predictions: true,
        baseballStats: true,
        nbaStats: true
      }
    });

    const data = await Promise.all(matches.map(async (m: any) => {
      // DIAGNOSTIC LOG
      console.log(`[API] Processing Match ${m.extId}. Signal Object:`, JSON.stringify(m.signals, null, 2));

      const sig = m.signals;
      const pred = m.predictions;

      let homePlayerId = m.baseballStats?.homeStarterId || m.nbaStats?.homePlayerIds?.[0];
      let awayPlayerId = m.baseballStats?.awayStarterId || m.nbaStats?.awayPlayerIds?.[0];

      if (!homePlayerId) {
        const hRoster = await (prisma as any).roster.findFirst({ where: { team_id: m.homeTeamId, season_year: 2026 } });
        homePlayerId = hRoster?.player_id;
      }
      if (!awayPlayerId) {
        const aRoster = await (prisma as any).roster.findFirst({ where: { team_id: m.awayTeamId, season_year: 2026 } });
        awayPlayerId = aRoster?.player_id;
      }

      const fetchPlayer = async (pid: string | null, teamId: string) => {
        if (!pid) return null;
        return await (prisma as any).player.findUnique({
          where: { player_id: pid },
          include: {
            rosters: { where: { team_id: teamId, season_year: 2026 }, take: 1 },
            stats_mlb: true,
            stats_nba: true
          }
        });
      };

      const hPlayer = await fetchPlayer(homePlayerId, m.homeTeamId);
      const aPlayer = await fetchPlayer(awayPlayerId, m.awayTeamId);

      const validate = (val: any) => (val === null || val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) ? "ERROR: Missing Schema" : val;

      const homeKp = m.home_key_player;
      const awayKp = m.away_key_player;

      const mapPlayer = (kp: any) => {
        if (!kp) return { player_name: "ERROR: Missing Schema", jersey_number: "ERROR: Missing Schema", physical_profile: "ERROR: Missing Schema", season_stats: "ERROR: Missing Schema", role: "ERROR: Missing Schema" };
        return {
          player_name: validate(kp.player_name),
          jersey_number: validate(kp.jersey_number),
          physical_profile: validate(kp.physical_profile),
          season_stats: validate(kp.season_stats),
          role: validate(kp.role)
        };
      };

      return {
        match_id: m.extId,
        start_time: m.date,
        status: m.status,
        home_team: {
          short_name: validate(m.home_team?.short_name),
          logo_url: validate(m.home_team?.logo_url)
        },
        away_team: {
          short_name: validate(m.away_team?.short_name),
          logo_url: validate(m.away_team?.logo_url)
        },
        win_probabilities: {
          home_win_prob: validate(pred?.homeWinProb),
          away_win_prob: validate(pred?.awayWinProb)
        },
        home_key_player: mapPlayer(homeKp),
        away_key_player: mapPlayer(awayKp),
        public_sentiment: {
          narrative: validate(sig?.narrative),
          crowd_sentiment_index: validate(sig?.crowd_sentiment_index)
        },
        momentum_index: validate(sig?.momentum_index),
        standard_analysis: validate(sig?.standard_analysis),
        tactical_matchup: validate(sig?.tactical_matchup),
        x_factors: validate(sig?.x_factors)
      };
    }));

    return NextResponse.json({
      success: true,
      data: data.filter(Boolean),
      count: data.length
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: "CRITICAL_NODE_FAILURE", details: e.message }, { status: 500 });
  }
}
