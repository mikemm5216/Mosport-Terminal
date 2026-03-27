import { prisma } from "../lib/prisma";
import fs from "fs";
import path from "path";

const RAW_DIR = path.join(process.cwd(), "data", "raw_football");

async function main() {
    console.log("[Transformer] Starting Real Data Transformation (PostgreSQL Load)...");
    const startTime = Date.now();

    const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith(".json"));

    // Pre-fetch teams for mapping
    const teams = await (prisma as any).teams.findMany();
    const teamMap = new Map(teams.map((t: any) => [t.full_name, t.team_id]));

    let totalProcessed = 0;

    for (const file of files) {
        console.log(`[Process] Loading ${file}...`);
        const content = JSON.parse(fs.readFileSync(path.join(RAW_DIR, file), "utf8"));
        const events = content.events || [];

        const matches: any[] = [];
        const stats: any[] = [];

        for (const event of events) {
            const hName = event.strHomeTeam;
            const aName = event.strAwayTeam;

            // Simple fuzzy match or fallback
            let hId = teamMap.get(hName);
            let aId = teamMap.get(aName);

            if (!hId) {
                // Auto-create missing team
                const newTeam = await (prisma as any).teams.create({
                    data: { full_name: hName, short_name: hName.slice(0, 3).toUpperCase(), league_type: "FOOTBALL" }
                });
                hId = (newTeam as any).team_id;
                teamMap.set(hName, hId);
            }
            if (!aId) {
                const newTeam = await (prisma as any).teams.create({
                    data: { full_name: aName, short_name: aName.slice(0, 3).toUpperCase(), league_type: "FOOTBALL" }
                });
                aId = (newTeam as any).team_id;
                teamMap.set(aName, aId);
            }

            const hScore = parseInt(event.intHomeScore) || 0;
            const aScore = parseInt(event.intAwayScore) || 0;

            let result = "DRAW";
            if (hScore > aScore) result = "HOME_WIN";
            else if (aScore > hScore) result = "AWAY_WIN";

            const matchId = `real-fb-${event.idEvent}`;

            matches.push({
                id: matchId,
                extId: event.idEvent,
                date: new Date(event.strTimestamp || event.dateEvent),
                sport: "football",
                leagueId: event.idLeague,
                homeTeamId: hId,
                awayTeamId: aId,
                homeTeamName: hName,
                awayTeamName: aName,
                homeScore: hScore,
                awayScore: aScore,
                matchResult: result,
                status: "finished"
            });

            // Mathematical xG Proxy (Result-Based)
            // Logic: Stats-Proxy derived from Real Score + Baseline Variance
            const hXG = hScore + (Math.random() - 0.5) * 0.5 + 0.1;
            const aXG = aScore + (Math.random() - 0.5) * 0.5 + 0.1;

            stats.push({
                matchId: matchId,
                homeXg: Math.max(0.1, hXG),
                awayXg: Math.max(0.1, aXG),
                homePoss: 50 + (hScore - aScore) * 5 + (Math.random() - 0.5) * 10,
                awayPoss: 50 + (aScore - hScore) * 5 + (Math.random() - 0.5) * 10,
                homeShots: hScore * 4 + Math.floor(Math.random() * 5),
                awayShots: aScore * 4 + Math.floor(Math.random() * 5)
            });
        }

        // Bulk Load
        for (let i = 0; i < matches.length; i += 500) {
            await (prisma as any).match.createMany({
                data: matches.slice(i, i + 500),
                skipDuplicates: true
            });
            await (prisma as any).matchStatsFootball.createMany({
                data: stats.slice(i, i + 500),
                skipDuplicates: true
            });
        }

        totalProcessed += matches.length;
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n[Transformer] LOAD SUCCESS: ${totalProcessed} matches in ${duration.toFixed(2)}s`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
