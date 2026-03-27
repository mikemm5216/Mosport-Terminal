import { prisma } from "../lib/prisma";

async function main() {
    console.log("[Patch] Backfilling Pitcher Confirmation for historical baseball matches...");

    const updated = await (prisma as any).matchStatsBaseball.updateMany({
        where: { match: { status: "finished" } },
        data: { startingPitcherConfirmed: true }
    });

    console.log(`[Patch] Updated ${updated.count} records.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
