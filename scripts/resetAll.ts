import { PrismaClient } from '@prisma/client';
import { ENTITY_REGISTRY } from '../src/config/entityRegistry';

const prisma = new PrismaClient();

async function main() {
    console.log("☢️ [Mosport V2] 啟動核彈級清洗與終極灌頂...");

    // 1. 清除所有髒資料 (消滅橫線與舊紀錄)
    await (prisma as any).statsLog.deleteMany({});
    await (prisma as any).context.deleteMany({});
    console.log("✅ 舊資料已徹底清除！");

    // 2. 完美寫入 120 支球隊 (NBA, MLB, 五大聯賽)
    let count = 0;
    for (const [hash, entity] of Object.entries(ENTITY_REGISTRY)) {
        const parts = entity.internalCode.split('_'); // [02, 01, ARS]
        await (prisma as any).context.create({
            data: {
                internal_code: entity.internalCode,
                sport_code: parts[0],
                weight_level: parts[1],
                team_code: parts[2],
                name: entity.name
            }
        });
        count++;
    }
    console.log(`✅ ${count} 支世界頂級戰隊已註冊完成！`);

    // 3. 注入展示分數 (使用正確的底線編碼)
    const lebron = await (prisma as any).player.upsert({
        where: { internal_code: 'P-L023' },
        update: {},
        create: { internal_code: 'P-L023', full_name: 'LeBron James' }
    });

    await (prisma as any).statsLog.createMany({
        data: [
            { player_internal_code: 'P-L023', context_internal_code: '03_01_LAL', metric_type: 'TEAM_SCORE', value: 102 },
            { player_internal_code: 'P-L023', context_internal_code: '03_01_GSW', metric_type: 'TEAM_SCORE', value: 98 },
            { player_internal_code: 'P-L023', context_internal_code: '01_01_LAD', metric_type: 'TEAM_SCORE', value: 14 },
            { player_internal_code: 'P-L023', context_internal_code: '01_01_NYY', metric_type: 'TEAM_SCORE', value: 5 },
        ]
    });
    console.log("✅ 展示戰局 (LAL vs GSW, LAD vs NYY) 已連線！");
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
