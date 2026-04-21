import { prisma } from "../lib/prisma";

async function main() {
    console.log("[Seed] Populating Global Basketball & Baseball Teams...");

    const teams = [
        // NBA
        { full_name: "Los Angeles Lakers", short_name: "LAL", league_type: "NBA" },
        { full_name: "Golden State Warriors", short_name: "GSW", league_type: "NBA" },
        { full_name: "Boston Celtics", short_name: "BOS", league_type: "NBA" },
        { full_name: "Miami Heat", short_name: "MIA", league_type: "NBA" },
        // FIBA
        { full_name: "USA Basketball", short_name: "USA", league_type: "FIBA" },
        { full_name: "Spain Basketball", short_name: "ESP", league_type: "FIBA" },
        { full_name: "France Basketball", short_name: "FRA", league_type: "FIBA" },
        // MLB
        { full_name: "Los Angeles Dodgers", short_name: "LAD", league_type: "MLB" },
        { full_name: "New York Yankees", short_name: "NYY", league_type: "MLB" },
        { full_name: "Houston Astros", short_name: "HOU", league_type: "MLB" },
        { full_name: "Atlanta Braves", short_name: "ATL", league_type: "MLB" },
        // NPB
        { full_name: "Yomiuri Giants", short_name: "YOM", league_type: "NPB" },
        { full_name: "Hanshin Tigers", short_name: "HAN", league_type: "NPB" },
        // CPBL
        { full_name: "CTBC Brothers", short_name: "CTB", league_type: "CPBL" },
        { full_name: "Uni-Lions", short_name: "UNI", league_type: "CPBL" }
    ];

    for (const t of teams) {
        await (prisma as any).teams.upsert({
            where: { full_name: t.full_name },
            update: t,
            create: t
        });
    }

    console.log(`[Seed] Seeded ${teams.length} global teams.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
