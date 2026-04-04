import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
    const teams = await (prisma as any).teams.findMany({
        where: {
            OR: [
                { team_id: { startsWith: 'MLB_NY' } },
                { team_id: { startsWith: 'EPL_' } }
            ]
        },
        select: { team_id: true, full_name: true, logo_url: true }
    });
    console.log(JSON.stringify(teams, null, 2));
}
main().finally(() => prisma.$disconnect());
