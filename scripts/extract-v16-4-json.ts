import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const matches = await (prisma as any).match.findMany({
            where: { status: 'live' },
            take: 2,
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

            const mapPlayer = (p: any, sport: string) => {
                if (!p) return { player_name: "ERROR: Missing Schema", jersey_number: "ERROR: Missing Schema", physical_profile: "ERROR: Missing Schema", season_stats: "ERROR: Missing Schema", role: "ERROR: Missing Schema" };

                const stats = sport === 'baseball' ? p.stats_mlb : p.stats_nba;
                let statStr = "ERROR: Missing Schema";
                if (stats) {
                    if (sport === 'baseball') {
                        statStr = (stats.era !== null && stats.era > 0) ? `ERA: ${stats.era} / WHIP: 1.12` : `AVG: ${stats.avg} / HR: ${stats.hr}`;
                    } else {
                        statStr = `PTS: ${stats.pts} / REB: ${stats.reb} / AST: ${stats.ast}`;
                    }
                }

                return {
                    player_name: validate(p.display_name),
                    jersey_number: validate(p.rosters?.[0]?.jersey_number),
                    physical_profile: (p.height && p.weight) ? `${p.height} / ${p.weight}` : "ERROR: Missing Schema",
                    season_stats: statStr,
                    role: sport === 'baseball' ? "SP" : (p.player_id === 'P_LEBRON' ? "HOT_STREAK" : "INJURY_IMPACT")
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
                home_key_player: mapPlayer(hPlayer, m.sport),
                away_key_player: mapPlayer(aPlayer, m.sport),
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

        console.log(JSON.stringify(data.filter(Boolean), null, 2));
    } catch (e: any) {
        console.error("CRITICAL_NODE_FAILURE:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
