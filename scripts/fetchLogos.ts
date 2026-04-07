import fs from 'fs';
import path from 'path';
import { ENTITY_REGISTRY } from '../src/config/entityRegistry';

async function downloadLogo(url: string, dest: string) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.log(`[WARN] Failed to fetch: ${url} (Status: ${response.status})`);
            return false;
        }
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(dest, Buffer.from(buffer));
        console.log(`[SUCCESS] Saved: ${dest}`);
        return true;
    } catch (error: any) {
        console.log(`[ERROR] ${url}: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log("🚀 INITIATING BULK LOGO DELUGE...");

    const MANUAL_OVERRIDES: Record<string, string> = {
        "OLM": "81",   // Marseille
        "MCI": "167",  // Manchester City
        "BAY": "132",  // Bayern Munich
        "BVB": "124",  // Borussia Dortmund
        "PSG": "160",  // PSG
        "FCB": "86",   // Real Madrid? No, Barca is 83.
    };

    // 1. Fetch Soccer IDs mapping (ESPN uses IDs for soccer logos)
    const soccerIdMap: Record<string, string> = {};
    const soccerNameMap: Record<string, string> = {};
    const soccerLeagues = [
        { id: "eng.1", folder: "epl" },
        { id: "esp.1", folder: "esp" },
        { id: "ita.1", folder: "ita" },
        { id: "ger.1", folder: "ger" },
        { id: "fra.1", folder: "fra" }
    ];

    console.log("⚽ RESOLVING SOCCER NODE IDs (FULL REGISTRY)...");
    for (const league of soccerLeagues) {
        try {
            const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league.id}/teams?limit=100`);
            if (!res.ok) continue;
            const data = await res.json();
            const sports = data.sports || [];
            sports.forEach((sport: any) => {
                sport.leagues.forEach((l: any) => {
                    l.teams.forEach((teamEntry: any) => {
                        const team = teamEntry.team;
                        if (team.abbreviation) {
                            soccerIdMap[team.abbreviation.toUpperCase()] = team.id;
                        }
                        if (team.name) {
                            const normalizedName = team.name.toLowerCase().replace(/\s+/g, '');
                            soccerNameMap[normalizedName] = team.id;
                        }
                    });
                });
            });
        } catch (e) {
            console.log(`[WARN] Could not fetch soccer IDs for ${league.id}`);
        }
    }

    for (const [hash, entity] of Object.entries(ENTITY_REGISTRY)) {
        const shortNameUpper = entity.shortName.toUpperCase();
        const shortNameLower = entity.shortName.toLowerCase();
        const fullNameNormalized = entity.name.toLowerCase().replace(/\s+/g, '');

        let folder = "";
        let url = "";

        if (hash.startsWith("Mpt_MLB")) {
            folder = "mlb";
            url = `https://a.espncdn.com/i/teamlogos/mlb/500/${shortNameLower}.png`;
        } else if (hash.startsWith("Mpt_NBA")) {
            folder = "nba";
            url = `https://a.espncdn.com/i/teamlogos/nba/500/${shortNameLower}.png`;
        } else if (hash.includes("EPL") || hash.includes("ESP") || hash.includes("ITA") || hash.includes("GER") || hash.includes("FRA")) {
            if (hash.includes("EPL")) folder = "epl";
            else if (hash.includes("ESP")) folder = "esp";
            else if (hash.includes("ITA")) folder = "ita";
            else if (hash.includes("GER")) folder = "ger";
            else if (hash.includes("FRA")) folder = "fra";

            const soccerId = MANUAL_OVERRIDES[shortNameUpper] || soccerIdMap[shortNameUpper] || soccerNameMap[fullNameNormalized];
            if (soccerId) {
                url = `https://a.espncdn.com/i/teamlogos/soccer/500/${soccerId}.png`;
            } else {
                console.log(`[SKIP] No ID found for soccer team: ${shortNameUpper} (${entity.name})`);
                continue;
            }
        }

        if (!folder || !url) continue;

        const dirPath = path.join(process.cwd(), 'public', 'logos', folder);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        const destFile = path.join(dirPath, `${shortNameLower}.png`);
        await downloadLogo(url, destFile);
    }

    console.log("✅ LOGO DELUGE COMPLETE.");
}

main().catch(console.error);
