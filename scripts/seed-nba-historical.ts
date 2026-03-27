import { prisma } from "../lib/prisma";

const RAW_URL = "https://raw.githubusercontent.com/NocturneBear/NBA-Data-2010-2024/main/regular_season_totals_2010_2024.csv";

async function main() {
    console.log("[Seed] Fetching real NBA dataset (2021-2024)...");
    const res = await fetch(RAW_URL);
    if (!res.ok) throw new Error(`Failed: ${res.statusText}`);

    const text = await res.text();
    const lines = text.split("\n");
    const seasons = ["2021-22", "2022-23", "2023-24"];
    const matchesMap = new Map<string, any>();

    console.log("[Seed] Parsing multiple seasons...");
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",");
        if (!seasons.includes(cols[0])) continue;

        const gameId = cols[4];
        if (!gameId) continue;

        const date = new Date(cols[5]);
        const matchup = cols[6];
        const isHome = matchup.includes("vs.");
        const teamName = cols[3];
        const pts = parseInt(cols[26]);

        const stats = {
            fga: parseInt(cols[10]) || 0,
            fta: parseInt(cols[16]) || 0,
            tov: parseInt(cols[24]) || 0,
            oreb: parseInt(cols[18]) || 0,
            trb: parseInt(cols[20]) || 0,
            ast: parseInt(cols[21]) || 0,
            pts: pts || 0
        };

        const players = cols.slice(34).filter((x: string) => x && x.trim() !== "").map((x: string) => x.trim());

        if (!matchesMap.has(gameId)) {
            matchesMap.set(gameId, { gameId, date, season: cols[0] });
        }

        const game = matchesMap.get(gameId);
        if (isHome) {
            game.homeTeamName = teamName;
            game.homeScore = pts;
            game.homeStats = stats;
            game.homePlayers = players;
        } else {
            game.awayTeamName = teamName;
            game.awayScore = pts;
            game.awayStats = stats;
            game.awayPlayers = players;
        }
    }

    const allData = Array.from(matchesMap.values()).filter(g => g.homeTeamName && g.awayTeamName);
    console.log(`[Seed] Processing ${allData.length} records...`);

    // 1. Teams (Small set)
    const teams = new Set<string>();
    allData.forEach(g => { teams.add(g.homeTeamName); teams.add(g.awayTeamName); });
    for (const teamName of Array.from(teams)) {
        await prisma.teams.upsert({
            where: { full_name: teamName },
            update: {},
            create: { full_name: teamName, short_name: teamName.substring(0, 3).toUpperCase(), league_type: "NBA" }
        });
    }

    const teamMap = new Map();
    const dbTeams = await prisma.teams.findMany({ where: { league_type: "NBA" } });
    dbTeams.forEach(t => teamMap.set(t.full_name, t.team_id));

    // 2. Batch Matches (Chunked 500)
    const matchRecords = allData.map(g => ({
        extId: `nba-real-${g.gameId}`,
        sport: "basketball",
        date: g.date,
        homeTeamId: teamMap.get(g.homeTeamName),
        awayTeamId: teamMap.get(g.awayTeamName),
        homeTeamName: g.homeTeamName,
        awayTeamName: g.awayTeamName,
        homeScore: g.homeScore,
        awayScore: g.awayScore,
        matchResult: g.homeScore > g.awayScore ? "HOME_WIN" : "AWAY_WIN",
        status: "finished"
    }));

    console.log("[Seed] Batching matches (500 chunks)...");
    for (let i = 0; i < matchRecords.length; i += 500) {
        const chunk = matchRecords.slice(i, i + 500);
        // @ts-ignore
        await prisma.match.createMany({ data: chunk, skipDuplicates: true });
    }

    const dbMatches = await (prisma as any).match.findMany({
        where: { extId: { startsWith: "nba-real-" } },
        select: { id: true, extId: true }
    });
    const matchIdMap = new Map();
    dbMatches.forEach(m => matchIdMap.set(m.extId, m.id));

    // 3. Refresh Stats (Chunked 500)
    console.log("[Seed] Refreshing MatchStatsNBA...");
    // @ts-ignore
    await prisma.matchStatsNBA.deleteMany({
        where: { matchId: { in: Array.from(matchIdMap.values()) } }
    });

    const statsRecords = allData.map(g => {
        const matchId = matchIdMap.get(`nba-real-${g.gameId}`);
        if (!matchId) return null;
        return {
            matchId,
            homeFga: g.homeStats.fga, homeFta: g.homeStats.fta, homeTov: g.homeStats.tov, homeOreb: g.homeStats.oreb,
            homeReb: g.homeStats.trb, homeAst: g.homeStats.ast,
            awayFga: g.awayStats.fga, awayFta: g.awayStats.fta, awayTov: g.awayStats.tov, awayOreb: g.awayStats.oreb,
            awayReb: g.awayStats.trb, awayAst: g.awayStats.ast,
            homePlayerIds: g.homePlayers, awayPlayerIds: g.awayPlayers
        };
    }).filter(x => x !== null);

    for (let i = 0; i < statsRecords.length; i += 500) {
        const chunk = statsRecords.slice(i, i + 500);
        // @ts-ignore
        await prisma.matchStatsNBA.createMany({ data: chunk as any });
    }

    console.log(`[Seed] Robust Ingestion Complete (${allData.length} records).`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
