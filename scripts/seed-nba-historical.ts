import { prisma } from "../lib/prisma";
import { computeNBAFeatures } from "../lib/features/nba_features";

async function main() {
    console.log("[Seed] Starting NBA Historical Scaling (Target: 1000+)...");

    const leagueId = "4387"; // NBA
    const seasons = ["2022-2023", "2023-2024", "2024-2025"];
    let totalSeeded = 0;

    for (const season of seasons) {
        console.log(`[Seed] Fetching NBA season ${season}...`);
        const url = `https://www.thesportsdb.com/api/v1/json/${process.env.THE_SPORTS_DB_API_KEY || "3"}/eventsseason.php?id=${leagueId}&s=${season}`;

        try {
            const response = await fetch(url);
            const dataJson: any = await response.json();
            const events = dataJson.events || [];

            console.log(`[Seed] Found ${events.length} events for ${season}.`);

            for (const item of events) {
                if (item.strStatus !== "Match Finished") continue;

                const homeScore = parseInt(item.intHomeScore);
                const awayScore = parseInt(item.intAwayScore);
                const result = homeScore > awayScore ? "HOME_WIN" : (awayScore > homeScore ? "AWAY_WIN" : "DRAW");

                // 1. Teams
                await (prisma as any).teams.upsert({
                    where: { team_id: item.idHomeTeam },
                    update: { full_name: item.strHomeTeam },
                    create: {
                        team_id: item.idHomeTeam,
                        full_name: item.strHomeTeam,
                        short_name: item.strHomeTeam.substring(0, 3).toUpperCase(),
                        league_type: "NBA"
                    }
                });

                await (prisma as any).teams.upsert({
                    where: { team_id: item.idAwayTeam },
                    update: { full_name: item.strAwayTeam },
                    create: {
                        team_id: item.idAwayTeam,
                        full_name: item.strAwayTeam,
                        short_name: item.strAwayTeam.substring(0, 3).toUpperCase(),
                        league_type: "NBA"
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
                        sport: "basketball",
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

                // 3. Features
                try {
                    await computeNBAFeatures(match.id);
                    totalSeeded++;
                } catch (ferr) {
                    console.error(`[Seed] Feature Error match ${match.id}:`, (ferr as Error).message);
                }

                if (totalSeeded % 100 === 0) console.log(`[Seed] Progress: ${totalSeeded} matches...`);
            }
        } catch (err) {
            console.error(`[Seed] Failed NBA ${season}:`, (err as Error).message);
        }
    }

    console.log(`[Seed] NBA Scaling Complete: ${totalSeeded} matches.`);
}

main()
    .catch(console.error)
    .finally(() => (prisma as any).$disconnect());
