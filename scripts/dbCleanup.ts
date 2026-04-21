import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- DB INTEGRITY CLEANUP START ---');

    const teams = await (prisma as any).teams.findMany();
    const nakedTeams = teams.filter((t: any) => !t.team_id.includes('_'));

    console.log(`Found ${nakedTeams.length} naked teams to merge.`);

    for (const naked of nakedTeams) {
        // Determine the likely namespaced target
        const leaguePrefix = naked.league_type; // e.g. 'MLB'
        const targetId = `${leaguePrefix}_${naked.team_id}`;

        const target = teams.find((t: any) => t.team_id === targetId);

        if (target) {
            console.log(`Merging ${naked.team_id} -> ${targetId}`);

            // Migrate Matches (Home)
            await (prisma as any).match.updateMany({
                where: { homeTeamId: naked.team_id },
                data: { homeTeamId: targetId }
            });

            // Migrate Matches (Away)
            await (prisma as any).match.updateMany({
                where: { awayTeamId: naked.team_id },
                data: { awayTeamId: targetId }
            });

            // Migrate Rosters
            await (prisma as any).roster.updateMany({
                where: { team_id: naked.team_id },
                data: { team_id: targetId }
            });

            // Delete Naked
            await (prisma as any).teams.delete({
                where: { team_id: naked.team_id }
            });
        } else {
            console.warn(`[SKIP] No namespaced target found for ${naked.team_id} (${naked.full_name})`);
            // If it's a legacy record like 'ATH', maybe it should be 'MLB_ATH'
            // I'll try to find by full_name
            const targetByName = teams.find((t: any) => t.team_id.includes('_') && t.full_name.includes(naked.full_name.split(' (')[0]));
            if (targetByName) {
                console.log(`Merging by name: ${naked.team_id} -> ${targetByName.team_id}`);
                // Repeat migration logic for targetByName...
                await (prisma as any).match.updateMany({ where: { homeTeamId: naked.team_id }, data: { homeTeamId: targetByName.team_id } });
                await (prisma as any).match.updateMany({ where: { awayTeamId: naked.team_id }, data: { awayTeamId: targetByName.team_id } });
                await (prisma as any).roster.updateMany({ where: { team_id: naked.team_id }, data: { team_id: targetByName.team_id } });
                await (prisma as any).teams.delete({ where: { team_id: naked.team_id } });
            }
        }
    }

    console.log('--- CLEANUP COMPLETE ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
