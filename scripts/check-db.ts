import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('--- DB AUDIT: MATCH IDs ---');
    const signals = await (prisma as any).matchSignal.findMany({
        take: 10,
        include: { match: true }
    });
    console.log(JSON.stringify(signals, null, 2));
    console.log('--- DB AUDIT COMPLETE ---');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
