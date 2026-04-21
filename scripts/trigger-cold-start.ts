const BASE_URL = "http://localhost:3000";

async function triggerJob(provider: string, sport: string, league: string) {
    console.log(`Triggering ${provider} for ${league}...`);
    const resp = await fetch(`${BASE_URL}/api/ingest/worker`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-bypass-auth": "true" // Use our bypass
        },
        body: JSON.stringify({ provider, sport, league, page: 1 })
    });
    const data = await resp.json();
    console.log(`Response:`, JSON.stringify(data, null, 2));
}

async function main() {
    const jobs = [
        { provider: "thesportsdb", sport: "Football", league: "English Premier League" },
        { provider: "thesportsdb", sport: "Football", league: "La Liga" },
        { provider: "theoddsapi", sport: "Football", league: "English Premier League" },
        { provider: "theoddsapi", sport: "Football", league: "La Liga" }
    ];

    for (const job of jobs) {
        await triggerJob(job.provider, job.sport, job.league);
    }
}

main().catch(console.error);
