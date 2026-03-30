import { PrismaClient, LeagueType } from '@prisma/client';

const prisma = new PrismaClient();

const retry = async <T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
    try {
        return await fn();
    } catch (e: any) {
        if (retries === 0) throw e;
        console.log(`[RETRY] Error: \n${e.message}\n. Retrying in ${delay}ms... (${retries} left)`);
        await new Promise(r => setTimeout(r, delay));
        return retry(fn, retries - 1, delay);
    }
};

async function main() {
    console.log("--- [GENESIS 8.0] THE FULL DELUGE (EXTERNAL HD LOGOS) ---");

    const nbaTeams = {
        'ATL': { name: 'Atlanta Hawks', logo: 'https://www.thesportsdb.com/images/media/team/badge/7178.png' },
        'BOS': { name: 'Boston Celtics', logo: 'https://www.thesportsdb.com/images/media/team/badge/9d26s61584033282.png' },
        'BKN': { name: 'Brooklyn Nets', logo: 'https://www.thesportsdb.com/images/media/team/badge/9vsmue1523190863.png' },
        'CHA': { name: 'Charlotte Hornets', logo: 'https://www.thesportsdb.com/images/media/team/badge/9179.png' },
        'CHI': { name: 'Chicago Bulls', logo: 'https://www.thesportsdb.com/images/media/team/badge/6797.png' },
        'CLE': { name: 'Cleveland Cavaliers', logo: 'https://www.thesportsdb.com/images/media/team/badge/7180.png' },
        'DAL': { name: 'Dallas Mavericks', logo: 'https://www.thesportsdb.com/images/media/team/badge/p7sqo31522867824.png' },
        'DEN': { name: 'Denver Nuggets', logo: 'https://www.thesportsdb.com/images/media/team/badge/193ve81523191147.png' },
        'DET': { name: 'Detroit Pistons', logo: 'https://www.thesportsdb.com/images/media/team/badge/1647891523190987.png' },
        'GSW': { name: 'Golden State Warriors', logo: 'https://www.thesportsdb.com/images/media/team/badge/5679.png' },
        'HOU': { name: 'Houston Rockets', logo: 'https://www.thesportsdb.com/images/media/team/badge/8000.png' },
        'IND': { name: 'Indiana Pacers', logo: 'https://www.thesportsdb.com/images/media/team/badge/7181.png' },
        'LAC': { name: 'Los Angeles Clippers', logo: 'https://www.thesportsdb.com/images/media/team/badge/8182.png' },
        'LAL': { name: 'Los Angeles Lakers', logo: 'https://www.thesportsdb.com/images/media/team/badge/l06m871523190899.png' },
        'MEM': { name: 'Memphis Grizzlies', logo: 'https://www.thesportsdb.com/images/media/team/badge/7183.png' },
        'MIA': { name: 'Miami Heat', logo: 'https://www.thesportsdb.com/images/media/team/badge/8001.png' },
        'MIL': { name: 'Milwaukee Bucks', logo: 'https://www.thesportsdb.com/images/media/team/badge/7184.png' },
        'MIN': { name: 'Minnesota Timberwolves', logo: 'https://www.thesportsdb.com/images/media/team/badge/7185.png' },
        'NOP': { name: 'New Orleans Pelicans', logo: 'https://www.thesportsdb.com/images/media/team/badge/8002.png' },
        'NYK': { name: 'New York Knicks', logo: 'https://www.thesportsdb.com/images/media/team/badge/7186.png' },
        'OKC': { name: 'Oklahoma City Thunder', logo: 'https://www.thesportsdb.com/images/media/team/badge/7187.png' },
        'ORL': { name: 'Orlando Magic', logo: 'https://www.thesportsdb.com/images/media/team/badge/p3p6s71523191295.png' },
        'PHI': { name: 'Philadelphia 76ers', logo: 'https://www.thesportsdb.com/images/media/team/badge/7188.png' },
        'PHX': { name: 'Phoenix Suns', logo: 'https://www.thesportsdb.com/images/media/team/badge/8003.png' },
        'POR': { name: 'Portland Trail Blazers', logo: 'https://www.thesportsdb.com/images/media/team/badge/7189.png' },
        'SAC': { name: 'Sacramento Kings', logo: 'https://www.thesportsdb.com/images/media/team/badge/7190.png' },
        'SAS': { name: 'San Antonio Spurs', logo: 'https://www.thesportsdb.com/images/media/team/badge/7191.png' },
        'TOR': { name: 'Toronto Raptors', logo: 'https://www.thesportsdb.com/images/media/team/badge/8004.png' },
        'UTA': { name: 'Utah Jazz', logo: 'https://www.thesportsdb.com/images/media/team/badge/7192.png' },
        'WAS': { name: 'Washington Wizards', logo: 'https://www.thesportsdb.com/images/media/team/badge/8005.png' }
    };

    const mlbTeams = {
        'ARI_MLB': { name: 'Arizona Diamondbacks', logo: 'https://www.thesportsdb.com/images/media/team/badge/rsqqrq1422055655.png' },
        'ATL_MLB': { name: 'Atlanta Braves', logo: 'https://www.thesportsdb.com/images/media/team/badge/7y4q3r1422055805.png' },
        'BAL_MLB': { name: 'Baltimore Orioles', logo: 'https://www.thesportsdb.com/images/media/team/badge/vuyqrx1422055836.png' },
        'BOS_MLB': { name: 'Boston Red Sox', logo: 'https://www.thesportsdb.com/images/media/team/badge/1m99f11550917223.png' },
        'CHC_MLB': { name: 'Chicago Cubs', logo: 'https://www.thesportsdb.com/images/media/team/badge/uvwxsw1422056023.png' },
        'CHW_MLB': { name: 'Chicago White Sox', logo: 'https://www.thesportsdb.com/images/media/team/badge/uwtyxv1422056037.png' },
        'LAD_MLB': { name: 'Los Angeles Dodgers', logo: 'https://www.thesportsdb.com/images/media/team/badge/7560.png' },
        'NYY_MLB': { name: 'New York Yankees', logo: 'https://www.thesportsdb.com/images/media/team/badge/1k856z1550918090.png' },
    };

    const eplTeams = {
        'ARS': { name: 'Arsenal', logo: 'https://www.thesportsdb.com/images/media/team/badge/8965.png' },
        'AST': { name: 'Aston Villa', logo: 'https://www.thesportsdb.com/images/media/team/badge/kf766y1420741913.png' },
        'CHE': { name: 'Chelsea', logo: 'https://www.thesportsdb.com/images/media/team/badge/6792.png' },
        'CRY': { name: 'Crystal Palace', logo: 'https://www.thesportsdb.com/images/media/team/badge/8983.png' },
        'LIV': { name: 'Liverpool', logo: 'https://www.thesportsdb.com/images/media/team/badge/6791.png' },
        'MCI': { name: 'Manchester City', logo: 'https://www.thesportsdb.com/images/media/team/badge/6796.png' },
        'WHU': { name: 'West Ham United', logo: 'https://www.thesportsdb.com/images/media/team/badge/8964.png' },
        'MUN': { name: 'Manchester United', logo: 'https://www.thesportsdb.com/images/media/team/badge/6794.png' }
    };

    await Promise.all([
        retry(() => prisma.league.upsert({ where: { id: 'NBA' }, update: {}, create: { id: 'NBA', sport: 'basketball', hasDraw: false, matchDuration: 48, isKnockout: false } })),
        retry(() => prisma.league.upsert({ where: { id: 'MLB' }, update: {}, create: { id: 'MLB', sport: 'baseball', hasDraw: false, matchDuration: 180, isKnockout: false } })),
        retry(() => prisma.league.upsert({ where: { id: 'EPL' }, update: {}, create: { id: 'EPL', sport: 'football', hasDraw: true, matchDuration: 90, isKnockout: false } }))
    ]);

    const getEspnUrl = (id: string, type: LeagueType) => {
        if (type === LeagueType.NBA) {
            let espnId = id.toLowerCase();
            if (id === 'UTA') espnId = 'utah';
            if (id === 'NOP') espnId = 'no';
            return `https://a.espncdn.com/i/teamlogos/nba/500/${espnId}.png`;
        }
        if (type === LeagueType.MLB) return `https://a.espncdn.com/i/teamlogos/mlb/500/${id.replace('_MLB', '').toLowerCase()}.png`;
        const eplMap: Record<string, string> = { 'ARS': '359', 'AST': '362', 'CHE': '363', 'LIV': '364', 'MCI': '382', 'MUN': '360', 'CRY': '384', 'WHU': '371' };
        return `https://a.espncdn.com/i/teamlogos/soccer/500/${eplMap[id] || '359'}.png`;
    };

    const seedLeagueTeams = async (teams: Record<string, { name: string, logo: string }>, type: LeagueType) => {
        const promises = Object.entries(teams).map(([id, data]) => {
            const cleanId = id.replace('_MLB', '');
            const prefix = type === LeagueType.NBA ? 'nba' : type === LeagueType.MLB ? 'mlb' : 'epl';
            const localUrl = `/logos/${prefix}_${cleanId.toLowerCase()}.png`;
            const cdnUrl = getEspnUrl(id, type);
            const dualUrl = `${localUrl}||${cdnUrl}`;

            return retry(() => prisma.teams.upsert({
                where: { full_name: data.name },
                update: { short_name: cleanId, logo_url: dualUrl },
                create: {
                    team_id: id,
                    full_name: data.name,
                    short_name: cleanId,
                    logo_url: dualUrl,
                    league_type: type
                }
            }));
        });
        await Promise.all(promises);
    }

    await seedLeagueTeams(nbaTeams, LeagueType.NBA);
    await seedLeagueTeams(mlbTeams, LeagueType.MLB);
    await seedLeagueTeams(eplTeams, LeagueType.FOOTBALL);

    console.log("--- BATCH GENERATING 150+ FIXTURES (STATUS: live) ---");

    const leagues = [
        { id: 'NBA', sport: 'basketball', keys: Object.keys(nbaTeams) },
        { id: 'MLB', sport: 'baseball', keys: Object.keys(mlbTeams) },
        { id: 'EPL', sport: 'football', keys: Object.keys(eplTeams) }
    ];

    const generateMatches = async (league: any, count: number) => {
        const baseDate = new Date("2026-03-23T19:00:00Z");
        const chunkMatchPromises = [];

        for (let i = 0; i < count; i++) {
            const home = league.keys[Math.floor(Math.random() * league.keys.length)];
            let away = league.keys[Math.floor(Math.random() * league.keys.length)];
            while (away === home) away = league.keys[Math.floor(Math.random() * league.keys.length)];

            const matchId = `${league.id}-F26-${home}-${away}-${i}`;
            const matchTime = new Date(baseDate.getTime() + (Math.random() * 14 * 24 * 60 * 60 * 1000));

            chunkMatchPromises.push(async () => {
                const match = await retry(() => prisma.match.upsert({
                    where: { extId: matchId },
                    update: { date: matchTime, status: 'live' },
                    create: {
                        extId: matchId,
                        date: matchTime,
                        sport: league.sport,
                        home_team: { connect: { team_id: home } },
                        away_team: { connect: { team_id: away } },
                        homeTeamName: home.replace('_MLB', ''),
                        awayTeamName: away.replace('_MLB', ''),
                        status: 'live',
                        league: { connect: { id: league.id } },
                        home_key_player: {
                            create: {
                                player_name: league.sport === 'baseball' ? "Gerrit Cole" : "LeBron James",
                                jersey_number: league.sport === 'baseball' ? "45" : "23",
                                physical_profile: "206cm / 113kg",
                                season_stats: "Premium Alpha Status",
                                role: league.sport === 'baseball' ? "SP" : "HOT_STREAK"
                            }
                        },
                        away_key_player: {
                            create: {
                                player_name: league.sport === 'baseball' ? "Shohei Ohtani" : "Steph Curry",
                                jersey_number: league.sport === 'baseball' ? "17" : "30",
                                physical_profile: "191cm / 91kg",
                                season_stats: "Premium Alpha Status",
                                role: league.sport === 'baseball' ? "DH" : "STAR"
                            }
                        }
                    }
                }));

                await retry(() => prisma.matchSignal.upsert({
                    where: { matchId: match.id },
                    update: { confidence: 0.85 + (Math.random() * 0.1), status: 'ACTIVE' },
                    create: {
                        matchId: match.id,
                        confidence: 0.85 + (Math.random() * 0.1),
                        signal_type: 'SYSTEM',
                        status: 'ACTIVE',
                        standard_analysis: ["Primary Vector Initialized", "Domain Data Locked", "Alpha Synthesized"],
                        tactical_matchup: ["Squad Depth Evaluated", "Transition States Mapped", "Edge Confirmed"],
                        x_factors: ["Atmospherics Nominal", "Momentum Calibrated", "Outliers Isolated"]
                    }
                }));

                await retry(() => prisma.matchPrediction.upsert({
                    where: { matchId: match.id },
                    update: { home_win_prob: 0.4 + (Math.random() * 0.3) },
                    create: {
                        matchId: match.id,
                        home_win_prob: 0.4 + (Math.random() * 0.3),
                        away_win_prob: 0.4 + (Math.random() * 0.3),
                        expected_value: 0.05 + (Math.random() * 0.1)
                    }
                }));
            });

            if (chunkMatchPromises.length >= 10 || i === count - 1) {
                await Promise.all(chunkMatchPromises.map(p => p()));
                chunkMatchPromises.length = 0;
                console.log(`--- [SEED] ${league.id} Progress: ${i + 1}/${count} ---`);
            }
        }
    };

    await generateMatches(leagues[0], 50);
    await generateMatches(leagues[1], 50);
    await generateMatches(leagues[2], 50);

    console.log("--- [V16.4] FULL DELUGE COMPLETE: 150 matches in DB ---");
}

main().catch(console.error).finally(() => prisma.$disconnect());
