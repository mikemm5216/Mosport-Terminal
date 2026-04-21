import { PrismaClient, LeagueType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- [GENESIS 6.0] STARTING DATA DELUGE (V16.4) ---");
    console.log("--- PURGING STALE INTEL ---");

    try {
        await (prisma as any).matchSignal.deleteMany({});
        await (prisma as any).matchPrediction.deleteMany({});
        await (prisma as any).matchStatsBaseball.deleteMany({});
        await (prisma as any).matchStatsNBA.deleteMany({});
        await (prisma as any).match.deleteMany({});
        await (prisma as any).roster.deleteMany({});
        await (prisma as any).player.deleteMany({});
        await (prisma as any).teams.deleteMany({});
        console.log("--- COLD PURGE COMPLETE ---");
    } catch (e) {
        console.warn("Purge failed. Continuing...");
    }

    // 1. LEAGUES
    const leagues = [
        { id: 'NBA', sport: 'basketball', hasDraw: false, matchDuration: 48, isKnockout: false },
        { id: 'MLB', sport: 'baseball', hasDraw: false, matchDuration: 0, isKnockout: false }
    ];

    for (const l of leagues) {
        await prisma.league.upsert({
            where: { id: l.id },
            update: l,
            create: l
        });
    }

    // 2. TEAMS (LAD FIX)
    const teams = [
        { id: 'LAL', name: 'Los Angeles Lakers', short: 'LAL', logo: '/logos/lal_hd.png', league: LeagueType.NBA },
        { id: 'GSW', name: 'Golden State Warriors', short: 'GSW', logo: '/logos/gsw_hd.png', league: LeagueType.NBA },
        { id: 'NYY', name: 'New York Yankees', short: 'NYY', logo: '/logos/nyy_hd.png', league: LeagueType.MLB },
        { id: 'LAD', name: 'Los Angeles Dodgers', short: 'LAD', logo: '/logos/lad_hd.png', league: LeagueType.MLB }
    ];

    for (const t of teams) {
        await prisma.teams.upsert({
            where: { full_name: t.name },
            update: { team_id: t.id, short_name: t.short, logo_url: t.logo },
            create: {
                team_id: t.id,
                full_name: t.name,
                short_name: t.short,
                logo_url: t.logo,
                league_type: t.league
            }
        });
    }

    // 3. PLAYERS (V16.4 Physical Profiles)
    const playersData = [
        { id: 'P_LEBRON', first: 'LeBron', last: 'James', display: 'LeBron James', pos: 'F', height: "206cm", weight: "113kg", teamId: 'LAL', jersey: '23' },
        { id: 'P_CURRY', first: 'Stephen', last: 'Curry', display: 'Stephen Curry', pos: 'G', height: "188cm", weight: "84kg", teamId: 'GSW', jersey: '30' },
        { id: 'P_OHTANI', first: 'Shohei', last: 'Ohtani', display: 'Shohei Ohtani', pos: 'DH/P', height: "193cm", weight: "102kg", teamId: 'LAD', jersey: '17' },
        { id: 'P_COLE', first: 'Gerrit', last: 'Cole', display: 'Gerrit Cole', pos: 'P', height: "193cm", weight: "100kg", teamId: 'NYY', jersey: '45' }
    ];

    for (const p of playersData) {
        await prisma.player.upsert({
            where: { player_id: p.id },
            update: { height: p.height, weight: p.weight },
            create: {
                player_id: p.id,
                first_name: p.first,
                last_name: p.last,
                display_name: p.display,
                position_main: p.pos,
                height: p.height,
                weight: p.weight
            }
        });

        await (prisma as any).roster.upsert({
            where: { player_id_team_id_season_year: { player_id: p.id, team_id: p.teamId, season_year: 2026 } },
            update: { jersey_number: p.jersey },
            create: {
                player_id: p.id,
                team_id: p.teamId,
                season_year: 2026,
                jersey_number: p.jersey
            }
        });

        // Add stats
        if (p.teamId === 'LAL' || p.teamId === 'GSW') {
            await (prisma as any).stats_NBA.upsert({
                where: { player_id: p.id },
                update: { pts: p.id === 'P_LEBRON' ? 25.4 : 26.8, reb: 7.2, ast: 8.1 },
                create: { player_id: p.id, pts: p.id === 'P_LEBRON' ? 25.4 : 26.8, reb: 7.2, ast: 8.1 }
            });
        } else {
            await (prisma as any).stats_MLB.upsert({
                where: { player_id: p.id },
                update: { era: p.id === 'P_COLE' ? 2.85 : 0, avg: p.id === 'P_OHTANI' ? 0.310 : 0.260, hr: p.id === 'P_OHTANI' ? 54 : 41 },
                create: { player_id: p.id, era: p.id === 'P_COLE' ? 2.85 : 0, avg: p.id === 'P_OHTANI' ? 0.310 : 0.260, hr: p.id === 'P_OHTANI' ? 54 : 41 }
            });
        }
    }

    // 4. MATCHES & V16.4 SIGNALS
    const baseDate = new Date();
    const matchData = [
        {
            id: 'NBA-2026-LAL-GSW', league: 'NBA', home: 'LAL', away: 'GSW', offsetHours: 1, sport: 'basketball',
            narrative: "West Coast Goliath: Dynasty vs King", sentiment: 0.68, momentum: 0.75,
            std: ["LAL: Interior Dominance +12%", "GSW: Perimeter Alpha +8%", "Pace: Projected 102.4"],
            tac: ["AD vs Green: DPOY Intensity", "Curry vs Reaves: Perimeter Stress", "LeBron vs Wiggins: Physical Edge"],
            xf: ["Home Court Advantage (LAL)", "Betting Line Steam (+3.5 GSW)", "Rotation: GSW Bench Depth"],
            homeProb: 0.54, awayProb: 0.46,
            homeStarter: 'P_LEBRON', awayStarter: 'P_CURRY'
        },
        {
            id: 'MLB-2026-NYY-LAD', league: 'MLB', home: 'NYY', away: 'LAD', offsetHours: 3, sport: 'baseball',
            narrative: "October Preview: Interlocking NY/LA Clash", sentiment: 0.64, momentum: 0.82,
            std: ["NYY: Cole (RHP) - Elite Velocity", "LAD: Ohtani (LHB) - Power Outlier", "Weather: 18C - Minimal Resistance"],
            tac: ["Cole vs Ohtani: 4-Seam Heat (Adv: NYY)", "Judge vs LAD Pen: High-Leverage", "Bullpen Depth: LAD Dominant"],
            xf: ["NYY Stadium Factor (+1.2 HR)", "LAD Travel Fatigue Check", "Umpire: Wide Strike Zone"],
            homeProb: 0.52, awayProb: 0.48,
            homeStarter: 'P_COLE', awayStarter: 'P_OHTANI'
        }
    ];

    for (const m of matchData) {
        const matchTime = new Date(baseDate.getTime() + m.offsetHours * 60 * 60 * 1000);
        const match = await prisma.match.upsert({
            where: { extId: m.id },
            update: { date: matchTime, status: 'live' },
            create: {
                extId: m.id,
                date: matchTime,
                sport: m.sport,
                homeTeamId: m.home,
                awayTeamId: m.away,
                homeTeamName: m.home,
                awayTeamName: m.away,
                status: 'live',
                leagueId: m.league
            }
        });

        await prisma.matchSignal.upsert({
            where: { matchId: match.id },
            update: {
                narrative: m.narrative,
                crowd_sentiment_index: m.sentiment,
                momentum_index: m.momentum,
                standard_analysis: m.std,
                tactical_matchup: m.tac,
                x_factors: m.xf
            },
            create: {
                matchId: match.id,
                signalLabel: 'ALPHA_QUANT_SIGNAL',
                signalScore: 0.85,
                confidence: 0.88,
                narrative: m.narrative,
                crowd_sentiment_index: m.sentiment,
                momentum_index: m.momentum,
                standard_analysis: m.std,
                tactical_matchup: m.tac,
                x_factors: m.xf
            }
        });

        await prisma.matchPrediction.upsert({
            where: { matchId: match.id },
            update: { homeWinProb: m.homeProb, awayWinProb: m.awayProb },
            create: { matchId: match.id, homeWinProb: m.homeProb, awayWinProb: m.awayProb }
        });

        // Link Starters
        if (m.sport === 'baseball') {
            await (prisma as any).matchStatsBaseball.upsert({
                where: { matchId: match.id },
                update: { homeStarterId: m.homeStarter, awayStarterId: m.awayStarter },
                create: { matchId: match.id, homeStarterId: m.homeStarter, awayStarterId: m.awayStarter }
            });
        }
    }

    console.log("\n--- [V16.4] DATA DELUGE COMPLETE ---");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
