const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const jobs = [
        // Phase 1: Football
        { sport: "football", league: "English Premier League" },
        { sport: "football", league: "UEFA Champions League" },
        { sport: "football", league: "La Liga" },

        // Phase 2: Basketball
        { sport: "basketball", league: "NBA" },

        // Phase 3: Baseball
        { sport: "baseball", league: "MLB" },
    ];

    console.log("Seeding IngestionState...");

    for (const job of jobs) {
        await prisma.ingestionState.upsert({
            where: { sport_league: { sport: job.sport, league: job.league } },
            update: {},
            create: {
                sport: job.sport,
                league: job.league,
                status: "pending",
                currentPage: 1,
            },
        });
        console.log(`- Seeded ${job.sport} / ${job.league}`);
    }

    console.log("Seeding complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
