import { PrismaClient, LeagueType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- PURGING ALPHA VERIFICATION DATA FOR GENESIS ---');
  // PURGE IN ORDER (DEPENDENCIES FIRST)
  await prisma.eventSnapshot.deleteMany({});
  await prisma.matchSignal.deleteMany({});
  await prisma.matchPrediction.deleteMany({});
  await prisma.externalMatchMap.deleteMany({});
  await prisma.odds.deleteMany({});
  await prisma.matchFeatures.deleteMany({});
  await (prisma as any).match.deleteMany({});
  await prisma.teams.deleteMany({});

  console.log('--- STARTING GENESIS SEED: V11.5 PRODUCTION SAMPLES ---');

  const teams = [
    { team_id: "LAL", full_name: "Los Angeles Lakers", short_name: "LAL", city: "Los Angeles", league_type: LeagueType.NBA, logo_url: "/logos/lal.png" },
    { team_id: "GSW", full_name: "Golden State Warriors", short_name: "GSW", city: "San Francisco", league_type: LeagueType.NBA, logo_url: "/logos/gsw.png" },
    { team_id: "BKN", full_name: "Brooklyn Nets", short_name: "BKN", city: "Brooklyn", league_type: LeagueType.NBA, logo_url: "/logos/bkn.png" },
    { team_id: "NYY", full_name: "New York Yankees", short_name: "NYY", city: "New York", league_type: LeagueType.MLB, logo_url: "/logos/nyy.png" },
    { team_id: "CRY", full_name: "Crystal Palace", short_name: "CRY", city: "London", league_type: LeagueType.EPL, logo_url: "/logos/cry.png" },
    { team_id: "WHU", full_name: "West Ham United", short_name: "WHU", city: "London", league_type: LeagueType.EPL, logo_url: "/logos/whu.png" },
    { team_id: "DOD", full_name: "Los Angeles Dodgers", short_name: "DOD", city: "Los Angeles", league_type: LeagueType.MLB, logo_url: "/logos/dodgers.png" },
    { team_id: "LIV", full_name: "Liverpool", short_name: "LIV", city: "Liverpool", league_type: LeagueType.EPL, logo_url: null },
    { team_id: "OPP", full_name: "Opponent", short_name: "OPP", city: "Unknown", league_type: LeagueType.EPL, logo_url: null },
    { team_id: "TRP", full_name: "Trap Team", short_name: "TRP", city: "Trap City", league_type: LeagueType.EPL, logo_url: null },
    { team_id: "BAT", full_name: "Bait Team", short_name: "BAT", city: "Bait Town", league_type: LeagueType.EPL, logo_url: null },
    { team_id: "SHL", full_name: "Stale Home", short_name: "SHL", city: "Stale Port", league_type: LeagueType.EPL, logo_url: null },
    { team_id: "SAL", full_name: "Stale Away", short_name: "SAL", city: "Stale Berg", league_type: LeagueType.EPL, logo_url: null },
  ];

  for (const team of teams) {
    await prisma.teams.upsert({
      where: { team_id: team.team_id },
      update: {
        league_type: team.league_type,
        full_name: team.full_name,
        short_name: team.short_name,
        city: team.city,
        logo_url: team.logo_url
      },
      create: {
        team_id: team.team_id,
        league_type: team.league_type,
        full_name: team.full_name,
        short_name: team.short_name,
        city: team.city,
        logo_url: team.logo_url
      }
    });
    console.log(`[SEEDED TEAM] ${team.full_name}`);
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
        signalId: "EPL-CRY-WHU-001",
        signal: "ELITE",
        confidence: 0.8520,
        edge: 0.1245,
        ev: 0.1840,
        ra_ev: 0.1420,
        clv: 0.0850,
        modelProbs: [0.65, 0.25, 0.10],
        marketFairProbs: [0.55, 0.30, 0.15],
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
        signalId: "NBA-LAL-GSW-002",
        signal: "LOCK",
        confidence: 0.9210,
        edge: 0.0540,
        ev: 0.0820,
        ra_ev: 0.0710,
        clv: 0.0320,
        modelProbs: [0.72, 0.28],
        marketFairProbs: [0.68, 0.32],
        tags: ["🔒 LOCKED", "INSTITUTIONAL_ALPHA"]
      }
    },
    {
      id: "MLB-NYY-DOD-003",
      extId: "MLB-NYY-DOD-003",
      sport: "baseball",
      homeTeamId: "NYY",
      awayTeamId: "DOD",
      date: new Date(),
      status: "scheduled",
      homeTeamName: "New York Yankees",
      awayTeamName: "Los Angeles Dodgers",
      signalData: {
        signalId: "MLB-NYY-DOD-003",
        signal: "ELITE",
        confidence: 0.7640,
        edge: 0.0890,
        ev: 0.1250,
        ra_ev: 0.1040,
        clv: 0.0610,
        modelProbs: [0.58, 0.42],
        marketFairProbs: [0.52, 0.48],
        tags: ["SHARP_ALPHA", "BIOMETRIC_EDGE"]
      }
    }
  ];

  for (const m of sampleMatches) {
    const { signalData, ...matchData } = m;
    await (prisma as any).match.create({
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

    // V11.5 Signal Integration
    await prisma.matchSignal.create({
      data: {
        matchId: m.extId,
        signalLabel: (signalData as any).signal,
        signalScore: (signalData as any).confidence,
        confidence: (signalData as any).confidence,
        edge: (signalData as any).edge,
        ev: (signalData as any).ev,
        ra_ev: (signalData as any).ra_ev,
        clv: (signalData as any).clv,
        tags: (signalData as any).tags
      }
    });
    console.log(`[SEEDED MATCH + SIGNAL] ${m.extId}`);
  }

  console.log('--- GENESIS SEED COMPLETE ---');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
