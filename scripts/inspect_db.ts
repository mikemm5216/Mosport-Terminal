import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const result: any = await prisma.$queryRaw`SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'Matches' OR table_name = 'Teams'`;
    console.log(result);
    try {
        const matchesFK: any = await prisma.$queryRaw`SELECT constraint_name, table_schema, table_name, column_name FROM information_schema.key_column_usage WHERE table_name = 'Matches'`;
        console.log(matchesFK);
    } catch (e) {
        console.log(e);
    }
}
main();
