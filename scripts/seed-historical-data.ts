import { prisma } from "../lib/prisma";
import { TheSportsDBAdapter } from "../lib/ingest/adapters/thesportsdb";
import { computeMatchFeatures } from "../lib/features/computeFeatures";
import { execSync } from "child_process";

async function main() {
    console.log("[Seed] Starting historical data seeding...");

    const adapter = new TheSportsDBAdapter();
    const sport = "football";
    const league = "English Premier League";

    // 1. Fetch Historical Matches (Last 15 via eventslast.php as a baseline)
    // In a real scenario, we might use eventsseason.php for more.
    console.log(`[Seed] Fetching historical matches for ${league}...`);

    // Using default job structure for adapter
    const { data } = await adapter.fetchPage({
        sport,
        league,
        currentPage: 1
    });

    console.log(`[Seed] Found ${data.length} matches.`);

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

    console.log("[Seed] Historical data seeded successfully.");

    // 5. Auto-Run Backtest
    console.log("[Seed] Triggering Backtest...");
    try {
        const output = execSync("npx tsx scripts/run-backtest.ts", { encoding: "utf-8" });
        console.log(output);
    } catch (err: any) {
        console.error("[Seed] Backtest failed:", err.message);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
