import { PrismaClient } from '@prisma/client';
import { ENTITY_REGISTRY } from '../src/config/entityRegistry';

const prisma = new PrismaClient();

async function main() {
    console.log("🌌 [Mosport V2] 啟動全聯盟實體資料灌頂 (Mass Seeding)...");

    let count = 0;

    for (const [hashId, entity] of Object.entries(ENTITY_REGISTRY)) {
        const parts = entity.internalCode.split('_');
        if (parts.length !== 3) continue;

        const [sportCode, weightLevel, teamCode] = parts;

        await (prisma as any).context.upsert({
            where: { internal_code: entity.internalCode },
            update: {
                name: entity.name,
                team_code: teamCode,
                sport_code: sportCode,
                weight_level: weightLevel
            },
            create: {
                internal_code: entity.internalCode,
                name: entity.name,
                team_code: teamCode,
                sport_code: sportCode,
                weight_level: weightLevel,
                public_uuid: crypto.randomUUID() // Ensure we have a public_uuid if needed, though Prisma @default(uuid()) should handle it if defined in schema.
            }
        });

        count++;
        console.log(`✅ 已註冊: ${entity.name} [${entity.internalCode}]`);
    }

    console.log(`\n🎉 灌頂完成！共註冊了 ${count} 支戰隊。`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
