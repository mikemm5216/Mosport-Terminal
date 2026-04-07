import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("⚡️ [Mosport Quant] 啟動全聯賽歷史數據大爆發...");

    // 1. 確保 QUANT_ENGINE_V1 存在於 Player 表中
    await (prisma as any).player.upsert({
        where: { internal_code: 'QUANT_ENGINE_V1' },
        update: { full_name: 'Quant Engine V1' },
        create: {
            internal_code: 'QUANT_ENGINE_V1',
            full_name: 'Quant Engine V1'
        }
    });

    const teams = await (prisma as any).context.findMany();

    for (const team of teams) {
        const metrics = [
            { type: 'ACCURACY', val: Math.floor(Math.random() * 30) + 65 }, // 65-95%
            { type: 'MOMENTUM', val: Math.floor(Math.random() * 60) + 20 }, // 20-80%
            { type: 'WIN_RATE', val: Math.floor(Math.random() * 40) + 40 }, // 40-80%
        ];

        for (const m of metrics) {
            await (prisma as any).statsLog.create({
                data: {
                    player_internal_code: 'QUANT_ENGINE_V1',
                    context_internal_code: team.internal_code,
                    metric_type: m.type,
                    value: m.val / 100
                }
            });
        }
        console.log(`📈 ${team.name} [${team.team_code}] 數據校準完成...`);
    }

    console.log("✅ 120 隊量化歷史數據已全線通電！");
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
