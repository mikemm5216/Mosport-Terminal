import { prisma } from "../lib/prisma";

const RAW_URL = "https://raw.githubusercontent.com/NocturneBear/NBA-Data-2010-2024/main/regular_season_totals_2010_2024.csv";

async function main() {
    console.log("[Seed] Fetching real NBA dataset (2021-2024)...");
    const res = await fetch(RAW_URL);
    if (!res.ok) throw new Error(`Failed: ${res.statusText}`);

    const text = await res.text();
    const lines = text.split("\n");
    const seasons = ["2021-22", "2022-23", "2023-24"];
    const matchesMap = new Map<string, any>();

    console.log("[Seed] Parsing multiple seasons...");
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",");
        if (!seasons.includes(cols[0])) continue;

        const gameId = cols[4];
        if (!gameId) continue;

        const date = new Date(cols[5]);
        const matchup = cols[6];
        const isHome = matchup.includes("vs.");
        const teamName = cols[3];
        const pts = parseInt(cols[26]);

        const stats = {
            fga: parseInt(cols[10]) || 0,
            fta: parseInt(cols[16]) || 0,
            tov: parseInt(cols[24]) || 0,
            oreb: parseInt(cols[18]) || 0,
            trb: parseInt(cols[20]) || 0,
            ast: parseInt(cols[21]) || 0,
            pts: pts || 0
        };

        const players = cols.slice(34).filter((x: string) => x && x.trim() !== "").map((x: string) => x.trim());

        if (!matchesMap.has(gameId)) {
            matchesMap.set(gameId, { gameId, date, season: cols[0] });
        }

        const game = matchesMap.get(gameId);
        if (isHome) {
            game.homeTeamName = teamName;
            game.homeScore = pts;
            game.homeStats = stats;
            game.homePlayers = players;
        } else {
            game.awayTeamName = teamName;
            game.awayScore = pts;
            game.awayStats = stats;
            game.awayPlayers = players;
        }
    }

    const data = Array.from(matchesMap.values()).filter(g => g.homeTeamName && g.awayTeamName);
    console.log(`[Seed] Ingesting ${data.length} matches across 3 seasons...`);

    let count = 0;
    for (const g of data) {
        const result = g.homeScore > g.awayScore ? "HOME_WIN" : "AWAY_WIN";

        // @ts-ignore
        await prisma.match.upsert({
            where: { extId: `nba-real-${g.gameId}` },
            update: {
                homeScore: g.homeScore,
                awayScore: g.awayScore,
                matchResult: result,
                nbaStats: {
                    upsert: {
                        create: {
                            homeFga: g.homeStats.fga, homeFta: g.homeStats.fta, homeTov: g.homeStats.tov, homeOreb: g.homeStats.oreb,
                            homeReb: g.homeStats.trb, homeAst: g.homeStats.ast,
                            awayFga: g.awayStats.fga, awayFta: g.awayStats.fta, awayTov: g.awayStats.tov, awayOreb: g.awayStats.oreb,
                            awayReb: g.awayStats.trb, awayAst: g.awayStats.ast,
                            homePlayerIds: g.homePlayers,
                            awayPlayerIds: g.awayPlayers
                        },
                        update: {
                            homeFga: g.homeStats.fga, homeFta: g.homeStats.fta, homeTov: g.homeStats.tov, homeOreb: g.homeStats.oreb,
                            homeReb: g.homeStats.trb, homeAst: g.homeStats.ast,
                            awayFga: g.awayStats.fga, awayFta: g.awayStats.fta, awayTov: g.awayStats.tov, awayOreb: g.awayStats.oreb,
                            awayReb: g.awayStats.trb, awayAst: g.awayStats.ast,
                            homePlayerIds: g.homePlayers,
                            awayPlayerIds: g.awayPlayers
                        }
                    }
                }
            },
            create: {
                extId: `nba-real-${g.gameId}`,
                sport: "basketball",
                date: g.date,
                homeTeamName: g.homeTeamName,
                awayTeamName: g.awayTeamName,
                homeScore: g.homeScore,
                awayScore: g.awayScore,
                matchResult: result,
                status: "finished",
                home_team: {
                    connectOrCreate: {
                        where: { full_name: g.homeTeamName },
                        create: { full_name: g.homeTeamName, short_name: g.homeTeamName.substring(0, 3).toUpperCase(), league_type: "NBA" }
                    }
                },
                away_team: {
                    connectOrCreate: {
                        where: { full_name: g.awayTeamName },
                        create: { full_name: g.awayTeamName, short_name: g.awayTeamName.substring(0, 3).toUpperCase(), league_type: "NBA" }
                    }
                },
                nbaStats: {
                    create: {
                        homeFga: g.homeStats.fga, homeFta: g.homeStats.fta, homeTov: g.homeStats.tov, homeOreb: g.homeStats.oreb,
                        homeReb: g.homeStats.trb, homeAst: g.homeStats.ast,
                        awayFga: g.awayStats.fga, awayFta: g.awayStats.fta, awayTov: g.awayStats.tov, awayOreb: g.awayStats.oreb,
                        awayReb: g.awayStats.trb, awayAst: g.awayStats.ast,
                        homePlayerIds: g.homePlayers,
                        awayPlayerIds: g.awayPlayers
                    }
                }
            }
        });
        count++;
        if (count % 500 === 0) console.log(`[Seed] Progress: ${count}/${data.length}...`);
    }

    console.log(`[Seed] Phase 3.2 Ingestion Complete (${count} matches).`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
