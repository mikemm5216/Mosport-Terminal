import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const teams = await (prisma as any).teams.findMany();
    console.log(`Auditing ${teams.length} teams...`);

    for (const team of teams) {
        const league = team.league_type.toLowerCase();
        const short = team.short_name.toLowerCase();

        // Correct path logic: /logos/${league}_${short}.png
        const targetLogo = `/logos/${league}_${short}.png`;

        if (team.logo_url !== targetLogo) {
            console.log(`[FIX] ${team.team_id}: ${team.logo_url} -> ${targetLogo}`);
            await (prisma as any).teams.update({
                where: { team_id: team.team_id },
                data: { logo_url: targetLogo }
            });
        }
    }
}

main().finally(() => prisma.$disconnect());
