import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- STARTING V15.5 - FINAL STABLE SEED ---');

    // 1. LEAGUE (model League)
    const epl = await (prisma as any).league.upsert({
        where: { id: 'EPL' },
        update: { name: 'Premier League' },
        create: {
            id: 'EPL',
            name: 'Premier League',
            sport: 'FOOTBALL',
            hasDraw: true,
            matchDuration: 90,
            isKnockout: false
        }
    });

    const mlb = await (prisma as any).league.upsert({
        where: { id: 'MLB' },
        update: { name: 'Major League Baseball' },
        create: {
            id: 'MLB',
            name: 'Major League Baseball',
            sport: 'MLB',
            hasDraw: false,
            matchDuration: 9, // Innings
            isKnockout: false
        }
    });

    // 2. TEAMS (model Teams)
    const teamsData = [
        { id: 'CRY', name: 'Crystal Palace', short: 'CRY', logo: 'https://www.thesportsdb.com/images/media/team/badge/7rtht11534151.png' },
        { id: 'WHU', name: 'West Ham United', short: 'WHU', logo: 'https://www.thesportsdb.com/images/media/team/badge/8z39f61534151.png' },
        { id: 'MCI', name: 'Manchester City', short: 'MCI', logo: 'https://www.thesportsdb.com/images/media/team/badge/v668381534151.png' },
        { id: 'ARS', name: 'Arsenal', short: 'ARS', logo: 'https://www.thesportsdb.com/images/media/team/badge/9079.png' },
        { id: 'EVE', name: 'Everton', short: 'EVE', logo: 'https://www.thesportsdb.com/images/media/team/badge/8m8s9n1534151.png' },
        { id: 'LIV', name: 'Liverpool FC', short: 'LIV', logo: 'https://www.thesportsdb.com/images/media/team/badge/7786.png' },
        { id: 'LAD', name: 'LA Dodgers', short: 'LAD', logo: 'https://www.thesportsdb.com/images/media/team/badge/v668381534151.png' }
    ];

    for (const t of teamsData) {
        await prisma.teams.upsert({
            where: { full_name: t.name },
            update: { logo_url: t.logo, short_name: t.short },
            create: {
                team_id: t.id,
                full_name: t.name,
                short_name: t.short,
                logo_url: t.logo,
                league_type: t.id === 'LAD' ? 'MLB' : 'FOOTBALL'
            }
        });
    }

    // 3. PLAYER (model Player)
    await prisma.player.upsert({
        where: { player_id: 'P_OHTANI_GENESIS' },
        update: { display_name: 'SHOHEI OHTANI' },
        create: {
            player_id: 'P_OHTANI_GENESIS',
            first_name: 'Shohei',
            last_name: 'Ohtani',
            display_name: 'SHOHEI OHTANI',
            position_main: 'DH / P',
            nationality: 'Japan',
            active_status: true
        }
    });

    // 4. MATCHES & SIGNALS
    const now = new Date();
    const matchData = [
        { id: 'EPL-CRY-WHU-001', home: 'CRY', away: 'WHU', tag: 'UPSET ALERT', edge: 0.12, ra_ev: 0.15, clv: 0.08, conf: 0.82 },
        { id: 'EPL-MCI-ARS-001', home: 'MCI', away: 'ARS', tag: 'SYSTEM LOCK', edge: 0.18, ra_ev: 0.22, clv: 0.12, conf: 0.94 },
        { id: 'EPL-EVE-LIV-001', home: 'EVE', away: 'LIV', tag: 'UPSET ALERT', edge: 0.08, ra_ev: 0.10, clv: 0.05, conf: 0.75 }
    ];

    for (const m of matchData) {
        const match = await (prisma as any).match.upsert({
            where: { extId: m.id },
            update: { date: now },
            create: {
                id: m.id,
                extId: m.id,
                date: now,
                sport: 'football',
                homeTeamId: m.home,
                awayTeamId: m.away,
                homeTeamName: teamsData.find(t => t.id === m.home)?.name || '',
                awayTeamName: teamsData.find(t => t.id === m.away)?.name || '',
                status: 'scheduled',
                leagueId: 'EPL'
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
                tags: [m.tag],
                signalLabel: m.tag === 'SYSTEM LOCK' ? 'ELITE' : 'STRONG',
                signalScore: m.conf
            },
            create: {
                matchId: match.id,
                signal_type: 'V11_5',
                edge: m.edge,
                ev: m.ra_ev,
                ra_ev: m.ra_ev,
                clv: m.clv,
                confidence: m.conf,
                tags: [m.tag],
                signalLabel: m.tag === 'SYSTEM LOCK' ? 'ELITE' : 'STRONG',
                signalScore: m.conf,
                is_active: true
            }
        });
    }

    console.log('--- V15.5 SEEDING COMPLETE ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
