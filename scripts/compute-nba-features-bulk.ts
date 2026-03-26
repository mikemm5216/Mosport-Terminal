import { prisma } from "../lib/prisma";
import { computeNBAFeaturesV32 } from "../lib/features/nba_features";

async function main() {
    console.log("[Features] Starting NBA Stability Hardening feature computation (V3.2)...");

    const matches = await (prisma as any).match.findMany({
        where: { sport: "basketball", status: "finished", nbaStats: { isNot: null } },
        orderBy: { date: "asc" },
        select: { id: true, extId: true, date: true }
    });

    console.log(`[Features] Found ${matches.length} matches with real stats across seasons.`);

    let count = 0;
    for (const m of matches) {
        try {
            await computeNBAFeaturesV32(m.id);
            count++;
            if (count % 100 === 0) console.log(`[Features] Processed ${count}/${matches.length}...`);
        } catch (err) {
            console.error(`[Features] Failed match ${m.id} (${m.extId}):`, err);
        }
    }

    console.log(`[Features] Completed ${count} matches.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
