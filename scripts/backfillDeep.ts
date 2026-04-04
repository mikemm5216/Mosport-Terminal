/**
 * Deep Historical Backfill & Settlement Engine (Patch 17.13)
 * Sweeps last 14 days of scoreboard data across NBA/MLB/EPL/UCL.
 * Ingests:
 *  1. Completed Match Scores
 *  2. Settlement Metrics (XGBoost Prediction vs Actual)
 *  3. Athlete Physicals (Height, Weight, Position)
 *
 * Usage: npx tsx scripts/backfillDeep.ts
 */

import { PrismaClient } from "@prisma/client";
import { getXGBoostInference } from "../lib/inference";

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
        const uniqueName = name ? `${name} (${leagueType})` : teamId;
        await (prisma as any).teams.upsert({
            where: { team_id: teamId },
            update: {
                full_name: uniqueName,
                short_name: teamId.split('_')[1] || teamId,
                logo_url: logo ?? null
            },
            create: {
                team_id: teamId,
                full_name: uniqueName,
                short_name: teamId.split('_')[1] || teamId,
                league_type: leagueType,
                logo_url: logo ?? null,
            },
        });
    } catch (e: any) {
        console.error(`  [TEAM_ERR] ${teamId}: ${e.message}`);
        throw e;
    }
}

async function upsertAthlete(athlete: any) {
    if (!athlete) return null;
    try {
        // Basic physical parsing
        const height = athlete.displayHeight || athlete.height || null;
        const weight = athlete.displayWeight || athlete.weight || null;

        return await (prisma as any).player.upsert({
            where: { player_id: String(athlete.id) },
            update: { height, weight },
            create: {
                player_id: String(athlete.id),
                display_name: athlete.displayName || "Unknown",
                first_name: athlete.firstName || "",
                last_name: athlete.lastName || "",
                position_main: (athlete.position?.abbreviation || athlete.position?.name || "N/A"),
                height,
                weight,
            },
        });
    } catch (e) {
        return null;
    }
}

async function fetchAndUpsertDate(
    sport: string, league: string, prefix: string, leagueType: string, dateStr: string
): Promise<number> {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard?dates=${dateStr}`;
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) return 0;
        const data = await res.json();
        const events: any[] = data.events || [];
        if (events.length === 0) return 0;

        let count = 0;
        for (const event of events) {
            if (event.status?.type?.state !== "post") continue;

            const comp = event.competitions?.[0];
            const hC = comp?.competitors?.find((c: any) => c.homeAway === "home");
            const aC = comp?.competitors?.find((c: any) => c.homeAway === "away");
            if (!hC || !aC) continue;

            // ── Fix 2: Namespace ID to prevent cross-league collisions (NBA_WAS vs MLB_WAS) ──
            const hRaw = norm(hC.team?.abbreviation || "TBD");
            const aRaw = norm(aC.team?.abbreviation || "TBD");
            const hId = `${leagueType}_${hRaw}`;
            const aId = `${leagueType}_${aRaw}`;

            const hLogo = `/logos/${leagueType.toLowerCase()}_${hRaw.toLowerCase()}.png`;
            const aLogo = `/logos/${leagueType.toLowerCase()}_${aRaw.toLowerCase()}.png`;

            await ensureTeam(hId, hC.team?.displayName || hId, leagueType, hLogo);
            await ensureTeam(aId, aC.team?.displayName || aId, leagueType, aLogo);

            // ── Athlete Physicals Ingestion ──
            const hAthlete = comp.leaders?.[0]?.leaders?.[0]?.athlete;
            const aAthlete = comp.leaders?.[1]?.leaders?.[0]?.athlete;
            if (hAthlete) await upsertAthlete(hAthlete);
            if (aAthlete) await upsertAthlete(aAthlete);

            const homeScore = parseInt(hC.score || "0", 10);
            const awayScore = parseInt(aC.score || "0", 10);
            const extId = `${prefix}-${event.id}`;

            // ── Patch 17.20 Neural Link (Real XGBoost) ──
            const predictedHomeWinRate = await getXGBoostInference(hId, aId, sport);
            if (predictedHomeWinRate === -1.0) {
                console.warn(`[MODEL_OFFLINE] Skipping settlement for ${extId}`);
                continue; // CTO mandated no random proxies
            }

            const actualWinner = homeScore > awayScore ? hId : (awayScore > homeScore ? aId : "DRAW");
            const predictedWinner = predictedHomeWinRate > 0.5 ? hId : aId;
            const predictionCorrect = actualWinner === "DRAW" ? false : (predictedWinner === actualWinner);

            await (prisma as any).match.upsert({
                where: { extId },
                update: {
                    status: "COMPLETED",
                    homeScore, awayScore,
                    predictedHomeWinRate,
                    actualWinner,
                    predictionCorrect
                },
                create: {
                    extId,
                    date: new Date(event.date),
                    sport,
                    homeTeamId: hId,
                    awayTeamId: aId,
                    homeTeamName: hC.team?.displayName || hId,
                    awayTeamName: aC.team?.displayName || aId,
                    homeScore,
                    awayScore,
                    status: "COMPLETED",
                    predictedHomeWinRate,
                    actualWinner,
                    predictionCorrect
                },
            });
            count++;
        }
        console.log(`  [OK] ${dateStr}: ${count} settlements.`);
        return count;
    } catch (e: any) {
        console.log(`  [ERR] ${dateStr}: ${e.message}`);
        return 0;
    }
}

async function main() {
    const DAYS = 14;
    console.log(`=== SETTLEMENT ENGINE & DEEP BACKFILL (LAST ${DAYS} DAYS) ===\n`);

    const dates = pastDates(DAYS);
    let total = 0;

    for (const def of LEAGUES) {
        console.log(`[${def.prefix}] Processing...`);
        for (const d of dates) {
            total += await fetchAndUpsertDate(def.sport, def.league, def.prefix, def.leagueType, d);
        }
    }

    console.log(`\n=== BACKFILL COMPLETE ===`);
    console.log(`  Settled Matches: ${total}`);
    const matchCount = await (prisma as any).match.count();
    const playerCount = await (prisma as any).player.count();
    console.log(`  Total Matches in DB: ${matchCount}`);
    console.log(`  Total Athletes Hydrated: ${playerCount}`);
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
