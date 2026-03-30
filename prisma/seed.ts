import { PrismaClient, LeagueType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- NUCLEAR PURGE: CLEANING ALL PRODUCTION TABLES ---');
  // PURGE IN ORDER (DEPENDENCIES FIRST)
  await prisma.eventSnapshot.deleteMany({});
  await prisma.matchSignal.deleteMany({});
  await prisma.matchPrediction.deleteMany({});
  await prisma.externalMatchMap.deleteMany({});
  await prisma.odds.deleteMany({});
  await prisma.matchFeatures.deleteMany({});
  await (prisma as any).match.deleteMany({});
  await prisma.teams.deleteMany({});

  console.log('--- STARTING GENESIS SEED V12.0: PROFESSIONAL GRADE ---');

  const teams = [
    // NBA
    { team_id: "LAL", full_name: "Los Angeles Lakers", short_name: "LAL", city: "Los Angeles", league_type: LeagueType.NBA, logo_url: "/logos/lal.png" },
    { team_id: "GSW", full_name: "Golden State Warriors", short_name: "GSW", city: "San Francisco", league_type: LeagueType.NBA, logo_url: "/logos/gsw.png" },
    { team_id: "NYK", full_name: "New York Knicks", short_name: "NYK", city: "New York", league_type: LeagueType.NBA, logo_url: "/logos/nyk.png" },
    { team_id: "BKN", full_name: "Brooklyn Nets", short_name: "BKN", city: "Brooklyn", league_type: LeagueType.NBA, logo_url: "/logos/bkn.png" },

    // MLB
    { team_id: "LAD", full_name: "Los Angeles Dodgers", short_name: "LAD", city: "Los Angeles", league_type: LeagueType.MLB, logo_url: "/logos/dodgers.png" },
    { team_id: "NYY", full_name: "New York Yankees", short_name: "NYY", city: "New York", league_type: LeagueType.MLB, logo_url: "/logos/nyy.png" },

    // EPL
    { team_id: "CRY", full_name: "Crystal Palace", short_name: "CRY", city: "London", league_type: LeagueType.EPL, logo_url: "/logos/cry.png" },
    { team_id: "WHU", full_name: "West Ham United", short_name: "WHU", city: "London", league_type: LeagueType.EPL, logo_url: "/logos/whu.png" },
    { team_id: "LIV", full_name: "Liverpool", short_name: "LIV", city: "Liverpool", league_type: LeagueType.EPL, logo_url: null },
    { team_id: "TOT", full_name: "Tottenham Hotspur", short_name: "TOT", city: "London", league_type: LeagueType.EPL, logo_url: null },
    { team_id: "ARS", full_name: "Arsenal", short_name: "ARS", city: "London", league_type: LeagueType.EPL, logo_url: null },
    { team_id: "MCI", full_name: "Manchester City", short_name: "MCI", city: "Manchester", league_type: LeagueType.EPL, logo_url: null },

    // UCL
    { team_id: "RMA", full_name: "Real Madrid", short_name: "RMA", city: "Madrid", league_type: LeagueType.UCL, logo_url: null },
    { team_id: "BAY", full_name: "Bayern Munich", short_name: "BAY", city: "Munich", league_type: LeagueType.UCL, logo_url: null },

    // FALLBACK
    { team_id: "OPP", full_name: "Opponent", short_name: "OPP", city: "Unknown", league_type: LeagueType.FOOTBALL, logo_url: null },
  ];

  for (const team of teams) {
    await prisma.teams.create({
      data: team
    });
    console.log(`[SEEDED TEAM] ${team.team_id}: ${team.full_name}`);
  }

  const sampleMatches = [
    {
      id: "EPL-CRY-WHU-001",
      extId: "EPL-CRY-WHU-001",
      sport: "soccer",
      homeTeamId: "CRY",
      awayTeamId: "WHU",
      date: new Date(),
      status: "scheduled",
      homeTeamName: "Crystal Palace",
      awayTeamName: "West Ham United",
      signalData: {
        signal: "ELITE",
        confidence: 0.8520,
        edge: 0.1245,
        ev: 0.1840,
        tags: ["THE_GOLDEN_ALPHA", "SHARP_SIGNAL", "🔥 UPSET ALERT"]
      }
    },
    {
      id: "NBA-LAL-GSW-002",
      extId: "NBA-LAL-GSW-002",
      sport: "basketball",
      homeTeamId: "LAL",
      awayTeamId: "GSW",
      date: new Date(),
      status: "scheduled",
      homeTeamName: "Los Angeles Lakers",
      awayTeamName: "Golden State Warriors",
      signalData: {
        signal: "LOCK",
        confidence: 0.9210,
        edge: 0.0540,
        ev: 0.0820,
        tags: ["🔒 LOCKED", "INSTITUTIONAL_ALPHA"]
      }
    }
  ];

  for (const m of sampleMatches) {
    const { signalData, ...matchData } = m;
    const dbMatch = await (prisma as any).match.create({
      data: {
        id: matchData.id,
        extId: matchData.extId,
        date: matchData.date,
        sport: matchData.sport,
        status: matchData.status,
        homeTeamId: matchData.homeTeamId,
        awayTeamId: matchData.awayTeamId,
        homeTeamName: matchData.homeTeamName,
        awayTeamName: matchData.awayTeamName
      }
    });

    await prisma.matchSignal.create({
      data: {
        matchId: dbMatch.id,
        signalLabel: signalData.signal,
        signalScore: signalData.confidence,
        confidence: signalData.confidence,
        edge: signalData.edge,
        ev: signalData.ev,
        tags: signalData.tags
      }
    });
    console.log(`[SEEDED MATCH + SIGNAL] ${m.extId}`);
  }

  console.log('--- GENESIS SEED V12.0 COMPLETE ---');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
