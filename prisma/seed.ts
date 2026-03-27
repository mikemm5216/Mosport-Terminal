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
    { team_id: "LAL", full_name: "Los Angeles Lakers", short_name: "LAL", city: "Los Angeles", league_type: LeagueType.NBA, logo_url: "https://b.fssta.com/wp-content/uploads/espanol/2016/04/lakers.png" },
    { team_id: "GSW", full_name: "Golden State Warriors", short_name: "GSW", city: "San Francisco", league_type: LeagueType.NBA, logo_url: "https://b.fssta.com/wp-content/uploads/espanol/2016/04/warriors.png" },
    { team_id: "BKN", full_name: "Brooklyn Nets", short_name: "BKN", city: "Brooklyn", league_type: LeagueType.NBA, logo_url: "https://b.fssta.com/wp-content/uploads/espanol/2016/04/nets.png" },
    { team_id: "LAD", full_name: "Los Angeles Dodgers", short_name: "LAD", city: "Los Angeles", league_type: LeagueType.MLB, logo_url: "https://b.fssta.com/wp-content/uploads/espanol/2016/04/dodgers.png" },
    { team_id: "NYY", full_name: "New York Yankees", short_name: "NYY", city: "New York", league_type: LeagueType.MLB, logo_url: "https://b.fssta.com/wp-content/uploads/espanol/2016/04/yankees.png" },
    { team_id: "WHU", full_name: "West Ham United", short_name: "WHU", city: "London", league_type: LeagueType.SOCCER, logo_url: "https://b.fssta.com/wp-content/uploads/espanol/2016/04/westham.png" },
    { team_id: "MCI", full_name: "Manchester City", short_name: "MCI", city: "Manchester", league_type: LeagueType.SOCCER, logo_url: "https://b.fssta.com/wp-content/uploads/espanol/2016/04/mancity.png" },
    { team_id: "ARS", full_name: "Arsenal", short_name: "ARS", city: "London", league_type: LeagueType.SOCCER, logo_url: "https://b.fssta.com/wp-content/uploads/espanol/2016/04/arsenal.png" },
    { team_id: "LIV", full_name: "Liverpool", short_name: "LIV", city: "Liverpool", league_type: LeagueType.SOCCER, logo_url: "" },
    { team_id: "OPP", full_name: "Opponent", short_name: "OPP", city: "Unknown", league_type: LeagueType.SOCCER, logo_url: "" },
    { team_id: "TRP", full_name: "Trap Team", short_name: "TRP", city: "Trap City", league_type: LeagueType.SOCCER, logo_url: "" },
    { team_id: "BAT", full_name: "Bait Team", short_name: "BAT", city: "Bait Town", league_type: LeagueType.SOCCER, logo_url: "" },
    { team_id: "SHL", full_name: "Stale Home", short_name: "SHL", city: "Stale Port", league_type: LeagueType.SOCCER, logo_url: "" },
    { team_id: "SAL", full_name: "Stale Away", short_name: "SAL", city: "Stale Berg", league_type: LeagueType.SOCCER, logo_url: "" },
  ];

  for (const team of teams) {
    await prisma.teams.create({
      data: team
    });
    console.log(`[SEEDED TEAM] ${team.full_name}`);
  }

  const sampleMatches = [
    {
      id: "LIV-001",
      extId: "LIV-001",
      sport: "football",
      homeTeamId: "LIV",
      awayTeamId: "OPP",
      date: new Date(),
      status: "scheduled",
      homeTeamName: "Liverpool",
      awayTeamName: "Opponent",
      signalData: { signalId: "LIV-001", signal: "ELITE", confidence: 0.7890, edge: 0.0925, ev: 0.1520, tags: ["THE_GOLDEN_ALPHA", "SHARP_SIGNAL"] }
    },
    {
      id: "TRP-002",
      extId: "TRP-002",
      sport: "football",
      homeTeamId: "TRP",
      awayTeamId: "BAT",
      date: new Date(),
      status: "scheduled",
      homeTeamName: "Trap Team",
      awayTeamName: "Bait Team",
      signalData: { signalId: "TRP-002", signal: "NONE", confidence: 0.0000, edge: 0.0000, ev: 0.5300, tags: ["STATISTICAL_TRAP"] }
    },
    {
      id: "STL-003",
      extId: "STL-003",
      sport: "football",
      homeTeamId: "SHL",
      awayTeamId: "SAL",
      date: new Date(),
      status: "scheduled",
      homeTeamName: "Stale Home",
      awayTeamName: "Stale Away",
      signalData: { signalId: "STL-003", signal: "NONE", confidence: 0.0810, edge: 0.0090, ev: 0.0800, tags: ["STATISTICAL_TRAP", "STALE_ODDS"] }
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

    await prisma.eventSnapshot.create({
      data: {
        match_id: m.id,
        snapshot_type: "V11.5_SIGNAL",
        state_json: signalData as any,
        status: "PUBLISHED"
      }
    });
    console.log(`[SEEDED MATCH] ${m.extId}`);
  }

  console.log('--- GENESIS SEED COMPLETE ---');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
