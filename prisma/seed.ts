import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 [Mosport V2] 啟動上帝創世模式 (Seeding)...");

  // 1. 建立兩個情境 (季賽 vs 國際賽)
  const contextYankees = await (prisma as any).context.upsert({
    where: { internal_code: '01-01-NYY' },
    update: {},
    create: { internal_code: '01-01-NYY', sport_code: '01', weight_level: '01', team_code: 'NYY', name: 'New York Yankees' }
  });
  const contextUSA = await (prisma as any).context.upsert({
    where: { internal_code: '01-11-USA' },
    update: {},
    create: { internal_code: '01-11-USA', sport_code: '01', weight_level: '11', team_code: 'USA', name: 'Team USA (WBC)' }
  });

  // 2. 建立球員護照 (法官)
  const playerJudge = await (prisma as any).player.upsert({
    where: { internal_code: 'P-J001' },
    update: {},
    create: { internal_code: 'P-J001', full_name: 'Aaron Judge' }
  });

  // 3. 灌入黃金數據流 (StatsLog)
  // Note: createMany might not be supported in all environments with multi-schema or specific providers easily in one go, 
  // but let's try or use create.
  await (prisma as any).statsLog.createMany({
    data: [
      { player_internal_code: playerJudge.internal_code, context_internal_code: contextYankees.internal_code, metric_type: 'HOME_RUN', value: 58, timestamp: new Date() },
      { player_internal_code: playerJudge.internal_code, context_internal_code: contextUSA.internal_code, metric_type: 'HOME_RUN', value: 4, timestamp: new Date() }
    ],
    skipDuplicates: true
  });

  console.log("✅ V2 測試數據灌入完成！");
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
