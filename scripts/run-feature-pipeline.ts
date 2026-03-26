import { prisma } from "../lib/prisma";
import { computeMatchFeatures } from "../lib/features/computeFeatures";

async function main() {
    console.log("[Pipeline] Starting Spartan Feature Pipeline Runner...");

    const matches = await (prisma as any).match.findMany({
        where: { status: "finished" }
    });

    console.log(`[Pipeline] Processing features for ${matches.length} matches...`);

    let count = 0;
    for (const match of matches) {
        try {
            await computeMatchFeatures(match.id);
            count++;
            if (count % 50 === 0) console.log(`[Pipeline] Processed ${count}/${matches.length}...`);
        } catch (err) {
            console.error(`[Pipeline] Error on match ${match.id}:`, (err as Error).message);
        }
    }

    console.log(`[Pipeline] Spartan Feature Pipeline Complete. Processed ${count} matches.`);
}

main()
    .catch(console.error)
    .finally(() => (prisma as any).$disconnect());
