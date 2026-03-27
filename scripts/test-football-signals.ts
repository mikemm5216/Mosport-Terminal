import { generateFootballSignal } from "../lib/api/football_signal_engine";

async function main() {
    console.log("[Test] Football V7.3 API Signal Layer Verification...");

    const testCases = [
        { id: "M1", p: [0.75, 0.15, 0.10], desc: "Heavy Favorite" },
        { id: "M2", p: [0.20, 0.45, 0.35], desc: "High Draw Risk" },
        { id: "M3", p: [0.30, 0.20, 0.50], desc: "Upset Alert (Away Favor)" },
        { id: "M4", p: [0.33, 0.33, 0.34], desc: "High Entropy (Low Confidence)" }
    ];

    testCases.forEach(tc => {
        const out = generateFootballSignal(tc.id, tc.p[0], tc.p[1], tc.p[2]);
        console.log(`\n--- Case: ${tc.desc} ---`);
        console.log(JSON.stringify(out, null, 2));
    });
}

main().catch(console.error);
