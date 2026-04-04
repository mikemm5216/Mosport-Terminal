import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const teams = await (prisma as any).teams.findMany({ select: { team_id: true, full_name: true } });
    const counts: Record<string, any[]> = {};

    teams.forEach((t: any) => {
        // Normalize name for comparison (remove league suffix)
        const base = t.full_name.split(' (')[0].trim();
        if (!counts[base]) counts[base] = [];
        counts[base].push(t);
    });

    console.log('\n--- DUPLICATE TEAM CANDIDATES ---');
    for (const [name, list] of Object.entries(counts)) {
        if (list.length > 1) {
            console.log(`\nEntity: ${name}`);
            list.forEach(t => console.group(`  - ID: ${t.team_id} | Name: ${t.full_name}`));
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
