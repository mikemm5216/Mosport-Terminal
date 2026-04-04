import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('--- MOSPORT LOGO AUDIT START ---');

    const teams = await (prisma as any).teams.findMany();
    const logoDir = path.join(process.cwd(), 'public/logos');

    console.log(`Checking ${teams.length} teams against ${logoDir}...`);

    let missing = 0;
    for (const team of teams) {
        if (!team.logo_url) {
            console.warn(`[MISSING_URL] ${team.team_id}: ${team.full_name}`);
            continue;
        }

        // Check local file
        const localPath = path.join(process.cwd(), 'public', team.logo_url);
        if (!fs.existsSync(localPath)) {
            console.error(`[NOT_FOUND] ${team.team_id}: ${team.logo_url} (${team.full_name})`);
            missing++;
        }
    }

    console.log('--- AUDIT COMPLETE ---');
    console.log(`Total Teams: ${teams.length}`);
    console.log(`Physically Missing Assets: ${missing}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
