import { simulateFlat, simulateWeighted, simulateKelly, SimulationStep } from "../lib/simulation/sandbox_kernel";
import { calculateRobustness } from "../lib/simulation/metrics";

/**
 * STRATEGY SANDBOX RUNNER (V12.0)
 * Cross-Sport Robustness Verification
 */

async function runSandbox() {
    console.log("[Sandbox] Starting V12.0 Strategy Robustness Check...");

    // Mock Historical Data (Simulated across Football, Baseball, NBA)
    const mockHistory: SimulationStep[] = [
        { win: true, odds: 1.95, edge: 0.08, confidence: 0.72 },
        { win: false, odds: 2.10, edge: 0.05, confidence: 0.55 },
        { win: true, odds: 1.80, edge: 0.12, confidence: 0.85 },
        { win: true, odds: 3.50, edge: 0.04, confidence: 0.45 },
        { win: false, odds: 1.90, edge: 0.07, confidence: 0.68 },
        { win: true, odds: 2.05, edge: 0.09, confidence: 0.75 },
        { win: false, odds: 2.20, edge: 0.03, confidence: 0.40 },
        { win: true, odds: 1.75, edge: 0.15, confidence: 0.90 }
    ];

    const results = [
        simulateFlat(mockHistory),
        simulateWeighted(mockHistory),
        simulateKelly(mockHistory)
    ];

    const strategyComparisons = results.map(r => {
        const metrics = calculateRobustness(r.equityCurve);
        return {
            strategy: r.strategyName,
            performance: {
                netProfit: r.netProfit,
                roi: r.roi,
                mdd: metrics.mdd,
                sharpe: metrics.sharpe,
                volatility: metrics.volatility
            },
            status: metrics.qualityScore
        };
    });

    // FINAL OUTPUT (Simulated Performance Only)
    const finalReport = {
        timestamp: new Date().toISOString(),
        experimentId: "SANDBOX-V12-001",
        description: "Simulated Robustness Test across Multi-Sport Historicals",
        strategyComparisons,
        signalRobustness: strategyComparisons.every(s => s.status !== "FRAGILE") ? "HIGH_ROBUSTNESS" : "MODERATE"
    };

    console.log(JSON.stringify(finalReport, null, 2));
}

runSandbox().catch(console.error);
