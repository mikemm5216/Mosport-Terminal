import { prisma } from "../lib/prisma";
import { computeMatchFeatures } from "../lib/features/computeFeatures";

async function main() {
    console.log("[Seed] Starting Massive Spartan Seeding...");

    const leagues = [
        { name: "EPL", id: "4328" },
        { name: "La Liga", id: "4335" },
        { name: "Bundesliga", id: "4331" },
        { name: "Serie A", id: "4332" },
        { name: "Ligue 1", id: "4334" },
        { name: "Eredivisie", id: "4337" },
        { name: "Belgian Pro League", id: "4338" },
        { name: "Primeira Liga", id: "4344" },
        { name: "Championship", id: "4329" },
        { name: "Scottish Prem", id: "4339" },
        { name: "Super Lig", id: "4356" },
        { name: "Greek SL", id: "4340" },
        { name: "Danish SL", id: "4351" },
        { name: "Swedish Allsvenskan", id: "4347" },
        { name: "Swiss SL", id: "4358" }
    ];

    const seasons = ["2023-2024", "2024-2025"];

    for (const league of leagues) {
        for (const season of seasons) {
            console.log(`[Seed] Fetching ${league.name} season ${season}...`);

            const url = `https://www.thesportsdb.com/api/v1/json/${process.env.THE_SPORTS_DB_API_KEY || "3"}/eventsseason.php?id=${league.id}&s=${season}`;

            try {
                const response = await fetch(url);
                const dataJson: any = await response.json();
                const data = dataJson.events || [];

                console.log(`[Seed] Found ${data.length} matches for ${league.name}.`);

                for (const item of data) {
                    if (item.strStatus !== "Match Finished") continue;

                    const homeScore = parseInt(item.intHomeScore);
                    const awayScore = parseInt(item.intAwayScore);
                    let result = "DRAW";
                    if (homeScore > awayScore) result = "HOME_WIN";
                    else if (awayScore > homeScore) result = "AWAY_WIN";

                    // 1. Teams
                    await (prisma as any).teams.upsert({
                        where: { team_id: item.idHomeTeam },
                        update: { full_name: item.strHomeTeam },
                        create: {
                            team_id: item.idHomeTeam,
                            full_name: item.strHomeTeam,
                            short_name: item.strHomeTeam.substring(0, 3).toUpperCase(),
                            league_type: "SOCCER"
                        }
                    });

                    await (prisma as any).teams.upsert({
                        where: { team_id: item.idAwayTeam },
                        update: { full_name: item.strAwayTeam },
                        create: {
                            team_id: item.idAwayTeam,
                            full_name: item.strAwayTeam,
                            short_name: item.strAwayTeam.substring(0, 3).toUpperCase(),
                            league_type: "SOCCER"
                        }
                    });

                    // 2. Match
                    const match = await (prisma as any).match.upsert({
                        where: { extId: item.idEvent },
                        update: {
                            status: "finished",
                            homeScore, awayScore,
                            matchResult: result
                        },
                        create: {
                            extId: item.idEvent,
                            sport: "football",
                            date: new Date(item.strTimestamp || item.dateEvent),
                            homeTeamId: item.idHomeTeam,
                            awayTeamId: item.idAwayTeam,
                            homeTeamName: item.strHomeTeam,
                            awayTeamName: item.strAwayTeam,
                            homeScore, awayScore,
                            matchResult: result,
                            status: "finished"
                        }
                    });

                    // 3. Mock Odds & Snapshots
                    await (prisma as any).odds.upsert({
                        where: { id: `mock-${match.id}` },
                        update: {},
                        create: {
                            id: `mock-${match.id}`,
                            matchId: match.id,
                            provider: "theoddsapi",
                            odds_json: { home: 1.5 + Math.random() * 2, away: 2.0 + Math.random() * 2, draw: 3.0 } as any
                        }
                    });

                    await (prisma as any).eventSnapshot.create({
                        data: {
                            matchId: match.id,
                            snapshot_type: "TEAM_STATE_HOME",
                            state_json: { team_strength: 70 + Math.random() * 20, momentum: 0.5, fatigue: 0.2 } as any
                        }
                    });

                    await (prisma as any).eventSnapshot.create({
                        data: {
                            matchId: match.id,
                            snapshot_type: "TEAM_STATE_AWAY",
                            state_json: { team_strength: 65 + Math.random() * 20, momentum: 0.5, fatigue: 0.2 } as any
                        }
                    });

                    // 4. Compute Features
                    await computeMatchFeatures(match.id);
                }
            } catch (err) {
                console.error(`[Seed] Failed ${league.name} ${season}:`, (err as Error).message);
            }
        }
    }
    console.log("[Seed] Massive Seeding Complete.");
}

main()
    .catch(console.error)
    .finally(() => (prisma as any).$disconnect());
