import { PrismaClient } from '@prisma/client';
import { ENTITY_REGISTRY } from '../src/config/entityRegistry';

const prisma = new PrismaClient();

async function main() {
    console.log("⚽️ [Mosport] 正在注入五大聯賽即時戰況...");

    // 1. 確保 SYSTEM_BOT 存在於 Player 表中，滿足外鍵約束
    await (prisma as any).player.upsert({
        where: { internal_code: 'SYSTEM_BOT' },
        update: { full_name: 'Mosport System Bot' },
        create: {
            internal_code: 'SYSTEM_BOT',
            full_name: 'Mosport System Bot'
        }
    });

    // 2. 注入即時數據
    const liveScenarios = [
        { code: '02_01_RMA', score: 2, momentum: 88 }, // 皇馬
        { code: '02_01_BAR', score: 1, momentum: 42 }, // 巴薩
        { code: '02_01_MCI', score: 3, momentum: 95 }, // 曼城
        { code: '02_01_ARS', score: 3, momentum: 91 }, // 兵工廠
    ];

    for (const s of liveScenarios) {
        // 確保 Context 存在 (雖然 seedTeams 應該做過了)
        const context = await (prisma as any).context.findUnique({
            where: { internal_code: s.code }
        });

        if (!context) {
            console.warn(`⚠️ 找不到 Context: ${s.code}，跳過...`);
            continue;
        }

        await (prisma as any).statsLog.create({
            data: {
                player_internal_code: 'SYSTEM_BOT',
                context_internal_code: s.code,
                metric_type: 'TEAM_SCORE',
                value: s.score
            }
        });

        await (prisma as any).statsLog.create({
            data: {
                player_internal_code: 'SYSTEM_BOT',
                context_internal_code: s.code,
                metric_type: 'MOMENTUM',
                value: s.momentum / 100
            }
        });

        console.log(`✅ 已注入: ${s.code} (Score: ${s.score}, Momentum: ${s.momentum}%)`);
    }
    console.log("🚀 所有戰況注入成功！");
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
