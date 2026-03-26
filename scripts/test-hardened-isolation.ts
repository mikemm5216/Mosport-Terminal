import fs from "fs";
import { sanitize } from "../lib/sanitizer/sanitizePrediction";
import { apiFirewall } from "../middleware/apiFirewall";

async function verifyHardenedIsolation() {
    console.log("[Test] --- HARDENED ISOLATION ASSERTION ---");

    // 1. Verify separate schema files exist
    const quantSchema = fs.readFileSync("prisma/schema.quant.prisma", "utf-8");
    const publicSchema = fs.readFileSync("prisma/schema.public.prisma", "utf-8");

    if (publicSchema.includes("MatchFeatures") || publicSchema.includes("Odds")) {
        console.error("[SECURITY FAILURE] Public schema contains internal models!");
        process.exit(1);
    }
    console.log("✅ Schema File Isolation: PASS");

    // 2. Verify Sanitizer Noise
    const raw = {
        matchId: "m1",
        homeWinProb: 0.60,
        awayWinProb: 0.40,
        edge: 0.10
    };
    const s1 = sanitize(raw);
    const s2 = sanitize(raw);

    if (s1.homeWinProb === s2.homeWinProb && s1.signalScore === s2.signalScore) {
        console.error("[SECURITY FAILURE] Sanitizer output is deterministic (no noise)!");
        process.exit(1);
    }
    console.log("✅ Anti-Reverse Engineering Noise: PASS");

    // 3. Verify Firewall
    try {
        apiFirewall({ secret: "edge_leak", edge: 0.1 });
        console.error("[SECURITY FAILURE] Firewall failed to block 'edge'");
        process.exit(1);
    } catch (e: any) {
        console.log("✅ API Firewall Protection: PASS (" + e.message + ")");
    }

    console.log("\n[VERIFICATION COMPLETE] Architecture is HARDENED.");
}

verifyHardenedIsolation().catch(console.error);
