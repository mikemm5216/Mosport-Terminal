import { prisma } from "../lib/prisma";
import { computeNBAFeaturesHardened } from "../lib/features/nba_features";

async function main() {
    console.log("[Features] Starting hardened NBA feature computation (V3.3)...");

    const matches = await (prisma as any).match.findMany({
        where: { sport: "basketball", status: "finished", nbaStats: { isNot: null } },
        orderBy: { date: "asc" },
        select: { id: true, extId: true, date: true }
    });

    console.log(`[Features] Found ${matches.length} matches with real stats.`);

    let count = 0;
    for (const m of matches) {
        try {
            await computeNBAFeaturesHardened(m.id);
            count++;
            if (count % 100 === 0) console.log(`[Features] Processed ${count}/${matches.length}...`);
        } catch (err) {
            console.error(`[Features] Failed match ${m.id} (${m.extId}):`, err);
        }
    }

    console.log(`[Features] Completed ${count} matches.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
