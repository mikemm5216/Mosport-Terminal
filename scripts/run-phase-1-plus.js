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

    const leagueType = sport.toUpperCase() === "FOOTBALL" ? "SOCCER" : sport.toUpperCase();

    // Upsert Teams by team_id
    const homeId = String(data.idHomeTeam || data.strHomeTeam);
    const awayId = String(data.idAwayTeam || data.strAwayTeam);

    await prisma.teams.upsert({
        where: { team_id: homeId },
        update: { logo_url: data.strHomeTeamBadge },
        create: {
            team_id: homeId,
            full_name: data.strHomeTeam,
            short_name: (data.strHomeTeam || "UNK").substring(0, 3).toUpperCase(),
            league_type: leagueType,
            logo_url: data.strHomeTeamBadge,
        },
    });

    await prisma.teams.upsert({
        where: { team_id: awayId },
        update: { logo_url: data.strAwayTeamBadge },
        create: {
            team_id: awayId,
            full_name: data.strAwayTeam,
            short_name: (data.strAwayTeam || "UNK").substring(0, 3).toUpperCase(),
            league_type: leagueType,
            logo_url: data.strAwayTeamBadge,
        },
    });

    await prisma.rawEvents.upsert({
        where: { extId_provider: { extId, provider } },
        update: { payload: data, hash },
        create: { extId, provider, sport, league, payload: data, hash },
    });

    await prisma.matches.upsert({
        where: { extId },
        update: { sourceUpdatedAt: new Date() },
        create: {
            extId,
            home_team_id: homeId,
            away_team_id: awayId,
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
        { name: "La Liga", id: "4335" },
        { name: "Serie A", id: "4332" },
        { name: "German Bundesliga", id: "4331" },
        { name: "Ligue 1", id: "4334" }
    ];

    const seasons = ["2023-2024", "2024-2025"];

    console.log("Starting Phase 1+ Cold Ingestion: Football (Fix Teams)...");

    for (const league of leagues) {
        for (const season of seasons) {
            console.log(`Processing ${league.name} (Season ${season})...`);
            const url = `https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=${league.id}&s=${season}`;
            const data = await fetchWithRetry(url);
            const events = data.events || [];
            console.log(`- Found ${events.length} events`);

            let processedCount = 0;
            for (const event of events) {
                if (event.strSport !== "Soccer") continue;
                try {
                    await processRawEvent({
                        extId: String(event.idEvent),
                        provider: "TheSportsDB",
                        sport: "football",
                        league: league.name,
                        data: event
                    });
                    processedCount++;
                } catch (e) {
                    console.warn(`  Failed to process event ${event.idEvent}: ${e.message}`);
                }
                await sleep(20);
            }
        }
    }

    const matchCount = await prisma.matches.count();
    console.log(`--- Final Match Count: ${matchCount} ---`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
