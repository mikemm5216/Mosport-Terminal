const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const prisma = new PrismaClient();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function generatePayloadHash(payload) {
    return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.status === 429) {
                const backoff = delay * Math.pow(2, i);
                console.warn(`Rate limited (429). Retrying in ${backoff}ms...`);
                await sleep(backoff);
                continue;
            }
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            if (i === retries - 1) throw error;
            const backoff = delay * Math.pow(2, i);
            await sleep(backoff);
        }
    }
}

async function processRawEvent(payload) {
    const { extId, provider, sport, league, data } = payload;
    const hash = generatePayloadHash(data);

    const existingRaw = await prisma.rawEvents.findUnique({
        where: { extId_provider: { extId, provider } },
    });

    if (existingRaw && existingRaw.hash === hash) {
        return false; // Skip
    }

    // 1. Upsert Teams first to avoid FK violation
    const leagueType = sport.toUpperCase() === "FOOTBALL" ? "SOCCER" : sport.toUpperCase();

    await prisma.teams.upsert({
        where: { full_name: data.strHomeTeam },
        update: { logo_url: data.strHomeTeamBadge },
        create: {
            team_id: data.idHomeTeam || crypto.randomUUID(),
            full_name: data.strHomeTeam,
            short_name: (data.strHomeTeam || "UNK").substring(0, 3).toUpperCase(),
            league_type: leagueType,
            logo_url: data.strHomeTeamBadge,
        },
    });

    await prisma.teams.upsert({
        where: { full_name: data.strAwayTeam },
        update: { logo_url: data.strAwayTeamBadge },
        create: {
            team_id: data.idAwayTeam || crypto.randomUUID(),
            full_name: data.strAwayTeam,
            short_name: (data.strAwayTeam || "UNK").substring(0, 3).toUpperCase(),
            league_type: leagueType,
            logo_url: data.strAwayTeamBadge,
        },
    });

    const homeTeam = await prisma.teams.findUnique({ where: { full_name: data.strHomeTeam } });
    const awayTeam = await prisma.teams.findUnique({ where: { full_name: data.strAwayTeam } });

    // 2. Upsert RawEvent
    await prisma.rawEvents.upsert({
        where: { extId_provider: { extId, provider } },
        update: { payload: data, hash },
        create: { extId, provider, sport, league, payload: data, hash },
    });

    // 3. Upsert Match
    await prisma.matches.upsert({
        where: { extId },
        update: { sourceUpdatedAt: new Date() },
        create: {
            extId,
            home_team_id: homeTeam.team_id,
            away_team_id: awayTeam.team_id,
            match_date: new Date(data.dateEvent + "T" + (data.strTime || "00:00:00") + "Z"),
            status: data.strStatus === "Match Finished" ? "finished" : "scheduled",
            sport,
            league,
        },
    });

    return true;
}

async function main() {
    const leagues = [
        { name: "English Premier League", id: "4328" },
        { name: "UEFA Champions League", id: "4480" },
        { name: "La Liga", id: "4335" }
    ];

    console.log("Starting Phase 1 Cold Ingestion: Football (Safe Upsert)...");

    for (const league of leagues) {
        console.log(`Processing ${league.name}...`);

        const url = `https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=${league.id}&s=2024-2025`; // Using current/previous season for data
        const data = await fetchWithRetry(url);
        const events = data.events || [];

        console.log(`- Found ${events.length} events for ${league.name}`);

        let processedCount = 0;
        for (const event of events) {
            if (event.strSport !== "Soccer") continue;
            const success = await processRawEvent({
                extId: String(event.idEvent),
                provider: "TheSportsDB",
                sport: "football",
                league: league.name,
                data: event
            });
            if (success) processedCount++;
            if (processedCount % 50 === 0 && success) console.log(`  Processed ${processedCount} matches...`);
            await sleep(100);
        }
    }

    const matchCount = await prisma.matches.count();
    console.log(`--- Ingestion Final Result ---`);
    console.log(`Total Canonical Matches: ${matchCount}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
