import { prisma } from "../lib/prisma";

async function main() {
    console.log("[Seed] Generating High-Fidelity Baseball Historicals (MLB/CPBL/NPB)...");

    const teams = await (prisma as any).teams.findMany({ where: { league_type: "MLB" } }); // Use MLB teams for simulation
    const leagueIds = ["MLB", "CPBL", "NPB", "KBO"];

    // Purge old
    await (prisma as any).match.deleteMany({ where: { sport: "baseball" } });

    const matches: any[] = [];
    for (let i = 0; i < 5000; i++) {
        const leagueId = leagueIds[Math.floor(Math.random() * leagueIds.length)];
        const hIdx = Math.floor(Math.random() * teams.length);
        let aIdx = Math.floor(Math.random() * teams.length);
        while (aIdx === hIdx) aIdx = Math.floor(Math.random() * teams.length);

        const hWRC = 80 + Math.random() * 40;
        const aWRC = 80 + Math.random() * 40;
        const hXFIP = 3.0 + Math.random() * 2.0;
        const aXFIP = 3.0 + Math.random() * 2.0;

        // Simulate score with more resolution to avoid too many ties
        let hScore = Math.floor(hWRC / 10 + (10 - hXFIP * 2) + Math.random() * 2);
        let aScore = Math.floor(aWRC / 10 + (10 - aXFIP * 2) + Math.random() * 2);

        let result = "HOME_WIN";
        if (aScore > hScore) result = "AWAY_WIN";
        else if (hScore === aScore) {
            if (leagueId === "MLB") {
                if (Math.random() > 0.5) hScore++; else aScore++;
                result = hScore > aScore ? "HOME_WIN" : "AWAY_WIN";
            } else {
                // EXTREME IMBALANCE: Asian Leagues draw < 5%
                if (Math.random() < 0.05) {
                    result = "DRAW";
                } else {
                    // Simulate Extras
                    if (Math.random() > 0.5) hScore++; else aScore++;
                    result = hScore > aScore ? "HOME_WIN" : "AWAY_WIN";
                }
            }
        } else {
            // Rare random draw injection just in case scores are too dispersed
            if (leagueId !== "MLB" && Math.random() < 0.02) {
                result = "DRAW";
                aScore = hScore;
            }
        }

        matches.push({
            id: `bb-bulk-${i}`,
            extId: `bb-sim-${i}`,
            date: new Date(Date.now() - (5000 - i) * 1000 * 60 * 60 * 24),
            sport: "baseball",
            leagueId: leagueId,
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
        homeStarterId: `p-${Math.floor(Math.random() * 100)}`,
        awayStarterId: `p-${Math.floor(Math.random() * 100)}`,
        homeXFIP: 3.5 + Math.random(),
        awayXFIP: 3.5 + Math.random(),
        homeWRC: 100 + Math.random() * 10,
        awayWRC: 100 + Math.random() * 10
    }));

    for (let i = 0; i < stats.length; i += 1000) {
        await (prisma as any).matchStatsBaseball.createMany({
            data: stats.slice(i, i + 1000),
            skipDuplicates: true
        });
    }

    console.log("[Seed] Baseball Bulk Seeding Complete.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
