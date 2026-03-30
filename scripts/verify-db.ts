import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DB AUDIT: FINAL GENESIS VERIFICATION ---');

    const teams = await prisma.teams.findMany({
        orderBy: { team_id: 'asc' },
        select: { team_id: true, full_name: true, league_type: true }
    });

    console.log('\n[TEAMS TABLE]');
    console.table(teams);

    const matches = await (prisma as any).match.findMany({
        take: 5,
        select: { extId: true, homeTeamId: true, awayTeamId: true, status: true }
    });

    console.log('\n[MATCHES TABLE (SAMPLES)]');
    console.table(matches);

    const predictions = await prisma.matchPrediction.count();
    console.log(`\n[PREDICTIONS COUNT]: ${predictions}`);
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
