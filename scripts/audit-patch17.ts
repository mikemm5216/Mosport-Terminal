import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    console.log("--- 1. API PAYLOAD INTERCEPT (/api/signals) ---");
    try {
        const res = await fetch('http://localhost:3001/api/signals');
        const data = await res.json();
        const firstTwo = data.matches ? data.matches.slice(0, 2) : [];

        firstTwo.forEach((m: any) => {
            if (!m.home_team?.logo_url) m.home_team = { ...m.home_team, logo_url: "ERROR: Missing Image Tag" };
            if (!m.away_team?.logo_url) m.away_team = { ...m.away_team, logo_url: "ERROR: Missing Image Tag" };
        });
        console.log(JSON.stringify(firstTwo, null, 2));

        console.log("\n--- 3. KEY PLAYER PHYSICAL MODULE CHECK ---");
        const mlbMatch = data.matches?.find((m: any) => m.sport === 'baseball');
        const nbaMatch = data.matches?.find((m: any) => m.sport === 'basketball');

        const checkPlayer = (match: any, sport: string) => {
            if (!match || !match.home_key_player) {
                return `\n[${sport}] ERROR: Missing Schema`;
            }
            const kp = match.home_key_player;
            if (kp.player_image_url || match.player_image_url) {
                return `\n[${sport}] ERROR: Unauthorized Asset Detcted`;
            }
            return `\n[${sport}] Key Player:\n${JSON.stringify(kp, null, 2)}`;
        };

        console.log(checkPlayer(mlbMatch, "MLB"));
        console.log(checkPlayer(nbaMatch, "NBA"));

    } catch (e) {
        console.log("API Fetch Failed:", e);
    }

    console.log("\n--- 2. DATABASE INTEGRITY CHECK (Prisma) ---");
    try {
        const teams = await (prisma as any).team.findMany({
            where: { short_name: { in: ['DOD', 'LAD', 'CRY', 'WHU'] } }
        });
        if (!teams || teams.length === 0) {
            console.log('"ERROR: Missing Schema"');
        } else {
            console.log(JSON.stringify(teams, null, 2));
        }
    } catch (e) {
        try {
            const teams2 = await (prisma as any).teams.findMany({
                where: { short_name: { in: ['DOD', 'LAD', 'CRY', 'WHU'] } }
            });
            if (!teams2 || teams2.length === 0) {
                console.log('"ERROR: Missing Schema"');
            } else {
                console.log(JSON.stringify(teams2, null, 2));
            }
        } catch (e2) {
            console.log('"ERROR: Missing Schema"');
        }
    }
}

run().catch(console.error).finally(() => prisma.$disconnect());
