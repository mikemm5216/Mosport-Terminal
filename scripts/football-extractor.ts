import fs from "fs";
import path from "path";

const API_KEY = "3"; // TheSportsDB Public Test Key
const BASE_URL = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;
const RAW_DIR = path.join(process.cwd(), "data", "raw_football");

const LEAGUES = [
    { id: "4328", name: "EPL" },
    { id: "4335", name: "LaLiga" },
    { id: "4332", name: "SerieA" },
    { id: "4331", name: "Bundesliga" },
    { id: "4334", name: "Ligue1" }
];

const SEASONS = ["2022-2023", "2023-2024", "2024-2025"];

async function fetchWithRetry(url: string, retries = 5, backoff = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 429 || response.status >= 500) {
                    throw { status: response.status };
                }
                throw new Error(`HTTP Error: ${response.status}`);
            }
            return await response.json();
        } catch (error: any) {
            if (i === retries - 1) throw error;
            if (error.status === 429 || error.status >= 500) {
                console.warn(`[I/O Defense] Hit ${error.status}. Retrying in ${backoff}ms...`);
                await new Promise(res => setTimeout(res, backoff));
                backoff *= 2;
            } else {
                throw error;
            }
        }
    }
}

async function main() {
    console.log("[Extractor] Starting Real Data Ingestion (3,000+ matches)...");
    if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true });

    const startTime = Date.now();
    const tasks = [];

    for (const league of LEAGUES) {
        for (const season of SEASONS) {
            tasks.push({ league, season });
        }
    }

    // Manual Concurrency Control (Max 5)
    for (let i = 0; i < tasks.length; i += 5) {
        const batch = tasks.slice(i, i + 5);
        await Promise.all(batch.map(async (task) => {
            const fileName = `${task.league.name}_${task.season}.json`;
            const filePath = path.join(RAW_DIR, fileName);

            if (fs.existsSync(filePath)) {
                console.log(`[Checkpoint] Skipping ${fileName}`);
                return;
            }

            console.log(`[Fetch] Ingesting ${task.league.name} ${task.season}...`);
            const url = `${BASE_URL}/eventsseason.php?id=${task.league.id}&s=${task.season}`;

            try {
                const data = await fetchWithRetry(url);
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                console.log(`[Dump] Saved ${fileName}`);
            } catch (err) {
                console.error(`[Error] Failed ${fileName}:`, err);
            }
        }));
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n[Extractor] SUCCESS: Data Pivot Complete in ${duration.toFixed(2)}s`);
    console.log(`[Extractor] Total Raw Files: ${fs.readdirSync(RAW_DIR).length}`);
}

main().catch(console.error);
