import { prisma } from "../lib/prisma";

async function main() {
    console.log("[SQL] Patching MatchStatsNBA columns...");
    try {
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "quant_internal"."MatchStatsNBA" 
            ADD COLUMN IF NOT EXISTS "homeReb" INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "homeAst" INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "awayReb" INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "awayAst" INTEGER DEFAULT 0;
        `);
        console.log("[SQL] Patch applied successfully.");
    } catch (err) {
        console.error("[SQL] Patch failed:", err);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
