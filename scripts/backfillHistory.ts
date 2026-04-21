/**
 * Historical Backfill Script v3 — Optimized Date-Range Sweep
 * Sweeps last 14 days of scoreboard data across 4 leagues.
 * Improved logging for visibility into progress.
 *
 * Usage: npx tsx scripts/backfillHistory.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ESPN_TEAM_MAP: Record<string, string> = {
    NO: "NOP", GS: "GSW", NY: "NYK", SA: "SAS", WSH: "WAS", UTAH: "UTA",
};
function norm(raw: string) { return ESPN_TEAM_MAP[raw] ?? raw; }

const LEAGUES = [
    { sport: "basketball", league: "nba", prefix: "NBA", leagueType: "NBA" },
    { sport: "baseball", league: "mlb", prefix: "MLB", leagueType: "MLB" },
    { sport: "soccer", league: "eng.1", prefix: "EPL", leagueType: "EPL" },
    { sport: "soccer", league: "uefa.champions", prefix: "UCL", leagueType: "UCL" },
];

function pastDates(days: number): string[] {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 1; i <= days; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        dates.push(`${y}${m}${day}`);
    }
    return dates;
}

async function ensureTeam(teamId: string, name: string, leagueType: string, logo?: string) {
    try {
        await (prisma as any).teams.upsert({
            where: { team_id: teamId },
            update: {},
            create: {
                team_id: teamId,
                full_name: name || teamId,
                short_name: teamId,
                league_type: leagueType,
                logo_url: logo ?? null,
            },
        });
    } catch (e) { }
}

async function fetchAndUpsertDate(
    sport: string, league: string, prefix: string, leagueType: string, dateStr: string
): Promise<number> {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard?dates=${dateStr}`;
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) {
            console.log(`  [SKIP] ${dateStr} HTTP ${res.status}`);
            return 0;
        }
        const data = await res.json();
        const events: any[] = data.events || [];
        if (events.length === 0) return 0;

        let count = 0;
        for (const event of events) {
            const statusState = event.status?.type?.state;
            if (statusState !== "post") continue;

            const comp = event.competitions?.[0];
            const homeC = comp?.competitors?.find((c: any) => c.homeAway === "home");
            const awayC = comp?.competitors?.find((c: any) => c.homeAway === "away");
            if (!homeC || !awayC) continue;

            const hId = norm(homeC.team?.abbreviation || "TBD");
            const aId = norm(awayC.team?.abbreviation || "TBD");
            const logoH = homeC.team?.logo ?? homeC.team?.logos?.[0]?.href;
            const logoA = awayC.team?.logo ?? awayC.team?.logos?.[0]?.href;

            await ensureTeam(hId, homeC.team?.displayName || homeC.team?.name || hId, leagueType, logoH);
            await ensureTeam(aId, awayC.team?.displayName || awayC.team?.name || aId, leagueType, logoA);

            const homeScore = parseInt(homeC.score || "0", 10);
            const awayScore = parseInt(awayC.score || "0", 10);
            const extId = `${prefix}-${event.id}`;

            await (prisma as any).match.upsert({
                where: { extId },
                update: { status: "COMPLETED", homeScore, awayScore },
                create: {
                    extId,
                    date: new Date(event.date),
                    sport,
                    homeTeamId: hId,
                    awayTeamId: aId,
                    homeTeamName: homeC.team?.displayName || hId,
                    awayTeamName: awayC.team?.displayName || aId,
                    homeScore,
                    awayScore,
                    status: "COMPLETED",
                },
            });
            count++;
        }
        console.log(`  [OK] ${dateStr} - ${count} matches`);
        return count;
    } catch (e: any) {
        console.log(`  [ERR] ${dateStr}: ${e.message}`);
        return 0;
    }
}

async function main() {
    const DAYS_BACK = 14;
    console.log(`=== COLD STORAGE BACKFILL v3 — LAST ${DAYS_BACK} DAYS ===\n`);

    const dates = pastDates(DAYS_BACK);
    let totalMatches = 0;

    for (const def of LEAGUES) {
        console.log(`\n[${def.prefix}] Processing ${def.sport}/${def.league}...`);
        for (const dateStr of dates) {
            totalMatches += await fetchAndUpsertDate(def.sport, def.league, def.prefix, def.leagueType, dateStr);
        }
    }

    const finalMatchCount = await (prisma as any).match.count();
    const finalTeamCount = await (prisma as any).teams.count();

    console.log(`\n=== BACKFILL COMPLETE ===`);
    console.log(`  Processed ${grand = totalMatches} matches.`);
    console.log(`  Final DB Stats: ${finalMatchCount} matches, ${finalTeamCount} teams.`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
