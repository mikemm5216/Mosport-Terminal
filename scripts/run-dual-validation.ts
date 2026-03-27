import { execSync } from "child_process";

async function main() {
    console.log("=== NBA DUAL VALIDATION SUITE (PHASE 3.3) ===");

    try {
        console.log("\n--- RUNNING EXPERIMENT A: HISTORICAL STABILITY ---");
        execSync("npx tsx scripts/train-nba.ts A", { stdio: "inherit" });

        console.log("\n--- RUNNING EXPERIMENT B: REAL-WORLD VALIDATION ---");
        execSync("npx tsx scripts/train-nba.ts B", { stdio: "inherit" });

        console.log("\n=== DUAL VALIDATION COMPLETE ===");
    } catch (e) {
        console.error("Validation Suite Failed:", e.message);
    }
}

main();
