import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("⏱️ [Mosport Time Machine] 啟動冷熱數據灌頂程序...");

    // Ensure system players exist
    await prisma.player.upsert({
        where: { internal_code: 'SYSTEM_QUANT' },
        update: {},
        create: { internal_code: 'SYSTEM_QUANT', full_name: 'SYSTEM QUANT' }
    });
    await prisma.player.upsert({
        where: { internal_code: 'SYSTEM_LIVE' },
        update: {},
        create: { internal_code: 'SYSTEM_LIVE', full_name: 'SYSTEM LIVE' }
    });

    // 1. 取得所有球隊
    const teams = await prisma.context.findMany();

    if (teams.length === 0) {
        console.log("❌ 找不到球隊，請先確保 entityRegistry 已經載入 DB。");
        return;
    }

    let hotCount = 0;
    let coldCount = 0;

    for (const team of teams) {
        // 🥶 寫入 5 場「冷數據 (Cold Data)」(超過 24 小時，歷史回測用)
        for (let i = 2; i <= 6; i++) {
            const coldDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000); // 2~6天前
            await prisma.statsLog.create({
                data: {
                    player_internal_code: 'SYSTEM_QUANT',
                    context_internal_code: team.internal_code,
                    metric_type: 'MATCH_SCORE',
                    value: Math.floor(Math.random() * 5) + 1, // 隨機比分
                    timestamp: coldDate
                }
            });
            coldCount++;
        }

        // 🔥 寫入 1 場「熱數據 (Hot Data)」(24 小時內，首頁展示用)
        const hotDate = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6小時前
        await prisma.statsLog.create({
            data: {
                player_internal_code: 'SYSTEM_LIVE',
                context_internal_code: team.internal_code,
                metric_type: 'MATCH_SCORE',
                value: Math.floor(Math.random() * 5) + 1,
                timestamp: hotDate
            }
        });
        hotCount++;

        console.log(`✅ ${team.team_code} : 已注入 1 熱 / 5 冷 數據。`);
    }

    console.log("========================================");
    console.log(`🎉 數據宇宙爆發完畢！`);
    console.log(`🔥 產生熱數據 (24H內): ${hotCount} 筆`);
    console.log(`🥶 產生冷數據 (歷史): ${coldCount} 筆`);
    console.log("========================================");
}

main().finally(() => prisma.$disconnect());
