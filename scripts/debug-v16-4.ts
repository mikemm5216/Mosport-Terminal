import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const players = await prisma.player.findMany({ take: 2 });
    console.log("PLAYERS:", JSON.stringify(players, null, 2));

    const signals = await (prisma as any).matchSignal.findMany({ take: 1 });
    console.log("SIGNALS:", JSON.stringify(signals, null, 2));
}

main().finally(() => prisma.$disconnect());
