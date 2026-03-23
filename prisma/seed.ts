import { PrismaClient, LeagueType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING GENESIS SEED: COLD DATA INJECTION ---');

  const teams = [
    // NBA
    {
      full_name: "Los Angeles Lakers",
      short_name: "LAL",
      city: "Los Angeles",
      league_type: LeagueType.NBA,
      logo_url: "https://b.fssta.com/wp-content/uploads/espanol/2016/04/lakers.png"
    },
    {
      full_name: "Golden State Warriors",
      short_name: "GSW",
      city: "San Francisco",
      league_type: LeagueType.NBA,
      logo_url: "https://b.fssta.com/wp-content/uploads/espanol/2016/04/warriors.png"
    },
    {
      full_name: "Brooklyn Nets",
      short_name: "BKN",
      city: "Brooklyn",
      league_type: LeagueType.NBA,
      logo_url: "https://b.fssta.com/wp-content/uploads/espanol/2016/04/nets.png"
    },
    // MLB
    {
      full_name: "Los Angeles Dodgers",
      short_name: "LAD",
      city: "Los Angeles",
      league_type: LeagueType.MLB,
      logo_url: "https://b.fssta.com/wp-content/uploads/espanol/2016/04/dodgers.png"
    },
    {
      full_name: "New York Yankees",
      short_name: "NYY",
      city: "New York",
      league_type: LeagueType.MLB,
      logo_url: "https://b.fssta.com/wp-content/uploads/espanol/2016/04/yankees.png"
    },
    // SOCCER
    {
      full_name: "West Ham United",
      short_name: "WHU",
      city: "London",
      league_type: LeagueType.SOCCER,
      logo_url: "https://b.fssta.com/wp-content/uploads/espanol/2016/04/westham.png"
    },
    {
      full_name: "Manchester City",
      short_name: "MCI",
      city: "Manchester",
      league_type: LeagueType.SOCCER,
      logo_url: "https://b.fssta.com/wp-content/uploads/espanol/2016/04/mancity.png"
    },
    {
      full_name: "Arsenal",
      short_name: "ARS",
      city: "London",
      league_type: LeagueType.SOCCER,
      logo_url: "https://b.fssta.com/wp-content/uploads/espanol/2016/04/arsenal.png"
    }
  ];

  for (const team of teams) {
    await prisma.teams.upsert({
      where: { full_name: team.full_name },
      update: team,
      create: team
    });
    console.log(`[SEEDED] ${team.full_name} (${team.short_name})`);
  }

  console.log('--- GENESIS SEED COMPLETE ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
