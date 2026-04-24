import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type LeagueCode = "MLB" | "NBA";

const ESPN_ENDPOINTS: Record<LeagueCode, string> = {
  MLB: "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard",
  NBA: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
};

function yyyymmdd(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function isoDate(offsetDays: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d;
}

async function fetchEspn(league: LeagueCode, date: Date) {
  const url = `${ESPN_ENDPOINTS[league]}?dates=${yyyymmdd(date)}`;
  console.log(`[seed] fetching ${league}`, url);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${league} ESPN failed: ${res.status}`);
  }

  return res.json();
}

async function ensureLeague(code: LeagueCode) {
  return prisma.league.upsert({
    where: { code },
    update: {},
    create: {
      code,
      name: code === "MLB" ? "Major League Baseball" : "National Basketball Association",
      sport: code === "MLB" ? "baseball" : "basketball",
    },
  });
}

async function ensureTeam(leagueId: string, team: any) {
  const code = team.abbreviation || team.shortDisplayName || team.name;

  return prisma.team.upsert({
    where: {
      leagueId_code: {
        leagueId,
        code,
      },
    },
    update: {
      name: team.displayName ?? team.name ?? code,
      city: team.location ?? null,
      logoPath: team.logo ?? null,
    },
    create: {
      leagueId,
      code,
      name: team.displayName ?? team.name ?? code,
      city: team.location ?? null,
      logoPath: team.logo ?? null,
    },
  });
}

function normalizeStatus(event: any) {
  const state = event?.status?.type?.state;

  if (state === "pre") return "scheduled";
  if (state === "in") return "live";
  if (state === "post") return "closed";

  return "scheduled";
}

async function upsertEvent(leagueCode: LeagueCode, league: any, event: any) {
  const competition = event.competitions?.[0];
  if (!competition) return false;

  const competitors = competition.competitors ?? [];

  const home = competitors.find((c: any) => c.homeAway === "home");
  const away = competitors.find((c: any) => c.homeAway === "away");

  if (!home || !away) return false;

  const homeTeam = await ensureTeam(league.id, home.team);
  const awayTeam = await ensureTeam(league.id, away.team);

  const status = normalizeStatus(event);

  await prisma.match.upsert({
    where: {
      externalId: `${leagueCode}_ESPN_${event.id}`,
    },
    update: {
      startsAt: new Date(event.date),
      status,
      homeScore: home.score != null ? Number(home.score) : null,
      awayScore: away.score != null ? Number(away.score) : null,
      venue: competition.venue?.fullName ?? null,
      updatedAt: new Date(),
    },
    create: {
      leagueId: league.id,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      externalId: `${leagueCode}_ESPN_${event.id}`,
      startsAt: new Date(event.date),
      status,
      homeScore: home.score != null ? Number(home.score) : null,
      awayScore: away.score != null ? Number(away.score) : null,
      venue: competition.venue?.fullName ?? null,
      season: String(new Date(event.date).getUTCFullYear()),
    },
  });

  return true;
}

async function seedLeague(leagueCode: LeagueCode) {
  const league = await ensureLeague(leagueCode);

  let fetched = 0;
  let upserted = 0;

  // 抓昨天、今天、明天、後天，避免 sliding-24h 剛好沒比賽
  for (const offset of [-1, 0, 1, 2]) {
    const date = isoDate(offset);
    const data = await fetchEspn(leagueCode, date);
    const events = data.events ?? [];

    fetched += events.length;

    for (const event of events) {
      const ok = await upsertEvent(leagueCode, league, event);
      if (ok) upserted += 1;
    }
  }

  return { league: leagueCode, fetched, upserted };
}

async function main() {
  console.log("[seed] starting real MLB/NBA seed");

  const results = [];

  for (const league of ["MLB", "NBA"] as LeagueCode[]) {
    try {
      const result = await seedLeague(league);
      results.push(result);
      console.log("[seed] result", result);
    } catch (error) {
      console.error(`[seed] ${league} failed`, error);
      results.push({
        league,
        fetched: 0,
        upserted: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const totalUpserted = results.reduce((sum, r: any) => sum + (r.upserted ?? 0), 0);

  console.log("[seed] complete", {
    totalUpserted,
    results,
  });

  if (totalUpserted === 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error("[seed] fatal", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
