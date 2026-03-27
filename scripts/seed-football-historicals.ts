import { prisma } from "../lib/prisma";

async function main() {
    console.log("[Seed] Generating High-Speed Football Historicals (5000 matches)...");

    const teams = await (prisma as any).teams.findMany({ where: { league_type: "FOOTBALL" } });
    const leagueIds = ["EPL", "LL", "WC"];

    // 1. HARD PURGE
    console.log("[Seed] Purging existing football data...");
    await (prisma as any).match.deleteMany({ where: { sport: "football" } });

    const matches: any[] = [];
    for (let i = 0; i < 5000; i++) {
        const hIdx = Math.floor(Math.random() * teams.length);
        let aIdx = Math.floor(Math.random() * teams.length);
        while (aIdx === hIdx) aIdx = Math.floor(Math.random() * teams.length);

        const hXG = 0.5 + Math.random() * 2.5;
        const aXG = 0.5 + Math.random() * 2.0;
        const hScore = Math.floor(hXG + (Math.random() > 0.8 ? 1 : 0));
        const aScore = Math.floor(aXG + (Math.random() > 0.8 ? 1 : 0));

        let result = "DRAW";
        if (hScore > aScore) result = "HOME_WIN";
        if (aScore > hScore) result = "AWAY_WIN";

        matches.push({
            id: `fb-bulk-${i}`,
            extId: `fb-sim-${i}`,
            date: new Date(Date.now() - (5000 - i) * 1000 * 60 * 60 * 12),
            sport: "football",
            leagueId: leagueIds[Math.floor(Math.random() * leagueIds.length)],
            homeTeamId: teams[hIdx].team_id,
            awayTeamId: teams[aIdx].team_id,
            homeTeamName: teams[hIdx].full_name,
            awayTeamName: teams[aIdx].full_name,
            homeScore: hScore,
            awayScore: aScore,
            matchResult: result,
            status: "finished"
        });
    }

    // 2. Insert Matches in Chunks
    console.log("[Seed] Inserting matches...");
    for (let i = 0; i < matches.length; i += 1000) {
        await (prisma as any).match.createMany({
            data: matches.slice(i, i + 1000),
            skipDuplicates: true
        });
    }

    // 3. Insert Stats in Chunks
    console.log("[Seed] Inserting stats...");
    const stats = matches.map(m => ({
        matchId: m.id,
        homeXG: 0.5 + Math.random() * 2.5,
        awayXG: 0.5 + Math.random() * 2.0,
        homePoss: 45 + Math.random() * 15,
        awayPoss: 40 + Math.random() * 10,
        homeShots: 10,
        awayShots: 8,
        homeSot: 4,
        awaySot: 3
    }));

    for (let i = 0; i < stats.length; i += 1000) {
        await (prisma as any).matchStatsFootball.createMany({
            data: stats.slice(i, i + 1000),
            skipDuplicates: true
        });
    }

    console.log("[Seed] Football Bulk Seeding Complete.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
