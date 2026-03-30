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
    console.log("--- [GENESIS 9.0] THE FULL 80-TEAM DELUGE ---");

    const nbaTeams = {
        'ATL': { name: 'Atlanta Hawks', logo: '' },
        'BOS': { name: 'Boston Celtics', logo: '' },
        'BKN': { name: 'Brooklyn Nets', logo: '' },
        'CHA': { name: 'Charlotte Hornets', logo: '' },
        'CHI': { name: 'Chicago Bulls', logo: '' },
        'CLE': { name: 'Cleveland Cavaliers', logo: '' },
        'DAL': { name: 'Dallas Mavericks', logo: '' },
        'DEN': { name: 'Denver Nuggets', logo: '' },
        'DET': { name: 'Detroit Pistons', logo: '' },
        'GSW': { name: 'Golden State Warriors', logo: '' },
        'HOU': { name: 'Houston Rockets', logo: '' },
        'IND': { name: 'Indiana Pacers', logo: '' },
        'LAC': { name: 'Los Angeles Clippers', logo: '' },
        'LAL': { name: 'Los Angeles Lakers', logo: '' },
        'MEM': { name: 'Memphis Grizzlies', logo: '' },
        'MIA': { name: 'Miami Heat', logo: '' },
        'MIL': { name: 'Milwaukee Bucks', logo: '' },
        'MIN': { name: 'Minnesota Timberwolves', logo: '' },
        'NOP': { name: 'New Orleans Pelicans', logo: '' },
        'NYK': { name: 'New York Knicks', logo: '' },
        'OKC': { name: 'Oklahoma City Thunder', logo: '' },
        'ORL': { name: 'Orlando Magic', logo: '' },
        'PHI': { name: 'Philadelphia 76ers', logo: '' },
        'PHX': { name: 'Phoenix Suns', logo: '' },
        'POR': { name: 'Portland Trail Blazers', logo: '' },
        'SAC': { name: 'Sacramento Kings', logo: '' },
        'SAS': { name: 'San Antonio Spurs', logo: '' },
        'TOR': { name: 'Toronto Raptors', logo: '' },
        'UTA': { name: 'Utah Jazz', logo: '' },
        'WAS': { name: 'Washington Wizards', logo: '' }
    };

    const mlbTeams = {
        'ARI_MLB': { name: 'Arizona Diamondbacks', logo: '' },
        'ATL_MLB': { name: 'Atlanta Braves', logo: '' },
        'BAL_MLB': { name: 'Baltimore Orioles', logo: '' },
        'BOS_MLB': { name: 'Boston Red Sox', logo: '' },
        'CHC_MLB': { name: 'Chicago Cubs', logo: '' },
        'CHW_MLB': { name: 'Chicago White Sox', logo: '' },
        'CIN_MLB': { name: 'Cincinnati Reds', logo: '' },
        'CLE_MLB': { name: 'Cleveland Guardians', logo: '' },
        'COL_MLB': { name: 'Colorado Rockies', logo: '' },
        'DET_MLB': { name: 'Detroit Tigers', logo: '' },
        'HOU_MLB': { name: 'Houston Astros', logo: '' },
        'KC_MLB': { name: 'Kansas City Royals', logo: '' },
        'LAA_MLB': { name: 'Los Angeles Angels', logo: '' },
        'LAD_MLB': { name: 'Los Angeles Dodgers', logo: '' },
        'MIA_MLB': { name: 'Miami Marlins', logo: '' },
        'MIL_MLB': { name: 'Milwaukee Brewers', logo: '' },
        'MIN_MLB': { name: 'Minnesota Twins', logo: '' },
        'NYM_MLB': { name: 'New York Mets', logo: '' },
        'NYY_MLB': { name: 'New York Yankees', logo: '' },
        'OAK_MLB': { name: 'Oakland Athletics', logo: '' },
        'PHI_MLB': { name: 'Philadelphia Phillies', logo: '' },
        'PIT_MLB': { name: 'Pittsburgh Pirates', logo: '' },
        'SD_MLB': { name: 'San Diego Padres', logo: '' },
        'SEA_MLB': { name: 'Seattle Mariners', logo: '' },
        'SF_MLB': { name: 'San Francisco Giants', logo: '' },
        'STL_MLB': { name: 'St. Louis Cardinals', logo: '' },
        'TB_MLB': { name: 'Tampa Bay Rays', logo: '' },
        'TEX_MLB': { name: 'Texas Rangers', logo: '' },
        'TOR_MLB': { name: 'Toronto Blue Jays', logo: '' },
        'WAS_MLB': { name: 'Washington Nationals', logo: '' }
    };

    const eplTeams = {
        'ARS': { name: 'Arsenal', logo: '' },
        'AST': { name: 'Aston Villa', logo: '' },
        'BOU': { name: 'Bournemouth', logo: '' },
        'BRE': { name: 'Brentford', logo: '' },
        'BHA': { name: 'Brighton & Hove Albion', logo: '' },
        'CHE': { name: 'Chelsea', logo: '' },
        'CRY': { name: 'Crystal Palace', logo: '' },
        'EVE': { name: 'Everton', logo: '' },
        'FUL': { name: 'Fulham', logo: '' },
        'IPS': { name: 'Ipswich Town', logo: '' },
        'LEI': { name: 'Leicester City', logo: '' },
        'LIV': { name: 'Liverpool', logo: '' },
        'MCI': { name: 'Manchester City', logo: '' },
        'MUN': { name: 'Manchester United', logo: '' },
        'NEW': { name: 'Newcastle United', logo: '' },
        'NFO': { name: 'Nottingham Forest', logo: '' },
        'SOU': { name: 'Southampton', logo: '' },
        'TOT': { name: 'Tottenham Hotspur', logo: '' },
        'WHU': { name: 'West Ham United', logo: '' },
        'WOL': { name: 'Wolverhampton Wanderers', logo: '' }
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
        const eplMap: Record<string, string> = { 'ARS': '359', 'AST': '362', 'BOU': '349', 'BRE': '337', 'BHA': '331', 'CHE': '363', 'CRY': '384', 'EVE': '368', 'FUL': '370', 'IPS': '394', 'LEI': '375', 'LIV': '364', 'MCI': '382', 'MUN': '360', 'NEW': '361', 'NFO': '393', 'SOU': '376', 'TOT': '367', 'WHU': '371', 'WOL': '380' };
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

            const matchId = `${league.id}-F26-${home.replace('_MLB', '')}-${away.replace('_MLB', '')}-${i}`;
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
