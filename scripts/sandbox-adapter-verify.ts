import { generateFootballSignalV11_5 } from "../lib/api/football_signal_engine_v11_5";
import { simulateKelly, SimulationStep } from "../lib/simulation/sandbox_kernel";
import { calculateRobustness } from "../lib/simulation/metrics";

/**
 * PRODUCTION-TO-SANDBOX ADAPTER (V12.0)
 * Piping Real-Time Signals into Robustness Simulation
 */

async function main() {
    // 1. Simulate a Production Signal (EPL Match)
    const prediction = generateFootballSignalV11_5(
        "EPL-MCX-001",
        [0.75, 0.15, 0.10], // Model Probs
        [1.50, 4.20, 7.50], // Market Odds
        new Date(),
        new Date()
    );

    // 2. Map to Sandbox Step (Assuming we know the actual result later)
    // Here we simulate a "Win" for the favorite
    const simStep: SimulationStep = {
        win: true,
        odds: 1.50,
        edge: prediction.edge,
        confidence: prediction.confidence
    };

    // 3. Run Simulation (Capped Kelly)
    const kellyResult = simulateKelly([simStep], 0.02, 100);
    const robustness = calculateRobustness(kellyResult.equityCurve);

    console.log(`[V12.0 Adapter] Signal Processed: ${prediction.matchId}`);
    console.log(`[V12.0 Adapter] Robustness Status: ${robustness.qualityScore}`);
    console.log(JSON.stringify(robustness, null, 2));
}

main().catch(console.error);
