import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DB FIX: DOD -> LAD ---');

    // 1. Update Matches
    await (prisma as any).match.updateMany({
        where: { homeTeamId: 'DOD' },
        data: { homeTeamId: 'LAD' }
    });

    await (prisma as any).match.updateMany({
        where: { awayTeamId: 'DOD' },
        data: { awayTeamId: 'LAD' }
    });

    // 2. Delete old DOD if it exists
    try {
        await prisma.teams.delete({
            where: { team_id: 'DOD' }
        });
        console.log('Deleted obsolete DOD team.');
    } catch (e) {
        console.log('DOD team already purged or not found.');
    }

    console.log('--- DB FIX COMPLETE ---');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
