const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function main() {
    const teams = await prisma.teams.findMany({ select: { team_id: true } });
    const logosDir = '/Users/moyaju/.gemini/antigravity/scratch/Mosport-Terminal/public/logos';
    const files = fs.readdirSync(logosDir);
    const missing = [];

    for (const team of teams) {
        const id = team.team_id.toLowerCase();
        const hasPlain = files.some(f => f === id + '.png');
        const hasPrefixed = files.some(f => f.endsWith('_' + id + '.png'));
        if (!hasPlain && !hasPrefixed) {
            missing.push(team.team_id);
        }
    }

    console.log('Missing logos for:', missing.join(', '));

    const matchCount = await prisma.match.count();
    console.log('Current Match Count:', matchCount);
}

main().finally(() => prisma.\$disconnect());
