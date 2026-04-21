import { prisma } from "../lib/prisma";

async function main() {
    console.log("[Seed] Populating Global Football Teams...");

    const teams = [
        // EPL
        { full_name: "Manchester City", short_name: "MCI", league_type: "FOOTBALL" },
        { full_name: "Arsenal", short_name: "ARS", league_type: "FOOTBALL" },
        { full_name: "Liverpool", short_name: "LIV", league_type: "FOOTBALL" },
        { full_name: "Manchester United", short_name: "MUN", league_type: "FOOTBALL" },
        { full_name: "Chelsea", short_name: "CHE", league_type: "FOOTBALL" },
        // La Liga
        { full_name: "Real Madrid", short_name: "RMA", league_type: "FOOTBALL" },
        { full_name: "Barcelona", short_name: "FCB", league_type: "FOOTBALL" },
        { full_name: "Atletico Madrid", short_name: "ATM", league_type: "FOOTBALL" },
        // World Cup
        { full_name: "Argentina", short_name: "ARG", league_type: "FOOTBALL" },
        { full_name: "France", short_name: "FRA", league_type: "FOOTBALL" },
        { full_name: "Brazil", short_name: "BRA", league_type: "FOOTBALL" },
        { full_name: "Germany", short_name: "GER", league_type: "FOOTBALL" },
        { full_name: "England", short_name: "ENG", league_type: "FOOTBALL" },
        { full_name: "Spain", short_name: "ESP", league_type: "FOOTBALL" },
        { full_name: "Japan", short_name: "JPN", league_type: "FOOTBALL" },
        { full_name: "South Korea", short_name: "KOR", league_type: "FOOTBALL" },
        { full_name: "Portugal", short_name: "POR", league_type: "FOOTBALL" },
        { full_name: "Netherlands", short_name: "NED", league_type: "FOOTBALL" },
        { full_name: "Italy", short_name: "ITA", league_type: "FOOTBALL" },
        { full_name: "Belgium", short_name: "BEL", league_type: "FOOTBALL" }
    ];

    for (const t of teams) {
        await (prisma as any).teams.upsert({
            where: { full_name: t.full_name },
            update: t,
            create: t
        });
    }

    console.log(`[Seed] Seeded ${teams.length} football teams.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
