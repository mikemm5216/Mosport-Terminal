import { prisma } from "../lib/prisma";
import { TheSportsDBAdapter } from "../lib/ingest/adapters/thesportsdb";
import { computeMatchFeatures } from "../lib/features/computeFeatures";
import { execSync } from "child_process";

async function main() {
    console.log("[Seed] Starting historical data seeding...");

    const adapter = new TheSportsDBAdapter();
    const sport = "football";
    const league = "English Premier League";
    const seasons = ["2023-2024", "2024-2025"];

    for (const season of seasons) {
        console.log(`[Seed] Fetching historical matches for ${league} season ${season}...`);

        // Custom URL for specific season
        const leagueId = "4328"; // EPL
        const url = `https://www.thesportsdb.com/api/v1/json/${process.env.THE_SPORTS_DB_API_KEY || "3"}/eventsseason.php?id=${leagueId}&s=${season}`;

        const response = await fetch(url);
        const dataJson = await response.json();
        const data = dataJson.events || [];

        console.log(`[Seed] Found ${data.length} matches in season ${season}.`);

        for (const item of data) {
            if (item.strStatus !== "Match Finished") continue;

            const normalized = adapter.normalize(item, {
                sport,
                league,
                currentPage: 1
            });

            // 2. Upsert Match
            console.log(`[Seed] Processing: ${normalized.homeTeam} vs ${normalized.awayTeam} (${normalized.startTime})...`);

            const match = await prisma.matches.upsert({
                where: { extId: normalized.extId },
                update: {
                    status: "finished",
                    home_score: parseInt(item.intHomeScore),
                    away_score: parseInt(item.intAwayScore),
                    match_date: new Date(normalized.startTime)
                },
                create: {
                    match_id: normalized.extId,
                    extId: normalized.extId,
                    sport,
                    league,
                    home_team_id: item.idHomeTeam,
                    away_team_id: item.idAwayTeam,
                    match_date: new Date(normalized.startTime),
                    status: "finished",
                    home_score: parseInt(item.intHomeScore),
                    away_score: parseInt(item.intAwayScore)
                }
            });

            // 3. Attach Mock Odds
            const homeOdds = 1.5 + Math.random() * 2;
            const awayOdds = 1.5 + Math.random() * 2;
            const drawOdds = 3.0 + Math.random();

            await prisma.odds.upsert({
                where: { id: `mock-${match.match_id}` },
                update: {},
                create: {
                    id: `mock-${match.match_id}`,
                    matchId: match.match_id,
                    provider: "theoddsapi",
                    odds_json: {
                        home: homeOdds,
                        away: awayOdds,
                        draw: drawOdds,
                        market: "H2H"
                    } as any,
                    fetched_at: new Date()
                }
            });

            // 4. Compute Features (Deltas)
            // First ENSURE team state snapshots exist (Simulate WorldState)
            // Use TEAM_STATE_HOME and TEAM_STATE_AWAY linked to the match_id
            await prisma.eventSnapshot.create({
                data: {
                    match_id: match.match_id,
                    snapshot_type: "TEAM_STATE_HOME",
                    state_json: {
                        team_strength: 70 + Math.random() * 20,
                        momentum: 0.4 + Math.random() * 0.4,
                        fatigue: 0.1 + Math.random() * 0.5
                    } as any
                }
            });

            await prisma.eventSnapshot.create({
                data: {
                    match_id: match.match_id,
                    snapshot_type: "TEAM_STATE_AWAY",
                    state_json: {
                        team_strength: 60 + Math.random() * 20,
                        momentum: 0.3 + Math.random() * 0.5,
                        fatigue: 0.2 + Math.random() * 0.6
                    } as any
                }
            });

            await computeMatchFeatures(match.match_id);
        }
        console.log(`[Seed] Season ${season} complete.`);
    }

    console.log("[Seed] All historical data seeded successfully.");
    console.log("[Seed] Ready for Training Engine.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
