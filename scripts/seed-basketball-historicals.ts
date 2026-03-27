import { prisma } from "../lib/prisma";

async function main() {
    console.log("[Seed] Generating Global Basketball Historicals (NBA/FIBA)...");

    const teams = await (prisma as any).teams.findMany({ where: { league_type: { in: ["NBA", "FIBA"] } } });
    const leagueIds = ["NBA", "FIBA"];

    // Purge
    await (prisma as any).match.deleteMany({ where: { sport: "basketball" } });

    const matches: any[] = [];
    for (let i = 0; i < 5000; i++) {
        const leagueId = leagueIds[Math.floor(Math.random() * leagueIds.length)];
        const hIdx = Math.floor(Math.random() * teams.length);
        let aIdx = Math.floor(Math.random() * teams.length);
        while (aIdx === hIdx) aIdx = Math.floor(Math.random() * teams.length);

        const isNBA = leagueId === "NBA";
        const baseScore = isNBA ? 110 : 90;

        const hScore = baseScore + Math.floor(Math.random() * 20);
        const aScore = baseScore + Math.floor(Math.random() * 20);

        matches.push({
            id: `bbk-bulk-${i}`,
            extId: `bbk-sim-${i}`,
            date: new Date(Date.now() - (5000 - i) * 1000 * 60 * 60 * 12),
            sport: "basketball",
            leagueId: leagueId,
            homeTeamId: teams[hIdx].team_id,
            awayTeamId: teams[aIdx].team_id,
            homeTeamName: teams[hIdx].full_name,
            awayTeamName: teams[aIdx].full_name,
            homeScore: hScore,
            awayScore: aScore,
            matchResult: hScore > aScore ? "HOME_WIN" : "AWAY_WIN",
            status: "finished"
        });
    }

    // Bulk Match
    for (let i = 0; i < matches.length; i += 1000) {
        await (prisma as any).match.createMany({
            data: matches.slice(i, i + 1000),
            skipDuplicates: true
        });
    }

    // Bulk Stats
    const stats = matches.map(m => ({
        matchId: m.id,
        homeFga: 85, homeFta: 20, homeTov: 12, homeOreb: 10, homeReb: 40, homeAst: 25,
        awayFga: 85, awayFta: 20, awayTov: 12, awayOreb: 10, awayReb: 40, awayAst: 25,
        homePlayerIds: [], awayPlayerIds: []
    }));

    for (let i = 0; i < stats.length; i += 1000) {
        await (prisma as any).matchStatsNBA.createMany({
            data: stats.slice(i, i + 1000),
            skipDuplicates: true
        });
    }

    console.log("[Seed] Basketball Bulk Seeding Complete.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
