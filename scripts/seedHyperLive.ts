import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("🚀 [Mosport Hyper-Drive] 啟動全量賽事噴發...");
    const teams = await prisma.context.findMany();

    if (teams.length === 0) {
        console.log("❌ 找不到球隊，請先確保 entityRegistry 已經載入 DB。");
        return;
    }

    // DROP LEGACY CONSTRAINTS to allow Mosport V11.5 direct node internal_code
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Matches" DROP CONSTRAINT IF EXISTS "Matches_home_team_id_fkey"`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Matches" DROP CONSTRAINT IF EXISTS "Matches_away_team_id_fkey"`);
    } catch (e) { }

    // 我們不再兩兩一對，我們要瘋狂交叉對戰！
    for (const team of teams) {
        for (let i = 0; i < 3; i++) {
            const opponent = teams[Math.floor(Math.random() * teams.length)];
            if (opponent.internal_code === team.internal_code) continue;

            const statusOptions = ['IN_PLAY', 'SCHEDULED', 'COMPLETED'];
            const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];

            const extId = `HYPER-${team.team_code}-${opponent.team_code}-${Date.now()}-${i}`;
            const matchDate = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
            const homeScore = Math.floor(Math.random() * 10);
            const awayScore = Math.floor(Math.random() * 10);

            const sportCode = team.sport_code || 'TEST';

            await prisma.$executeRaw`
        INSERT INTO "Matches" 
        (match_id, "extId", match_date, sport, home_team_id, away_team_id, "homeTeamName", "awayTeamName", home_score, away_score, status, created_at, updated_at) 
        VALUES 
        (${extId}, ${extId}, ${matchDate}, ${sportCode}, ${team.internal_code}, ${opponent.internal_code}, ${team.name}, ${opponent.name}, ${homeScore}, ${awayScore}, ${status}, NOW(), NOW())
      `;
        }
    }

    const result: any = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Matches"`;
    console.log(`✅ 轟炸完成！目前戰情室共有 ${Number(result[0].count)} 場比賽在跳動！`);
}

main().finally(() => prisma.$disconnect());
