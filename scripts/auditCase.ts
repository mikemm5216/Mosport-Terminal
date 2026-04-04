import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const ids = ['EPL_AVL', 'EPL_BUR', 'EPL_LEE', 'EPL_SUN', 'MLB_NYY'];
    const teams = await (prisma as any).teams.findMany({
        where: { team_id: { in: ids } },
        select: { team_id: true, logo_url: true }
    });
    console.log("--- DB AUDIT ---");
    teams.forEach((t: any) => console.log(`${t.team_id}: ${t.logo_url}`));
}

main().finally(() => prisma.$disconnect());
