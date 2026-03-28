import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- STARTING V15.4 SEEDING ---');

    // 1. ENSURE TEAMS EXIST
    const teams = [
        { id: 'LIV', name: 'Liverpool FC', short: 'LIV', logo: 'https://www.thesportsdb.com/images/media/team/badge/7786.png' },
        { id: 'MCI', name: 'Manchester City', short: 'MCI', logo: 'https://www.thesportsdb.com/images/media/team/badge/v668381534151.png' },
        { id: 'TRP', name: 'Trap Squad', short: 'TRP', logo: null },
        { id: 'BAT', name: 'Bait Team', short: 'BAT', logo: null },
        { id: 'STH', name: 'Stale Home', short: 'STH', logo: null },
        { id: 'STA', name: 'Stale Away', short: 'STA', logo: null }
    ];

    for (const t of teams) {
        await prisma.teams.upsert({
            where: { full_name: t.name },
            update: { logo_url: t.logo, short_name: t.short },
            create: {
                team_id: t.id,
                full_name: t.name,
                short_name: t.short,
                logo_url: t.logo,
                league_type: 'FOOTBALL' // Matches schema enum
            }
        });
    }

    // 2. CREATE MATCHES & SIGNALS
    const now = new Date();

    const matchData = [
        {
            id: 'EPL-LIV-001',
            home: 'LIV',
            away: 'MCI',
            homeName: 'Liverpool FC',
            awayName: 'Manchester City',
            tag: 'THE_GOLDEN_ALPHA',
            edge: 0.0925,
            ev: 0.152,
            conf: 0.85
        },
        {
            id: 'TRP-002',
            home: 'TRP',
            away: 'BAT',
            homeName: 'Trap Squad',
            awayName: 'Bait Team',
            tag: 'STATISTICAL_TRAP',
            edge: 0.0,
            ev: 0.0,
            conf: 0.1
        },
        {
            id: 'STL-003',
            home: 'STH',
            away: 'STA',
            homeName: 'Stale Home',
            awayName: 'Stale Away',
            tag: 'STATISTICAL_TRAP',
            edge: 0.01,
            ev: 0.08,
            conf: 0.2
        }
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
                homeTeamName: m.homeName,
                awayTeamName: m.awayName,
                status: 'scheduled'
            }
        });

        await (prisma as any).matchSignal.upsert({
            where: { matchId: match.id },
            update: {
                edge: m.edge,
                ev: m.ev,
                confidence: m.conf,
                tags: [m.tag],
                signalLabel: m.tag === 'THE_GOLDEN_ALPHA' ? 'ELITE' : 'NORMAL',
                signalScore: m.conf
            },
            create: {
                matchId: match.id,
                signalLabel: m.tag === 'THE_GOLDEN_ALPHA' ? 'ELITE' : 'NORMAL',
                signalScore: m.conf,
                edge: m.edge,
                ev: m.ev,
                confidence: m.conf,
                tags: [m.tag],
                updatedAt: now
            }
        });
    }

    console.log('--- V15.4 SEEDING COMPLETE ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
