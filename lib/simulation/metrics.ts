/**
 * SIMULATION METRICS (V12.0)
 * ROI, MDD, Sharpe, Volatility
 */

export interface RobustnessMetrics {
    roi: number;
    mdd: number;
    sharpe: number;
    volatility: number;
    qualityScore: "HIGH_ROBUSTNESS" | "MODERATE" | "FRAGILE";
}

export function calculateRobustness(equityCurve: number[]): RobustnessMetrics {
    // 1. MDD (Max Drawdown)
    let maxDrawdown = 0;
    let peak = equityCurve[0];
    equityCurve.forEach(v => {
        if (v > peak) peak = v;
        const dd = peak - v;
        if (dd > maxDrawdown) maxDrawdown = dd;
    });

    // 2. Returns (Daily/Step-wise)
    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
        returns.push(equityCurve[i] - equityCurve[i - 1]);
    }

    // 3. Volatility (StDev of returns)
    const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);

    // 4. Sharpe Ratio (Return over StDev, 0 risk-free rate)
    const sharpe = volatility > 0 ? (avg / volatility) * Math.sqrt(stepsPerYearPlaceholder(returns.length)) : 0;

    const roi = equityCurve[equityCurve.length - 1]; // Net units

    // 5. Quality Score
    let qualityScore: "HIGH_ROBUSTNESS" | "MODERATE" | "FRAGILE" = "MODERATE";
    if (roi > 0 && maxDrawdown < 10 && sharpe > 1.5) {
        qualityScore = "HIGH_ROBUSTNESS";
    } else if (roi < 0 || maxDrawdown > 25) {
        qualityScore = "FRAGILE";
    }

    return {
        roi: Number(roi.toFixed(4)),
        mdd: Number(maxDrawdown.toFixed(4)),
        sharpe: Number(sharpe.toFixed(4)),
        volatility: Number(volatility.toFixed(4)),
        qualityScore
    };
}

function stepsPerYearPlaceholder(n: number): number {
    // Arbitrary scaling to make Sharpe meaningful
    return 365;
}
