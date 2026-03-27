import { prisma } from "../lib/prisma";

async function main() {
    console.log("[Seed] Populating Global League Metadata...");

    const leagues = [
        { id: "EPL", sport: "football", hasDraw: true, matchDuration: 90, isKnockout: false },
        { id: "LL", sport: "football", hasDraw: true, matchDuration: 90, isKnockout: false },
        { id: "WC", sport: "football", hasDraw: true, matchDuration: 90, isKnockout: true },
        { id: "NBA", sport: "basketball", hasDraw: false, matchDuration: 48, isKnockout: false },
        { id: "FIBA", sport: "basketball", hasDraw: false, matchDuration: 40, isKnockout: false },
        { id: "MLB", sport: "baseball", hasDraw: false, matchDuration: 9, isKnockout: false },
        { id: "CPBL", sport: "baseball", hasDraw: true, matchDuration: 9, isKnockout: false },
        { id: "NPB", sport: "baseball", hasDraw: true, matchDuration: 9, isKnockout: false },
        { id: "KBO", sport: "baseball", hasDraw: true, matchDuration: 9, isKnockout: false }
    ];

    for (const l of leagues) {
        await (prisma as any).league.upsert({
            where: { id: l.id },
            update: l,
            create: l
        });
    }

    console.log(`[Seed] Successfully seeded ${leagues.length} leagues.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
