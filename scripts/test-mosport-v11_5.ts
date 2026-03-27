import { generateFootballSignalV11_5 } from "../lib/api/football_signal_engine_v11_5";

async function main() {
    console.log("[Test] Mosport V11.5 Market Sovereignty Verification...");

    const testCases = [
        {
            desc: "The Golden Alpha (EPL Elite Favorite - Zero Entropy)",
            match: "EPL-LIV-001",
            p: [0.96, 0.02, 0.02] as [number, number, number], // Extreme certainty
            odds: [1.20, 10.0, 20.0] as [number, number, number],
            updated: new Date()
        },
        {
            desc: "Statistical Trap (High EV but NO Signal)",
            match: "EPL-TRP-002",
            p: [0.34, 0.33, 0.33] as [number, number, number],
            odds: [4.5, 3.5, 3.5] as [number, number, number], // High odds for home win, but model has no confidence
            updated: new Date()
        },
        {
            desc: "Stale Odds Demo",
            match: "EPL-STL-003",
            p: [0.60, 0.20, 0.20] as [number, number, number],
            odds: [1.8, 3.8, 4.5] as [number, number, number],
            updated: new Date(Date.now() - 7200000) // 2 Hours ago
        }
    ];

    testCases.forEach(tc => {
        const out = generateFootballSignalV11_5(tc.match, tc.p, tc.odds, tc.updated, new Date());
        console.log(`\n--- Case: ${tc.desc} ---`);
        console.log(JSON.stringify(out, null, 2));
    });
}

main().catch(console.error);
