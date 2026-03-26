import { prisma } from "../lib/prisma";

async function main() {
    const count = await (prisma as any).match.count({
        where: { sport: "basketball" }
    });
    console.log(`[Status] Found ${count} basketball matches in DB.`);

    const statsCount = await (prisma as any).matchStatsNBA.count();
    console.log(`[Status] Found ${statsCount} MatchStatsNBA records in DB.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
