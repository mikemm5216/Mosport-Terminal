/**
 * ESPN Full Hydration Script
 * Seeds all current NBA/MLB/EPL/UCL matches into the DB,
 * auto-creates unknown teams as stubs so FK constraints don't block data.
 *
 * Usage: npx tsx scripts/espn-hydrate.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ESPN_TEAM_MAP: Record<string, string> = {
    NO: 'NOP', GS: 'GSW', NY: 'NYK', SA: 'SAS',
    WSH: 'WAS', UTAH: 'UTA', PHX: 'PHX', CLE: 'CLE', KC: 'KC',
};
function norm(raw: string) { return ESPN_TEAM_MAP[raw] ?? raw; }

const LEAGUES = [
    { sport: 'basketball', league: 'nba', prefix: 'NBA', leagueType: 'NBA', url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard' },
    { sport: 'baseball', league: 'mlb', prefix: 'MLB', leagueType: 'MLB', url: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard' },
    { sport: 'soccer', league: 'epl', prefix: 'EPL', leagueType: 'EPL', url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard' },
    { sport: 'soccer', league: 'ucl', prefix: 'UCL', leagueType: 'UCL', url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard' },
];

async function ensureTeam(teamId: string, name: string, leagueType: string, logoUrl?: string) {
    const existing = await (prisma as any).teams.findUnique({ where: { team_id: teamId } });
    if (existing) return existing;

    console.log(`  [STUB] Creating missing team: ${teamId} (${name}) [${leagueType}]`);
    return (prisma as any).teams.create({
        data: {
            team_id: teamId,
            full_name: name || teamId,
            short_name: teamId,
            league_type: leagueType,
            logo_url: logoUrl || null,
        },
    });
}

async function syncLeague(def: typeof LEAGUES[0]) {
    console.log(`\n[FETCHING] ${def.prefix} — ${def.url}`);
    const res = await fetch(def.url);
    if (!res.ok) { console.error(`  ESPN ${def.prefix} failed: ${res.status}`); return 0; }

    const data = await res.json();
    const events: any[] = data.events || [];
    console.log(`  Found ${events.length} events`);

    let upserted = 0;
    for (const event of events) {
        try {
            const extId = `${def.prefix}-${event.id}`;
            const comp = event.competitions?.[0];
            const homeC = comp?.competitors?.find((c: any) => c.homeAway === 'home');
            const awayC = comp?.competitors?.find((c: any) => c.homeAway === 'away');

            const homeTeam = homeC?.team;
            const awayTeam = awayC?.team;

            const hId = norm(homeTeam?.abbreviation || 'TBD');
            const aId = norm(awayTeam?.abbreviation || 'TBD');

            const statusState = event.status?.type?.state;
            const statusMap: Record<string, string> = { pre: 'SCHEDULED', in: 'IN_PLAY', post: 'COMPLETED' };
            const status = statusMap[statusState] || 'SCHEDULED';

            const homeScore = parseInt(homeC?.score || '0', 10);
            const awayScore = parseInt(awayC?.score || '0', 10);
            const logoH = homeTeam?.logo || homeTeam?.logos?.[0]?.href;
            const logoA = awayTeam?.logo || awayTeam?.logos?.[0]?.href;

            // Auto-create stub teams if missing — no more FK blocks
            await ensureTeam(hId, homeTeam?.displayName || homeTeam?.name || hId, def.leagueType, logoH);
            await ensureTeam(aId, awayTeam?.displayName || awayTeam?.name || aId, def.leagueType, logoA);

            await (prisma as any).match.upsert({
                where: { extId },
                update: { status, homeScore, awayScore, date: new Date(event.date) },
                create: {
                    extId,
                    date: new Date(event.date),
                    sport: def.sport,
                    homeTeamId: hId,
                    awayTeamId: aId,
                    homeTeamName: homeTeam?.displayName || homeTeam?.name || hId,
                    awayTeamName: awayTeam?.displayName || awayTeam?.name || aId,
                    homeScore,
                    awayScore,
                    status,
                },
            });

            console.log(`  [OK] ${extId} | ${hId} vs ${aId} | ${status}`);
            upserted++;
        } catch (e: any) {
            console.error(`  [ERR] event ${event?.id}: ${e.message}`);
        }
    }
    return upserted;
}

async function main() {
    console.log('=== ESPN HYDRATION ENGINE ACTIVATED ===\n');
    let total = 0;
    for (const def of LEAGUES) {
        total += await syncLeague(def);
    }

    const matchCount = await (prisma as any).match.count();
    const teamCount = await (prisma as any).teams.count();
    console.log(`\n=== HYDRATION COMPLETE ===`);
    console.log(`  Upserted this run : ${total}`);
    console.log(`  Total in DB (Match): ${matchCount}`);
    console.log(`  Total in DB (Teams): ${teamCount}`);
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
