import { prisma } from "../lib/prisma";
import { TheSportsDBAdapter } from "../lib/ingest/adapters/thesportsdb";
import { computeMatchFeatures } from "../lib/features/computeFeatures";

async function main() {
    console.log("[Seed] Starting Final Spartan Seeding...");

    const adapter = new TheSportsDBAdapter();
    const sport = "football";
    const league = "English Premier League";
    const seasons = ["2023-2024", "2024-2025"];

    for (const season of seasons) {
        console.log(`[Seed] Fetching ${league} season ${season}...`);

        const leagueId = "4328"; // EPL
        const url = `https://www.thesportsdb.com/api/v1/json/${process.env.THE_SPORTS_DB_API_KEY || "3"}/eventsseason.php?id=${leagueId}&s=${season}`;

        const response = await fetch(url);
        const dataJson: any = await response.json();
        const data = dataJson.events || [];

        console.log(`[Seed] Found ${data.length} matches.`);

        for (const item of data) {
            if (item.strStatus !== "Match Finished") continue;

            const homeScore = parseInt(item.intHomeScore);
            const awayScore = parseInt(item.intAwayScore);
            let matchResult = "DRAW";
            if (homeScore > awayScore) matchResult = "HOME_WIN";
            else if (awayScore > homeScore) matchResult = "AWAY_WIN";

            // 1. Ensure Teams Exist (Requirement for Spartan Identity)
            await (prisma as any).teams.upsert({
                where: { full_name: item.strHomeTeam },
                update: {},
                create: {
                    team_id: item.idHomeTeam,
                    full_name: item.strHomeTeam,
                    short_name: item.strHomeTeam.substring(0, 3).toUpperCase(),
                    league_type: "SOCCER"
                }
            });

            await (prisma as any).teams.upsert({
                where: { full_name: item.strAwayTeam },
                update: {},
                create: {
                    team_id: item.idAwayTeam,
                    full_name: item.strAwayTeam,
                    short_name: item.strAwayTeam.substring(0, 3).toUpperCase(),
                    league_type: "SOCCER"
                }
            });

            // 2. Upsert Match
            const match = await (prisma as any).match.upsert({
                where: { extId: item.idEvent },
                update: {
                    status: "finished",
                    homeScore,
                    awayScore,
                    matchResult,
                    date: new Date(item.strTimestamp || item.dateEvent)
                },
                create: {
                    extId: item.idEvent,
                    sport,
                    date: new Date(item.strTimestamp || item.dateEvent),
                    homeTeamId: item.idHomeTeam,
                    awayTeamId: item.idAwayTeam,
                    homeTeamName: item.strHomeTeam,
                    awayTeamName: item.strAwayTeam,
                    homeScore,
                    awayScore,
                    matchResult,
                    status: "finished"
                }
            });

            // 3. Attach Mock Odds (Required for Backtest)
            const hOdds = 1.5 + Math.random() * 2;
            const aOdds = 2.0 + Math.random() * 2;
            const dOdds = 3.0 + Math.random();

            await (prisma as any).odds.upsert({
                where: { id: `spartan-mock-${match.id}` },
                update: {},
                create: {
                    id: `spartan-mock-${match.id}`,
                    matchId: match.id,
                    provider: "theoddsapi",
                    odds_json: { home: hOdds, away: aOdds, draw: dOdds } as any
                }
            });

            // 4. Create World State Snapshots (Requirement for Feature Engine)
            await (prisma as any).eventSnapshot.create({
                data: {
                    matchId: match.id,
                    snapshot_type: "TEAM_STATE_HOME",
                    state_json: {
                        team_strength: 70 + Math.random() * 20,
                        momentum: 0.4 + Math.random() * 0.4,
                        fatigue: 0.1 + Math.random() * 0.5
                    } as any
                }
            });

            await (prisma as any).eventSnapshot.create({
                data: {
                    matchId: match.id,
                    snapshot_type: "TEAM_STATE_AWAY",
                    state_json: {
                        team_strength: 60 + Math.random() * 20,
                        momentum: 0.3 + Math.random() * 0.5,
                        fatigue: 0.2 + Math.random() * 0.6
                    } as any
                }
            });

            // 5. Compute Features (Spartan v2.0)
            await computeMatchFeatures(match.id);
        }
        console.log(`[Seed] Season ${season} complete.`);
    }

    console.log("[Seed] Spartan Seeding Complete.");
}

main()
    .catch(console.error)
    .finally(() => (prisma as any).$disconnect());
