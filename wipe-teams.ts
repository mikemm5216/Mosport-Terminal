import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Wiping Teams for Clean Ingestion ---');
  // Only wiping Team (singular) and Teams (plural) to force re-ingest with dictionary
  await prisma.team.deleteMany({});
  await prisma.teams.deleteMany({});
  console.log('--- Wipe Complete ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
