const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const matchCount = await prisma.matches.count();
    const rawCount = await prisma.rawEvents.count();
    const ingestionStates = await prisma.ingestionState.findMany();

    console.log("--- Database Counts ---");
    console.log(`Matches: ${matchCount}`);
    console.log(`RawEvents: ${rawCount}`);
    console.log("--- Ingestion States ---");
    ingestionStates.forEach(s => {
        console.log(`- ${s.sport} / ${s.league}: ${s.status} (Page: ${s.currentPage})`);
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
