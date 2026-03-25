import { prisma } from "../lib/prisma";

async function main() {
    const providers = ["thesportsdb", "theoddsapi"];
    const leagues = [
        { sport: "Football", league: "English Premier League" },
        { sport: "Football", league: "La Liga" }
    ];

    for (const provider of providers) {
        for (const { sport, league } of leagues) {
            await prisma.ingestionState.upsert({
                where: { provider_sport_league: { provider, sport, league } },
                update: { currentPage: 1, status: "pending" },
                create: { provider, sport, league, currentPage: 1, status: "pending" }
            });
            console.log(`Seeded IngestionState: ${provider} - ${sport} - ${league}`);
        }
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
