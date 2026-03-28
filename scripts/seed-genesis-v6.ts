import { PrismaClient, LeagueType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- [GENESIS 6.0] STARTING DATA DELUGE ---');

    // 0. NUCLEAR RESET
    console.log('--- PURGING STALE INTEL ---');
    await (prisma as any).matchSignal.deleteMany({});
    await (prisma as any).match.deleteMany({});
    await (prisma as any).roster.deleteMany({});
    await prisma.player.deleteMany({});
    await prisma.teams.deleteMany({});
    console.log('--- COLD PURGE COMPLETE ---');

    // 1. LEAGUES
    const leagues = [
        { id: 'EPL', sport: 'FOOTBALL', hasDraw: true, matchDuration: 90, isKnockout: false },
        { id: 'NBA', sport: 'BASKETBALL', hasDraw: false, matchDuration: 48, isKnockout: false },
        { id: 'MLB', sport: 'BASEBALL', hasDraw: false, matchDuration: 9, isKnockout: false }
    ];

    for (const l of leagues) {
        await (prisma as any).league.upsert({
            where: { id: l.id },
            update: { sport: l.sport },
            create: l
        });
    }

    // 2. TEAMS (HD LOGOS - GENERATED ASSETS)
    const teamsData = [
        // NBA
        { id: 'LAL', name: 'Los Angeles Lakers', short: 'LAL', logo: '/logos/lal_hd.png', league: LeagueType.NBA },
        { id: 'GSW', name: 'Golden State Warriors', short: 'GSW', logo: '/logos/gsw_hd.png', league: LeagueType.NBA },
        { id: 'BKN', name: 'Brooklyn Nets', short: 'BKN', logo: '/logos/bkn.png', league: LeagueType.NBA },
        // MLB
        { id: 'LAD', name: 'LA Dodgers', short: 'LAD', logo: '/logos/lad_hd.png', league: LeagueType.MLB },
        { id: 'NYY', name: 'New York Yankees', short: 'NYY', logo: '/logos/nyy_hd.png', league: LeagueType.MLB },
        { id: 'SFG', name: 'San Francisco Giants', short: 'SFG', logo: '/logos/giants.png', league: LeagueType.MLB },
        // PL
        { id: 'CRY', name: 'Crystal Palace', short: 'CRY', logo: '/logos/cry.png', league: LeagueType.FOOTBALL },
        { id: 'WHU', name: 'West Ham United', short: 'WHU', logo: '/logos/whu.png', league: LeagueType.FOOTBALL }
    ];

    for (const t of teamsData) {
        await prisma.teams.upsert({
            where: { team_id: t.id },
            update: { logo_url: t.logo, short_name: t.short, full_name: t.name, league_type: t.league },
            create: {
                team_id: t.id,
                full_name: t.name,
                short_name: t.short,
                logo_url: t.logo,
                league_type: t.league
            }
        });
    }

    // 3. PLAYERS (NBA & MLB Samples)
    const players = [
        { id: 'P_LEBRON', first: 'LeBron', last: 'James', display: 'LEBRON JAMES', pos: 'F', team: 'LAL' },
        { id: 'P_CURRY', first: 'Stephen', last: 'Curry', display: 'STEPHEN CURRY', pos: 'G', team: 'GSW' },
        { id: 'P_OHTANI', first: 'Shohei', last: 'Ohtani', display: 'SHOHEI OHTANI', pos: 'DH/P', team: 'LAD' },
        { id: 'P_JUDGE', first: 'Aaron', last: 'Judge', display: 'AARON JUDGE', pos: 'OF', team: 'NYY' }
    ];

    for (const p of players) {
        const player = await prisma.player.upsert({
            where: { player_id: p.id },
            update: { display_name: p.display },
            create: {
                player_id: p.id,
                first_name: p.first,
                last_name: p.last,
                display_name: p.display,
                position_main: p.pos,
                active_status: true
            }
        });

        await (prisma as any).roster.upsert({
            where: { player_id_team_id_season_year: { player_id: p.id, team_id: p.team, season_year: 2026 } },
            update: {},
            create: {
                player_id: p.id,
                team_id: p.team,
                season_year: 2026
            }
        });
    }

    // 4. MATCHES & V11.5 SIGNALS
    const baseDate = new Date("2026-03-29T19:00:00Z"); // Tomorrow
    const matchData = [
        { id: 'EPL-2026-001', league: 'EPL', home: 'CRY', away: 'WHU', offsetHours: 0, tag: '🔥 UPSET ALERT', edge: 0.1245, ra_ev: 0.1420, clv: 0.0850, conf: 0.8520, sport: 'soccer' },
        { id: 'NBA-2026-001', league: 'NBA', home: 'LAL', away: 'GSW', offsetHours: 4, tag: '🔒 LOCKED', edge: 0.0540, ra_ev: 0.0710, clv: 0.0320, conf: 0.9210, sport: 'basketball' },
        { id: 'MLB-2026-001', league: 'MLB', home: 'NYY', away: 'LAD', offsetHours: 24, tag: 'BIOMETRIC_EDGE', edge: 0.0890, ra_ev: 0.1040, clv: 0.0610, conf: 0.7640, sport: 'baseball' },
        { id: 'NBA-2026-002', league: 'NBA', home: 'BKN', away: 'GSW', offsetHours: 48, tag: 'SHARP_ALPHA', edge: 0.0320, ra_ev: 0.0450, clv: 0.0120, conf: 0.6850, sport: 'basketball' }
    ];

    for (const m of matchData) {
        const matchDate = new Date(baseDate.getTime() + m.offsetHours * 60 * 60 * 1000);
        const match = await (prisma as any).match.upsert({
            where: { extId: m.id },
            update: { date: matchDate, id: m.id },
            create: {
                id: m.id,
                extId: m.id,
                date: matchDate,
                sport: m.sport,
                homeTeamId: m.home,
                awayTeamId: m.away,
                homeTeamName: teamsData.find(t => t.id === m.home)?.name || '',
                awayTeamName: teamsData.find(t => t.id === m.away)?.name || '',
                status: 'scheduled',
                leagueId: m.league
            }
        });

        await (prisma as any).matchSignal.upsert({
            where: { matchId: match.id },
            update: {
                edge: m.edge,
                ev: m.ra_ev,
                ra_ev: m.ra_ev,
                clv: m.clv,
                confidence: m.conf,
                tags: [m.tag, "ALPHA_SIGNAL"],
                signalLabel: m.tag === '🔒 LOCKED' ? 'ELITE' : 'STRONG',
                signalScore: m.conf,
                marketFairProbs: { home: 0.55, away: 0.45 }
            },
            create: {
                matchId: match.id,
                edge: m.edge,
                ev: m.ra_ev,
                ra_ev: m.ra_ev,
                clv: m.clv,
                confidence: m.conf,
                tags: [m.tag, "ALPHA_SIGNAL"],
                signalLabel: m.tag === '🔒 LOCKED' ? 'ELITE' : 'STRONG',
                signalScore: m.conf,
                marketFairProbs: { home: 0.55, away: 0.45 }
            }
        });
    }

    // 5. BACKTEST RESULTS (10,000 Sim Ops)
    const backtests = [
        { league: 'NBA', strategyType: 'V11.5_CONVERGENCE', simulatedROI: 0.142, sharpeRatio: 2.4, maxDrawdown: 0.08, sampleSize: 10000, robustness: 'EXCELLENT' },
        { league: 'MLB', strategyType: 'BIOMETRIC_ALPHA', simulatedROI: 0.085, sharpeRatio: 1.8, maxDrawdown: 0.12, sampleSize: 10000, robustness: 'STABLE' },
        { league: 'EPL', strategyType: 'SHARP_SIGNAL', simulatedROI: 0.112, sharpeRatio: 2.1, maxDrawdown: 0.09, sampleSize: 10000, robustness: 'HIGH' }
    ];

    for (const b of backtests) {
        await (prisma as any).strategyBacktestResult.create({
            data: b
        });
    }

    console.log('--- [GENESIS 6.0] DATA DELUGE COMPLETE ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
