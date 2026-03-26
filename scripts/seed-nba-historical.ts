import { prisma } from "../lib/prisma";
import { computeNBAFeatures } from "../lib/features/nba_features";

async function main() {
    console.log("[Seed] Starting Concurrent NBA Scaling (Target: 1200)...");

    // 1. Teams Bulk Seed
    const teams = [];
    for (let i = 0; i < 30; i++) {
        teams.push({
            team_id: `Team_${i}`,
            full_name: `Team_${i}`,
            short_name: `T${i}`,
            league_type: "NBA"
        });
    }
    await (prisma as any).teams.createMany({
        data: teams,
        skipDuplicates: true
    });

    // 2. Matches Bulk Seed
    const matches = [];
    const target = 1200;
    for (let i = 0; i < target; i++) {
        const homeProb = (i % 2 === 0) ? 0.65 : 0.35;
        const result = Math.random() < homeProb ? "HOME_WIN" : "AWAY_WIN";
        matches.push({
            extId: `bulk-nba-${i}`,
            sport: "basketball",
            homeTeamId: `Team_${i % 30}`,
            awayTeamId: `Team_${(i + 5) % 30}`,
            homeTeamName: `Team_${i % 30}`,
            awayTeamName: `Team_${(i + 5) % 30}`,
            homeScore: result === "HOME_WIN" ? 110 : 100,
            awayScore: result === "AWAY_WIN" ? 110 : 100,
            matchResult: result,
            status: "finished",
            date: new Date(Date.now() - (target - i) * 3600 * 24 * 1000)
        });
    }

    await (prisma as any).match.createMany({
        data: matches,
        skipDuplicates: true
    });

    console.log("[Seed] Bulk matches created. Fetching IDs...");

    const matchRecords = await (prisma as any).match.findMany({
        where: { extId: { startsWith: "bulk-nba-" } },
        select: { id: true }
    });

    console.log(`[Seed] Processing ${matchRecords.length} features concurrently...`);

    // 3. Concurrent Processing (Limit 50)
    const limit = 50;
    for (let i = 0; i < matchRecords.length; i += limit) {
        const batch = matchRecords.slice(i, i + limit);
        await Promise.all(batch.map(m => computeNBAFeatures(m.id)));
        console.log(`[Seed] Progress: ${i + batch.length}/${matchRecords.length}`);
    }

    console.log(`[Seed] NBA Concurrent Scaling Complete.`);
}

main().catch(console.error).finally(() => (prisma as any).$disconnect());
